import { courts, regexes } from './dist/index.js';

// Let's check the compiled regexes for Alabama Supreme Court
const allCourts = courts();
const alabama = allCourts.find(court => court.id === 'ala');
console.log('Alabama Supreme Court:');
console.log('Raw regex patterns:', alabama.regex);

const compiledRegexes = regexes();
const alabamaRegexes = compiledRegexes['ala'];
console.log('\nCompiled regexes:', alabamaRegexes.map(r => r.source));

// Test if they match
const testText = 'Supreme Court';
console.log(`\nTesting "${testText}" against Alabama regexes:`);
alabamaRegexes.forEach((regex, i) => {
  const matches = regex.test(testText);
  console.log(`Regex ${i}: ${matches ? 'MATCH' : 'NO MATCH'} - ${regex.source}`);
});

// Test scotus
const scotus = allCourts.find(court => court.id === 'scotus');
const scotusRegexes = compiledRegexes['scotus'];
console.log('\n--- SCOTUS ---');
console.log('Raw regex patterns:', scotus.regex);
console.log('Compiled regexes:', scotusRegexes.map(r => r.source));

console.log(`\nTesting "Supreme Court of the United States" against SCOTUS regexes:`);
scotusRegexes.forEach((regex, i) => {
  const matches = regex.test('Supreme Court of the United States');
  console.log(`Regex ${i}: ${matches ? 'MATCH' : 'NO MATCH'} - ${regex.source}`);
});
