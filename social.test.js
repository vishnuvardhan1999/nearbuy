const assert=require('assert');
const S=require('./social.js');

assert.strictEqual(S.validateCancel('','').ok,false);
assert.strictEqual(S.validateCancel('nope','x').ok,false);
assert.strictEqual(S.validateCancel('changed','').ok,true);
assert.strictEqual(S.validateCancel('other','').ok,false);
assert.strictEqual(S.validateCancel('other','Shop closed early').ok,true);
assert.strictEqual(S.reasonLabel('stock'),'Item unavailable');

const until=S.londonLocalToDate('2026-10-30T21:00');
assert.ok(until instanceof Date);
const parts=S.londonParts(until);
assert.strictEqual(parts.iso,'2026-10-30');
assert.strictEqual(parts.hour,21);
assert.strictEqual(parts.minute,0);
// 21:00 UK on 30 Oct 2026 is GMT, so the instant is 21:00Z.
assert.strictEqual(until.toISOString(),'2026-10-30T21:00:00.000Z');
// July is BST: 21:00 London is 20:00 UTC.
const summer=S.londonLocalToDate('2026-07-15T21:00');
assert.strictEqual(summer.toISOString(),'2026-07-15T20:00:00.000Z');
assert.strictEqual(S.offerActive(until,new Date('2026-10-30T20:00:00Z')),true);
assert.strictEqual(S.offerActive(until,new Date('2026-10-30T21:00:00Z')),false);

console.log('social checks passed');
