import unidecode from 'unidecode';
import { stripPunc } from './text-utils.js';
import { 
  loadCourtsDb, 
  makeCourtDictionary, 
  gatherRegexes,
  isBankruptcyCourt,
  matchesLocation,
  isCourtActiveOnDate
} from './utils.js';
import type { 
  Courts, 
  Court, 
  CourtDict, 
  CompiledRegexes, 
  FindCourtOptions,
  FindCourtByDateOptions 
} from './types.js';

// Lazy-loaded data structures
let courts: Courts | null = null;
let courtDict: CourtDict | null = null;
let regexes: CompiledRegexes | null = null;

/**
 * Get courts data (lazy loaded)
 */
function getCourts(): Courts {
  if (courts === null) {
    courts = loadCourtsDb();
  }
  return courts;
}

/**
 * Get court dictionary (lazy loaded)
 */
function getCourtDict(): CourtDict {
  if (courtDict === null) {
    courtDict = makeCourtDictionary(getCourts());
  }
  return courtDict;
}

/**
 * Get compiled regexes (lazy loaded)
 */
async function getRegexes(): Promise<CompiledRegexes> {
  if (regexes === null) {
    regexes = await gatherRegexes(getCourts());
  }
  return regexes;
}

/**
 * Find court IDs with our courts-db regex list
 */
export async function findCourtIdsByName(
  courtStr: string,
  bankruptcy?: boolean | null,
  location?: string | null,
  allowPartialMatches: boolean = false
): Promise<string[]> {
  const compiledRegexes = await getRegexes();
  const allCourts = getCourts();
  const matches: Array<{courtId: string, matchedText: string}> = [];
  
  // Normalize the input string
  const normalizedInput = unidecode(stripPunc(courtStr)).toLowerCase();
  
  for (const court of allCourts) {
    // Filter by bankruptcy if specified
    if (bankruptcy !== null && bankruptcy !== undefined) {
      const isBank = isBankruptcyCourt(court);
      if (bankruptcy !== isBank) {
        continue;
      }
    }
    
    // Filter by location if specified
    if (location && !matchesLocation(court, location)) {
      continue;
    }
    
    // Check if any PCRE regex matches
    const courtRegexes = compiledRegexes[court.id] || [];
    for (const pcreRegex of courtRegexes) {
      const match = pcreRegex.match(normalizedInput);
      if (match && match.matched) {
        matches.push({
          courtId: court.id,
          matchedText: match.fullMatch || normalizedInput
        });
        break; // Found a match for this court, move to next court
      }
    }
  }
  
  // Reduce matches to filter out parent courts when child courts match
  const reducedMatches = await reduceCourtMatches(matches);
  
  // Filter out matches where one matched string is contained within another
  const filteredMatches = filterSubstringMatches(reducedMatches);
  
  return filteredMatches.map(m => m.courtId);
}

/**
 * Filter courts by date
 */
export function filterCourtsByDate(courtIds: string[], date?: Date | null): string[] {
  if (!date) {
    return courtIds;
  }
  
  const dict = getCourtDict();
  return courtIds.filter(courtId => {
    const court = dict[courtId];
    return court && isCourtActiveOnDate(court, date);
  });
}

/**
 * Filter courts by bankruptcy
 */
export function filterCourtsByBankruptcy(courtIds: string[], bankruptcy?: boolean | null): string[] {
  if (bankruptcy === null || bankruptcy === undefined) {
    return courtIds;
  }
  
  const dict = getCourtDict();
  return courtIds.filter(courtId => {
    const court = dict[courtId];
    return court && isBankruptcyCourt(court) === bankruptcy;
  });
}

/**
 * Find court by ID
 */
export function findCourtById(courtId: string): Court[] {
  const dict = getCourtDict();
  const court = dict[courtId];
  return court ? [court] : [];
}

/**
 * Find court with comprehensive filtering
 */
export async function findCourt(
  courtStr: string,
  options: FindCourtByDateOptions = {}
): Promise<string[]> {
  const { 
    bankruptcy = null, 
    location = null, 
    allowPartialMatches = false,
    date = null 
  } = options;
  
  // First find by name with basic filters
  let matches = await findCourtIdsByName(courtStr, bankruptcy, location, allowPartialMatches);
  
  // Then filter by date if provided
  if (date) {
    matches = filterCourtsByDate(matches, date);
  }
  
  return matches;
}

/**
 * Reduce matches to filter out parent courts when child courts match
 */
async function reduceCourtMatches(matches: Array<{courtId: string, matchedText: string}>): Promise<Array<{courtId: string, matchedText: string}>> {
  if (matches.length <= 1) {
    return matches;
  }
  
  const dict = getCourtDict();
  const parentIds = new Set<string>();
  
  // Collect all parent IDs from the matching courts
  for (const match of matches) {
    const court = dict[match.courtId];
    if (court?.parent) {
      parentIds.add(court.parent);
    }
  }
  
  // Filter out court IDs that are parents of other matching courts
  const reducedList = matches.filter(match => !parentIds.has(match.courtId));
  
  return reducedList.length > 0 ? reducedList : matches;
}

/**
 * Filter out matches where one matched string is contained within another
 */
function filterSubstringMatches(matches: Array<{courtId: string, matchedText: string}>): Array<{courtId: string, matchedText: string}> {
  if (matches.length <= 1) {
    return matches;
  }
  
  const matchedStrings = matches.map(m => m.matchedText);
  
  // Filter out any matched string that is a substring of another matched string
  const filteredStrings = matchedStrings.filter(str => {
    // Check if this string is a substring of any other string
    const isSubstring = matchedStrings.some(otherStr => 
      otherStr !== str && otherStr.includes(str)
    );
    return !isSubstring;
  });
  
  // Return matches that correspond to the filtered strings
  return matches.filter(match => filteredStrings.includes(match.matchedText));
}

/**
 * Reduce to lowest possible match - filter out parent courts when child courts match
 * @deprecated Use reduceCourtMatches instead
 */
function reduceCourtList(courtIds: string[]): string[] {
  if (courtIds.length <= 1) {
    return courtIds;
  }
  
  const dict = getCourtDict();
  const parentIds = new Set<string>();
  
  // Collect all parent IDs from the matching courts
  for (const courtId of courtIds) {
    const court = dict[courtId];
    if (court?.parent) {
      parentIds.add(court.parent);
    }
  }
  
  // Filter out court IDs that are parents of other matching courts
  const reducedList = courtIds.filter(courtId => !parentIds.has(courtId));
  
  return reducedList.length > 0 ? reducedList : courtIds;
}

// Export data accessors for compatibility
export { getCourts as courts };
export { getCourtDict as courtDict };
export { getRegexes as regexes };

// Export all types
export * from './types.js';
export * from './text-utils.js';
export * from './utils.js';
