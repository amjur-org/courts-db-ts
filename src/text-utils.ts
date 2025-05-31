/**
 * Remove extra whitespace from court string.
 * @param courtStr - The court string
 * @returns The court string without extra whitespace
 */
export function stripPunc(courtStr: string): string {
  // Combined whitespace regex
  const combinedWhitespace = /\s{2,}/g;
  return courtStr.replace(combinedWhitespace, ' ').trim();
}
