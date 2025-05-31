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
function getRegexes(): CompiledRegexes {
  if (regexes === null) {
    regexes = gatherRegexes(getCourts());
  }
  return regexes;
}

/**
 * Find court IDs with our courts-db regex list
 */
export function findCourtIdsByName(
  courtStr: string,
  bankruptcy?: boolean | null,
  location?: string | null,
  allowPartialMatches: boolean = false
): string[] {
  const compiledRegexes = getRegexes();
  const allCourts = getCourts();
  const matches: string[] = [];
  
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
    
    // Check if any regex matches
    const courtRegexes = compiledRegexes[court.id] || [];
    for (const regex of courtRegexes) {
      if (regex.test(normalizedInput)) {
        matches.push(court.id);
        break; // Found a match for this court, move to next court
      }
    }
  }
  
  return matches;
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
export function findCourt(
  courtStr: string,
  options: FindCourtByDateOptions = {}
): string[] {
  const { 
    bankruptcy = null, 
    location = null, 
    allowPartialMatches = false,
    date = null 
  } = options;
  
  // First find by name with basic filters
  let matches = findCourtIdsByName(courtStr, bankruptcy, location, allowPartialMatches);
  
  // Then filter by date if provided
  if (date) {
    matches = filterCourtsByDate(matches, date);
  }
  
  return matches;
}

// Export data accessors for compatibility
export { getCourts as courts };
export { getCourtDict as courtDict };
export { getRegexes as regexes };

// Export all types
export * from './types.js';
export * from './text-utils.js';
export * from './utils.js';
