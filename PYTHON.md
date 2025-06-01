# Python Courts-DB Implementation Analysis

This document provides a comprehensive line-by-line analysis of how the Python courts-db implementation works, which serves as the canonical reference for the TypeScript port.

## Overview

The Python courts-db library provides court identification functionality using regex pattern matching. It consists of three main files:

1. `__init__.py` - Main API and entry points
2. `utils.py` - Core data loading and processing utilities  
3. `text_utils.py` - Text processing utilities

## File-by-File Analysis

### `text_utils.py` (14 lines)

This is the simplest file, providing basic text processing utilities:

```python
import re
from string import punctuation

reg_punc = re.compile(f"[{re.escape(punctuation)}]")
combined_whitespace = re.compile(r"\s{2,}")

def strip_punc(court_str: str) -> str:
    """Remove whitespace from court_str.
    :param: court_str: The court string
    :return: The court string without extra whitespace
    """
    return combined_whitespace.sub(" ", court_str).strip()
```

**Key Points:**
- Creates two compiled regex patterns: one for punctuation, one for multiple whitespace
- `strip_punc()` only removes extra whitespace (not punctuation despite the name)
- Uses Python's built-in `re` module with standard regex compilation

### `utils.py` (211 lines)

This file contains the core data loading and regex compilation logic.

#### Constants and Setup (lines 1-92)

```python
import json
import os
import re
from glob import iglob
from string import Template

db_root = os.path.dirname(os.path.realpath(__file__))

ordinals = [
    "first", "second", "third", ... "one[- ]hundredth"
]
```

**Key Points:**
- Uses `string.Template` for variable substitution (critical for regex templating)
- Defines extensive ordinals list for judicial district number handling
- `db_root` points to the package directory containing data files

#### `make_court_dictionary()` (lines 96-100)

```python
def make_court_dictionary(courts):
    cd = {}
    for court in courts:
        cd[court["id"]] = court
    return cd
```

**Key Points:**
- Simple mapping from court ID to court object
- Used for fast lookups by court ID

#### `load_courts_db()` (lines 103-171)

This is the most critical function for understanding how data loading works:

```python
def load_courts_db():
    """Load the court data from disk, and render regex variables"""
    
    # 1. Load base variables
    with open(os.path.join(db_root, "data", "variables.json"), encoding="utf-8") as v:
        variables = json.load(v)

    # 2. Load place files and add to variables
    for path in iglob(os.path.join(db_root, "data", "places", "*.txt")):
        with open(path, encoding="utf-8") as p:
            places = f"({'|'.join(p.read().splitlines())})"
            variables[path.split(os.path.sep)[-1].split(".txt")[0]] = places

    # 3. Handle ordinal ranges in courts.json
    with open(os.path.join(db_root, "data", "courts.json"), encoding="utf-8") as f:
        temp = f.read()
        ord_arrays = re.findall(r"\${(\d+)-(\d+)}", temp)
        for ord in ord_arrays:
            re_ord = f"(({')|('.join(ordinals[int(ord[0]) - 1 : int(ord[1])])}))"
            temp = temp.replace(f"${{{ord[0]}-{ord[1]}}}", re_ord)

    # 4. Substitute variables using Template
    s = Template(temp).substitute(**variables)
    s = s.replace("\\", "\\\\")
    data = json.loads(s)

    # 5. Handle parent court inheritance
    for k in data:
        if "parent" in k and not {"dates", "type", "location"} <= set(k.keys()):
            parent = [x for x in data if x["id"] == k["parent"]][0]
            if "dates" not in k:
                k["dates"] = parent["dates"]
            if "type" not in k:
                k["type"] = parent["type"]
            if "location" not in k:
                k["location"] = parent["location"]

    return data
```

**Critical Understanding:**
1. **Variable System**: Loads `variables.json` containing regex components like `${md}`, `${wd}`, etc.
2. **Place Files**: Reads `.txt` files from `places/` directory, converts lines to regex alternations `(line1|line2|line3)`
3. **Ordinal Expansion**: Finds patterns like `${1-41}` and replaces with ordinal ranges from the predefined list
4. **Template Substitution**: Uses Python's `string.Template` to substitute `${variable}` patterns
5. **Backslash Handling**: Doubles backslashes for JSON parsing
6. **Inheritance**: Child courts inherit missing properties from parent courts

