import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import unidecode from 'unidecode';
import { PCREUtils } from '@syntropiq/xtrax';
import { processVariables as xtraxProcessVariables, recursiveSubstitute } from '@syntropiq/xtrax/template-engine';
import { stripPunc } from './text-utils.js';

const {
  escapeRegex,
  substituteEdition,
  substituteEditions,
  getPCREPatternFromData,
  convertNamedGroups
} = PCREUtils;
import { compileRegex } from '@syntropiq/xtrax/pcre-utils';
import type { 
  Courts, 
  Court, 
  CourtDict, 
  CompiledRegexes, 
  RegexVariables 
} from './types.js';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const dbRoot = join(__dirname, '../courts_db');

// Re-export the imported functions for use by index.ts
export { 
  escapeRegex, 
  substituteEdition, 
  substituteEditions, 
  getPCREPatternFromData,
  convertNamedGroups
};

// Ordinals for court processing
export const ordinals = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'nineth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
  'twentieth',
];

/**
 * Parse datetime strings in JSON data
 */
function datetimeParser(key: string, value: unknown): unknown {
  if ((key === 'start' || key === 'end') && typeof value === 'string') {
    return value; // Keep as string for now, convert to Date if needed
  }
  return value;
}

/**
 * Load and parse JSON data with datetime parsing
 */
function loadJsonData<T>(filePath: string): T {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content, datetimeParser) as T;
}

/**
 * Load the courts database with proper variable processing
 */
