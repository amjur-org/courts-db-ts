# Courts-DB TypeScript Port Development Plan

## Project Overview

This project aims to create a TypeScript package `@amjur/courts-db-ts` that provides identical functionality to the Python `courts-db` package. The TypeScript version must pass all the same tests and provide the same API interfaces while leveraging PCRE regex processing through `@syntropiq/libpcre`.

## Current Python Package Analysis

### Core Functionality
- **Database**: 69,683+ lines of JSON data containing court information
- **Regex Processing**: Complex regex patterns with template substitution
- **Court Matching**: String-based court identification with fuzzy matching
- **Filtering**: Date-based, bankruptcy, and location filtering
- **Data Structure**: JSON with variables and place templates

### Key Features to Port
1. **find_court()** - Main search function with multiple filters
2. **find_court_by_id()** - Direct ID lookup
3. **find_court_ids_by_name()** - Core matching logic
4. **filter_courts_by_date()** - Date range filtering
5. **filter_courts_by_bankruptcy()** - Bankruptcy court filtering
6. **Lazy loading** - Data structures loaded on demand
7. **Template system** - Variable substitution in regex patterns
8. **Parent/child court relationships** - Hierarchical court structures

### Test Coverage
- 12 test suites covering 2000+ court examples
- Bankruptcy court filtering
- Date-based filtering
- Unicode handling
- Parent court relationships
- JSON structure validation
- Lazy loading functionality

## Development Roadmap

### Phase 1: Project Setup (Week 1)
- [ ] Initialize TypeScript project structure
- [ ] Configure build system (tsup/rollup)
- [ ] Set up testing framework (Vitest)
- [ ] Configure package.json for npm publishing
- [ ] Set up CI/CD pipeline
- [ ] Install and configure `@syntropiq/libpcre`

### Phase 2: Data Infrastructure (Week 1-2)
- [ ] Port JSON data files to TypeScript-compatible format
- [ ] Implement template variable system
- [ ] Create data loading utilities
- [ ] Implement lazy loading mechanism
- [ ] Port ordinals and place name processing
- [ ] Create TypeScript interfaces for court data structures

### Phase 3: Core Regex Engine (Week 2-3)
- [ ] Integrate `@syntropiq/libpcre` for PCRE compatibility
- [ ] Port regex compilation and caching
- [ ] Implement template substitution system
- [ ] Create regex pattern matching utilities
- [ ] Test regex compatibility with Python version

### Phase 4: Search Functions (Week 3-4)
- [ ] Port `find_court_ids_by_name()` function
- [ ] Implement partial matching logic
- [ ] Port parent/child court filtering
- [ ] Create string normalization utilities (`strip_punc`)
- [ ] Implement court list reduction logic

### Phase 5: Filtering Systems (Week 4)
- [ ] Port date filtering with datetime handling
- [ ] Implement bankruptcy court filtering
- [ ] Add location-based filtering
- [ ] Create strict vs. non-strict date modes
- [ ] Port parent court removal logic

### Phase 6: Main API Functions (Week 5)
- [ ] Implement `find_court()` main function
- [ ] Port `find_court_by_id()` lookup
- [ ] Create court dictionary utilities
- [ ] Implement all public API methods
- [ ] Add proper error handling and validation

### Phase 7: Testing Infrastructure (Week 5-6)
- [ ] Port all Python test cases to TypeScript/Vitest
- [ ] Create test data validation
- [ ] Implement court example testing (2000+ examples)
- [ ] Add performance benchmarks
- [ ] Test Unicode handling
- [ ] Validate lazy loading behavior

### Phase 8: Documentation & Publishing (Week 6)
- [ ] Create comprehensive API documentation
- [ ] Write usage examples and guides
- [ ] Set up npm publishing pipeline
- [ ] Create README with TypeScript examples
- [ ] Add JSDoc comments for all public APIs

### Phase 9: Quality Assurance (Week 7)
- [ ] Cross-validate all outputs with Python version
- [ ] Performance optimization
- [ ] Memory usage optimization
- [ ] Bundle size optimization
- [ ] Browser compatibility testing

### Phase 10: Release Preparation (Week 7-8)
- [ ] Final testing and validation
- [ ] Semantic versioning setup
- [ ] Changelog preparation
- [ ] Release candidate testing
- [ ] Production release to npm as `@amjur/courts-db-ts`

## Technical Architecture

### Dependencies
- **Runtime**: `@syntropiq/libpcre` for PCRE regex support
- **Build**: TypeScript, tsup/rollup for bundling
- **Testing**: Vitest for testing framework
- **Development**: ESLint, Prettier for code quality

### File Structure
```
src/
├── index.ts              # Main exports
├── types.ts              # TypeScript interfaces
├── utils.ts              # Utility functions
├── text-utils.ts         # String processing
├── data-loader.ts        # Lazy loading system
├── regex-engine.ts       # PCRE regex processing
├── court-finder.ts       # Core search logic
├── filters.ts            # Date/bankruptcy filtering
└── data/
    ├── courts.json       # Court database
    ├── variables.json    # Template variables
    └── places/           # Place name files
```

### API Compatibility
The TypeScript package will provide 100% API compatibility:
```typescript
// Main functions
export function findCourt(courtStr: string, options?: FindCourtOptions): string[];
export function findCourtById(courtId: string): Court[];
export function findCourtIdsByName(courtStr: string, options?: SearchOptions): string[];

// Filtering functions
export function filterCourtsByDate(matches: string[], date: Date, strictDates?: boolean): string[];
export function filterCourtsByBankruptcy(matches: string[], bankruptcy: boolean): string[];

// Data structures (lazy-loaded)
export const courts: Court[];
export const courtDict: Record<string, Court>;
export const regexes: CompiledRegex[];
```

## Risk Mitigation

### High-Risk Areas
1. **PCRE Compatibility**: Ensure `@syntropiq/libpcre` provides exact Python regex behavior
2. **Template System**: Complex variable substitution must work identically
3. **Unicode Handling**: Proper handling of international characters
4. **Performance**: Large dataset processing efficiency
5. **Date Parsing**: Cross-platform date handling consistency

### Testing Strategy
- **Unit Tests**: Cover all individual functions
- **Integration Tests**: Full workflow testing
- **Regression Tests**: Compare outputs with Python version
- **Performance Tests**: Benchmark against Python implementation
- **Cross-validation**: Automated comparison of all 2000+ test cases

## Success Criteria

1. ✅ All 12 Python test suites pass in TypeScript
2. ✅ 100% API compatibility maintained
3. ✅ Performance within 10% of Python version
4. ✅ Bundle size under 500KB
5. ✅ Zero breaking changes from Python API
6. ✅ Published successfully to npm as `@amjur/courts-db-ts`
7. ✅ Comprehensive documentation and examples

## Timeline

**Total Estimated Duration**: 7-8 weeks
**Target Completion**: 8 weeks from start date
**Milestone Reviews**: Weekly progress reviews
**Release Target**: Week 8

## Resources Required

- 1 Senior TypeScript Developer
- Access to `@syntropiq/libpcre` package
- CI/CD infrastructure for automated testing
- npm publishing access for `@amjur` organization
- Code review and validation resources

---

*This development plan ensures a systematic approach to creating a production-ready TypeScript port that maintains complete compatibility with the existing Python courts-db package while leveraging modern TypeScript tooling and the PCRE regex engine.*