#### `gather_regexes()` (lines 174-211)

```python
def gather_regexes(courts):
    """Create a variable mapping regexes to court IDs"""
    regexes = []
    for court in courts:
        court_regexes = court["regex"] + [court["name"]]
        for reg_str in court_regexes:
            # Unwind the extra gruff in regexes
            reg_str = reg_str.replace("\\\\", "\\")
            regex = re.compile(reg_str, (re.I | re.U))
            regexes.append((
                regex,
                court["id"],
                court["name"],
                court["type"],
                court.get("location"),
                court.get("parent"),
            ))
    return regexes
```

**Key Points:**
- Combines court's explicit regex patterns with court name as additional pattern
- Undoes double-backslash escaping before compilation
- Compiles with `re.I | re.U` flags (case-insensitive and Unicode)
- Returns tuples of `(compiled_regex, court_id, court_name, court_type, location, parent)`

### `__init__.py` (255 lines)

This file provides the main API and implements the court matching logic.

#### Lazy Loading Setup (lines 1-35)

```python
import re
from datetime import datetime
from typing import Optional
from courts_db.text_utils import strip_punc
from .utils import gather_regexes, load_courts_db, make_court_dictionary

__all__ = [
    "courts", "court_dict", "regexes",
    "find_court_ids_by_name", "filter_courts_by_date", 
    "filter_courts_by_bankruptcy", "find_court_by_id", "find_court"
]

def __getattr__(name):
    """Lazy load data structures from loaders module."""
    if name == "courts":
        value = load_courts_db()
    elif name == "court_dict":
        from . import courts
        value = make_court_dictionary(courts)
    elif name == "regexes":
        from . import courts
        value = gather_regexes(courts)
    else:
        raise AttributeError(f"module {__name__} has no attribute {name}")
    globals()[name] = value
    return value
```

**Key Points:**
- Uses Python's `__getattr__` for lazy loading of expensive data structures
- Data is only loaded when first accessed
- Subsequent accesses use cached values in `globals()`

#### `find_court_ids_by_name()` (lines 38-90)

This is the core matching function:

```python
def find_court_ids_by_name(
    court_str: str,
    bankruptcy: Optional[bool],
    location: Optional[str], 
    allow_partial_matches: bool,
) -> list[str]:
    """Find court IDs with our courts-db regex list"""
    from . import regexes

    assert isinstance(court_str, str), (
        f"court_str is not a text type, it's of type {type(court_str)}"
    )

    court_matches = set()
    matches = []
    
    # 1. Try regex matching
    for (regex, court_id, _court_name, court_type, court_location, parent_court) in regexes:
        # Location filtering
        if location and court_location != location:
            continue
            
        # Bankruptcy filtering  
        if bankruptcy is True:
            if court_type != "bankruptcy":
                continue
        elif bankruptcy is False and court_type == "bankruptcy":
            continue
            
        # Regex matching
        match = re.search(regex, court_str)
        if match:
            # Partial match filtering
            if (not allow_partial_matches and 
                len(court_str) != match.span()[1] - match.span()[0]):
                continue
            m = (match.group(0), court_id, parent_court)
            matches.append(m)

    # 2. Fallback to exact name matching if no regex matches
    if not matches:
        for court in courts:
            if location and court_location != location:
                continue
            if strip_punc(court_str.lower()) == strip_punc(court["name"].lower()):
                matches.append((court_str, court["id"], court.get("parent")))

    # 3. Process matches
    matches = list(set(matches))
    if len(matches) > 1:
        matches = reduce_court_list(matches)

    # 4. Extract court IDs, filtering out substring matches
    matched_strings = [m[0] for m in matches]
    filtered_list = filter(
        lambda x: [x for i in matched_strings if x in i and x != i] == [],
        matched_strings,
    )
    for item in list(filtered_list):
        for mat in matches:
            if item == mat[0]:
                court_matches.add(mat[1])
    return list(court_matches)
```

**Critical Logic:**
1. **Regex Iteration**: Loops through all compiled regexes from `gather_regexes()`
2. **Location Filtering**: Exact match on court location if provided
3. **Bankruptcy Filtering**: Filters by court type
4. **Regex Matching**: Uses `re.search()` to find matches
5. **Partial Match Control**: Checks if match spans entire input string
6. **Fallback**: If no regex matches, tries exact name matching with punctuation stripped
7. **Deduplication**: Removes duplicate matches
8. **Parent Reduction**: Removes parent courts if child courts match
9. **Substring Filtering**: Removes matches that are substrings of other matches

