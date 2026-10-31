const assert=require('assert');
const {isUkPostcode,looksForeign}=require('./uk-gate.js');

assert.strictEqual(isUkPostcode('WD25 8HL'),true);
assert.strictEqual(isUkPostcode('sw1a1aa'),true);
assert.strictEqual(isUkPostcode('LE1 5YA'),true);
assert.strictEqual(isUkPostcode('517501'),false);
assert.strictEqual(looksForeign('517501'),true,'Tirupati PIN');
assert.strictEqual(looksForeign('500001'),true);
assert.strictEqual(looksForeign('Tirupati'),true);
assert.strictEqual(looksForeign('Hyderabad, India'),true);
assert.strictEqual(looksForeign('WD25 8HL'),false);
assert.strictEqual(looksForeign('SW1A 1AA'),false);
assert.strictEqual(looksForeign('le15ya'),false);
assert.strictEqual(looksForeign('WD25'),false);
assert.strictEqual(looksForeign(''),false);
assert.strictEqual(looksForeign('pens'),true);

console.log('uk-gate checks passed');
