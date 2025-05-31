export interface DateRange {
  start?: string | null;
  end?: string | null;
}

export interface Court {
  id: string;
  name: string;
  name_abbreviation?: string | null;
  level: string;
  system: string;
  type?: string;
  jurisdiction?: string;
  location?: string;
  locations?: number;
  citation_string?: string;
  court_url?: string;
  case_types?: string[];
  dates: DateRange[];
  examples: string[];
  regex: string[];
  sub_names?: string[];
  parent?: string | null;
}

export interface RegexVariables {
  [key: string]: string;
}

export interface FindCourtOptions {
  bankruptcy?: boolean | null;
  location?: string | null;
  allowPartialMatches?: boolean;
}

export interface FindCourtByDateOptions extends FindCourtOptions {
  date?: Date | null;
}

export type Courts = Court[];
export type CourtDict = { [id: string]: Court };
export type CompiledRegexes = { [id: string]: any[] }; // PCRE compiled regexes