#### `reduce_court_list()` (lines 93-102)

```python
def reduce_court_list(court_list):
    """Reduce to lowest possible match"""
    parent_ids = {parent_id for _, _, parent_id in court_list}
    reduced_list = []
    for court in court_list:
        court_id = court[1]
        if court_id not in parent_ids:
            reduced_list.append(court)
    return reduced_list
```

**Key Points:**
- Removes parent courts when child courts are also matched
- Ensures most specific court is returned

#### Additional Filter Functions (lines 105-175)

- `filter_courts_by_date()`: Filters by date ranges with optional strict mode
- `filter_courts_by_bankruptcy()`: Filters by bankruptcy type
- `find_court_by_id()`: Simple ID lookup
- `_filter_parents_from_list()`: Another parent filtering implementation

#### `find_court()` Main API (lines 210-255)

```python
def find_court(
    court_str: str,
    bankruptcy: Optional[bool] = None,
    date_found: Optional[datetime] = None,
    strict_dates: Optional[bool] = False,
    location: Optional[str] = None,
    allow_partial_matches: Optional[bool] = False,
) -> list[str]:
    """Finds a list of court ID for a given string and parameters"""
    court_str = strip_punc(court_str)
    matches = find_court_ids_by_name(court_str, bankruptcy, location, allow_partial_matches)

    if bankruptcy is not None:
        matches = filter_courts_by_bankruptcy(matches=matches, bankruptcy=bankruptcy)

    if date_found:
        matches = filter_courts_by_date(matches=matches, date_found=date_found, strict_dates=strict_dates)

    if len(matches) > 1:
        matches = _filter_parents_from_list(matches)

    return matches
```

**Key Points:**
- Main entry point that orchestrates all filtering
- Applies text processing, regex matching, then additional filters
- Final parent reduction step

## Data Structure Analysis

### variables.json Structure
- Contains regex pattern components like `${md}`, `${wd}`, `${usa}`, etc.
- Patterns use Python regex syntax with complex alternations
- State abbreviations with word boundaries: `"al": "Ala(bama)?(\\b|$)"`

### courts.json Structure  
- Array of court objects with fields:
  - `id`: Unique court identifier
  - `name`: Full court name
  - `regex`: Array of regex patterns for matching
  - `type`: Court type (e.g., "bankruptcy", "appellate")
  - `location`: Geographic location
  - `parent`: Parent court ID (for hierarchy)
  - `dates`: Array of date ranges when court was active
  - `examples`: Example strings that should match

### places/*.txt Files
- Plain text files with one entry per line
- Converted to regex alternations: `(entry1|entry2|entry3)`
- Used for geographic name variations

## Key Python Behaviors That Must Be Preserved

1. **Template Substitution**: Uses `string.Template` with `${variable}` syntax
2. **Regex Compilation**: Standard Python `re.compile()` with `re.I | re.U` flags
3. **Unicode Handling**: Full Unicode support via `re.U` flag
4. **Backslash Handling**: Double escaping for JSON, then unescaping for regex
5. **Ordinal Expansion**: Complex logic for judicial district numbers
6. **Parent Inheritance**: Child courts inherit missing properties
7. **Lazy Loading**: Data structures loaded on demand
8. **Match Processing**: Complex logic for partial matches, parent reduction, substring filtering

## Critical Implementation Notes

The TypeScript implementation MUST:

1. Use PCRE regex engine (via @syntropiq/xtrax) to match Python's `re` module behavior
2. Implement the exact same template substitution logic using `${variable}` syntax
3. Handle Unicode normalization consistently with Python
4. Preserve the exact same ordinal expansion logic
5. Implement identical parent-child court hierarchy resolution
6. Use the same multi-stage filtering approach (regex → bankruptcy → date → parent reduction)
7. Handle backslash escaping exactly as Python does
8. Maintain the same lazy loading pattern for performance

The current TypeScript implementation appears to have issues with:
- Improper PCRE regex compilation/usage
- Incorrect variable substitution approach
- Missing or incorrect ordinal handling
- Potential Unicode handling differences
- Parent-child relationship processing
