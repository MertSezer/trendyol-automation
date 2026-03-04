const fs = require('fs');
const s = fs.readFileSync('./tests/multi_url_add_remove_test.js', 'utf8');
const needle = '\\"'; // literally backslash + quote
console.log(s.includes(needle) ? 'FOUND \\\\"' : 'OK (no \\\\" )');