export function loadCourtsDb(): Courts {
  // Load base variables
  const variablesPath = join(dbRoot, 'data', 'variables.json');
  const rawVariables = loadJsonData<Record<string, unknown>>(variablesPath);
  
  // Load places files
  const placesDir = join(dbRoot, 'data', 'places');
  try {
    const placeFiles = readdirSync(placesDir).filter(f => f.endsWith('.txt'));
    
    for (const file of placeFiles) {
      const filePath = join(placesDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').map(line => line.trim()).filter(line => line);
      const placeName = file.replace('.txt', '');
      rawVariables[placeName] = `(${lines.join('|')})`;
    }
  } catch (error) {
    console.warn('Could not load places files:', error);
  }
  
  // Process variables using xtrax
  const processedVariables = xtraxProcessVariables(rawVariables);
  
  // Load and process courts.json
  const courtsPath = join(dbRoot, 'data', 'courts.json');
  let courtsContent = readFileSync(courtsPath, 'utf-8');
  
  // Handle ordinals - find patterns like ${1-41} and replace with ordinal ranges
  const ordinalMatches = courtsContent.match(/\$\{(\d+)-(\d+)\}/g);
  if (ordinalMatches) {
    for (const match of ordinalMatches) {
      const [, start, end] = match.match(/\$\{(\d+)-(\d+)\}/)!;
      const startNum = parseInt(start, 10);
      const endNum = parseInt(end, 10);
      
      // Get the ordinals for this range
      const rangeOrdinals = ordinals.slice(startNum - 1, endNum);
      const ordinalRegex = `(${rangeOrdinals.join('|')})`;
      
      courtsContent = courtsContent.replace(match, ordinalRegex);
    }
  }
  
  // Substitute variables in the courts content
  for (const [key, value] of Object.entries(processedVariables)) {
    const variablePattern = new RegExp(`\\$\\{${escapeRegex(key)}\\}`, 'g');
    courtsContent = courtsContent.replace(variablePattern, value);
  }
  
  // Handle backslashes carefully - only escape single backslashes that aren't already escaped
  // This preserves regex patterns like \\d+ while escaping any unescaped backslashes
  courtsContent = courtsContent.replace(/(?<!\\)\\(?!\\)/g, '\\\\');
  
  // Parse the processed JSON
  const data = JSON.parse(courtsContent) as Courts;
  
  // Handle parent court inheritance and normalize parent field
  for (const court of data) {
    // Normalize missing parent field to null (to match Python behavior)
    if (!court.parent) {
      court.parent = null;
    }
    
    if (court.parent) {
      const parent = data.find(c => c.id === court.parent);
      if (parent) {
        // Inherit missing properties from parent
        if (!court.dates || court.dates.length === 0) {
          court.dates = parent.dates;
        }
        if (!court.type) {
          court.type = parent.type;
        }
        if (!court.location) {
          court.location = parent.location;
        }
      }
    }
  }
  
  return data;
}

/**
 * Load regex variables (now deprecated - use loadCourtsDb which includes processed variables)
 */
export function loadRegexVariables(): RegexVariables {
  const variablesPath = join(dbRoot, 'data', 'variables.json');
  const rawVariables = loadJsonData<Record<string, unknown>>(variablesPath);
  return xtraxProcessVariables(rawVariables);
}

/**
 * Create a dictionary mapping court IDs to court objects
 */
export function makeCourtDictionary(courts: Courts): CourtDict {
  const courtDict: CourtDict = {};
  for (const court of courts) {
    courtDict[court.id] = court;
  }
  return courtDict;
}

/**
 * Compile all regex patterns for courts
 */
export async function gatherRegexes(courts: Courts): Promise<CompiledRegexes> {
  const variables = loadRegexVariables();
  const compiledRegexes: CompiledRegexes = {};
  
  for (const court of courts) {
    const regexes: any[] = [];
    
    // Add court name as a regex pattern (like Python version does)
    const courtRegexPatterns = [...court.regex, court.name];
    
    for (const regexPattern of courtRegexPatterns) {
      try {
        // Use xtrax recursive substitution for variables
        let processedPattern = recursiveSubstitute(regexPattern, variables);
        
        // Convert Python named groups to PCRE format if needed
        processedPattern = convertNamedGroups(processedPattern);
        
        // Normalize Unicode characters in the pattern to match input normalization
        processedPattern = unidecode(processedPattern);
        
        // Make pattern case-insensitive by adding (?i) flag
        if (!processedPattern.startsWith('(?i)')) {
          processedPattern = '(?i)' + processedPattern;
        }
        
        // Compile using XTRAX PCRE compiler
        const compiledRegex = await compileRegex(processedPattern);
        
        regexes.push(compiledRegex);
      } catch (error) {
        console.warn(`Failed to compile PCRE regex for court ${court.id}: ${regexPattern}`, error);
      }
    }
    
    compiledRegexes[court.id] = regexes;
  }
  
  return compiledRegexes;
}

/**
 * Check if a court is a bankruptcy court
 */
export function isBankruptcyCourt(court: Court): boolean {
  return court.id.includes('bap') || 
         court.id.includes('bank') || 
         court.name.toLowerCase().includes('bankruptcy');
}

/**
 * Check if a court matches the location filter
 */
export function matchesLocation(court: Court, location: string): boolean {
  if (!location) return true;
  
  const locationLower = location.toLowerCase();
  
  // Check court location
  if (court.location && court.location.toLowerCase().includes(locationLower)) {
    return true;
  }
  
  // Check court name
  if (court.name.toLowerCase().includes(locationLower)) {
    return true;
  }
  
  // Check jurisdiction
  if (court.jurisdiction && court.jurisdiction.toLowerCase().includes(locationLower)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a court was active on a given date
 */
export function isCourtActiveOnDate(court: Court, date: Date): boolean {
  if (!date) return true;
  
  for (const dateRange of court.dates) {
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;
    
    // If no start date, assume always active from beginning
    if (!startDate && !endDate) return true;
    
    // If no start date but has end date
    if (!startDate && endDate) {
      if (date <= endDate) return true;
    }
    
    // If has start date but no end date
    if (startDate && !endDate) {
      if (date >= startDate) return true;
    }
    
    // If both start and end dates
    if (startDate && endDate) {
      if (date >= startDate && date <= endDate) return true;
    }
  }
  
  return false;
}
