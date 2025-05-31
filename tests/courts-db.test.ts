import { describe, test, expect, beforeAll } from 'vitest';
import { 
  findCourt, 
  findCourtById, 
  courts as getCourts
} from '../src/index.js';
import { stripPunc } from '../src/text-utils.js';
import type { Courts } from '../src/types.js';

describe('Courts DB Tests', () => {
  let courts: Courts;

  beforeAll(async () => {
    courts = getCourts();
  });

  describe('DataTest', () => {
    test('unicode handling', () => {
      const sampleText = "Tribunal Dé Apelaciones De Puerto Rico";
      const matches = findCourt(sampleText);
      const expectedMatches = ["prapp"];
      expect(matches).toEqual(expectedMatches);
    });

    test('parent courts', () => {
      const courtStrExample = "California Court of Appeal, First Appellate District";
      const matches = findCourt(courtStrExample);
      const parentCourt = findCourtById(matches[0])[0]?.parent;
      expect(parentCourt).toBe("calctapp");

      const courtStrExample2 = "Supreme Court of the United States";
      const matches2 = findCourt(courtStrExample2);
      const parentCourt2 = findCourtById(matches2[0])[0]?.parent;
      expect(parentCourt2).toBe(null);
    });

    test('all examples', () => {
      for (const court of courts) {
        for (const courtStrExample of court.examples) {
          console.log(`Testing ${courtStrExample} ...`);
          const matches = findCourt(courtStrExample);
          expect(matches).toContain(court.id);
          console.log('√');
        }
      }
    });

    test('location filter', () => {
      const courtIds = findCourt("Calhoun County Circuit Court");
      expect(courtIds.sort()).toEqual(["flacirct14cal", "micirct37cal"]);

      const floridaCourtIds = findCourt("Calhoun County Circuit Court", { location: "Florida" });
      expect(floridaCourtIds).toEqual(["flacirct14cal"]);

      const michiganCourtIds = findCourt("Calhoun County Circuit Court", { location: "Michigan" });
      expect(michiganCourtIds).toEqual(["micirct37cal"]);

      const fayetteCounty = findCourt("Fayette County Court of Common Pleas");
      expect(fayetteCounty.sort()).toEqual(["ohctcomplfayett", "pactcomplfayett"]);

      const fayetteCountyJibberish = findCourt("Fayette County Court of Common Pleas", { location: "jibberish" });
      expect(fayetteCountyJibberish).toEqual([]);

      const fayetteCountyOhio = findCourt("Fayette County Court of Common Pleas", { location: "Ohio" });
      expect(fayetteCountyOhio).toEqual(["ohctcomplfayett"]);

      const fayetteCountyPa = findCourt("Fayette County Court of Common Pleas", { location: "Pennsylvania" });
      expect(fayetteCountyPa).toEqual(["pactcomplfayett"]);
    });
  });

  describe('ExamplesTest', () => {
    test('all non-bankruptcy examples', () => {
      for (const court of courts) {
        if (court.type === "bankruptcy") {
          continue;
        }
        for (const example of court.examples) {
          const cleanExample = stripPunc(example);
          const matches = findCourt(cleanExample, { bankruptcy: false });
          const results = [...new Set(matches)];
          expect(results).toContain(court.id);
        }
      }
    });

    test('bankruptcy examples', () => {
      for (const court of courts) {
        if (court.type !== "bankruptcy") {
          continue;
        }
        for (const example of court.examples) {
          const cleanExample = stripPunc(example);
          const matches = findCourt(cleanExample, { bankruptcy: true });
          const results = [...new Set(matches)];
          expect(results).toContain(court.id);
        }
      }
    });
  });
});
