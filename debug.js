import { courts, findCourt } from './dist/index.js';

// Let's check what courts we have and test the search
const allCourts = courts();
console.log(`Total courts loaded: ${allCourts.length}`);

// Find some Supreme Court entries
const supremeCourts = allCourts.filter(court => 
  court.name.toLowerCase().includes('supreme court')
);
console.log(`\nFound ${supremeCourts.length} courts with "supreme court" in name:`);
supremeCourts.slice(0, 5).forEach(court => {
  console.log(`- ${court.id}: ${court.name}`);
  console.log(`  Regex: ${court.regex.slice(0, 2).join(', ')}`);
});

// Test the search function
console.log('\n--- Testing findCourt function ---');
const results = findCourt('Supreme Court');
console.log(`findCourt('Supreme Court') returned: ${JSON.stringify(results)}`);

// Test with specific court
const scotusResults = findCourt('Supreme Court of the United States');
console.log(`findCourt('Supreme Court of the United States') returned: ${JSON.stringify(scotusResults)}`);

// Check if SCOTUS exists
const scotus = allCourts.find(court => court.id === 'scotus');
if (scotus) {
  console.log(`\nSCOTUS found: ${scotus.name}`);
  console.log(`SCOTUS regex: ${scotus.regex.join(', ')}`);
} else {
  console.log('\nSCOTUS not found in database');
}
