const assert=require('assert');
const H=require('./hours-core.js');

const SUMAN='Mon 10am-6pm, Tue 10am-8pm, Wed 10am-6pm, Thu 10am-8pm, Fri 10am-6pm, Sat closed, Sun 10am-2pm';

function at(iso,expect){
  const s=H.status(SUMAN,new Date(iso));
  assert.strictEqual(s.open,expect.open,iso+' open '+JSON.stringify(s));
  if(expect.label)assert.strictEqual(s.label,expect.label,iso+' label '+s.label);
  if(expect.soon)assert.strictEqual(s.openingSoon,true,iso);
  if(expect.closing)assert.strictEqual(s.closingSoon,true,iso);
  return s;
}

// Friday 30 Oct 2026 is GMT. Shop opens 10am. Must not be reported open at 07:55.
at('2026-10-30T07:55:00Z',{open:false,label:'Opens at 10am'});
at('2026-10-30T10:00:00Z',{open:true,label:'Open · Closes 6pm'});
at('2026-10-30T17:15:00Z',{open:true,label:'Closes at 6pm',closing:true});
at('2026-10-30T18:00:00Z',{open:false,label:'Opens Sun at 10am'});
at('2026-10-30T09:15:00Z',{open:false,label:'Opens at 10am',soon:true});
// Saturday closed, Sunday morning still closed, Sunday afternoon open.
at('2026-10-31T12:00:00Z',{open:false,label:'Opens tomorrow at 10am'});
at('2026-11-01T08:00:00Z',{open:false,label:'Opens at 10am'});
at('2026-11-01T12:00:00Z',{open:true,label:'Open · Closes 2pm'});
// Per-day: Monday closes 6pm, Tuesday closes 8pm.
at('2026-10-26T18:30:00Z',{open:false,label:'Opens tomorrow at 10am'}); // Monday after 6pm
at('2026-10-27T18:00:00Z',{open:true,label:'Open · Closes 8pm'}); // Tuesday, still an hour out

// DST: July is BST (UTC+1). 09:30 UTC is 10:30 in London, so the shop is open.
// 09:30 UTC in January is 09:30 GMT, so the same shop is still closed.
{
  const jul=H.status(SUMAN,new Date('2026-07-15T09:30:00Z'));
  assert.strictEqual(H.london(new Date('2026-07-15T09:30:00Z')).iso,'2026-07-15');
  assert.strictEqual(jul.open,true,jul.label);
  assert.strictEqual(jul.label,'Open · Closes 6pm');
  const jan=H.status(SUMAN,new Date('2026-01-14T09:30:00Z'));
  assert.strictEqual(jan.open,false,jan.label);
  assert.strictEqual(jan.label,'Opens at 10am');
  const janEarly=H.status(SUMAN,new Date('2026-01-14T08:00:00Z'));
  assert.strictEqual(janEarly.open,false);
  assert.strictEqual(janEarly.label,'Opens at 10am');
  // 08:30 UTC in July is 09:30 BST: opens soon, not open.
  const early=H.status(SUMAN,new Date('2026-07-15T08:30:00Z'));
  assert.strictEqual(early.open,false);
  assert.strictEqual(early.openingSoon,true);
  assert.strictEqual(early.label,'Opens at 10am');
}

// Overnight range, including the spill into the next morning.
const NIGHT='Every day 8pm-2am';
{
  const a=H.status(NIGHT,new Date('2026-10-30T18:00:00Z'));
  assert.strictEqual(a.open,false);
  assert.strictEqual(a.label,'Opens at 8pm');
  const b=H.status(NIGHT,new Date('2026-10-30T20:30:00Z'));
  assert.strictEqual(b.open,true);
  assert.strictEqual(b.label,'Open · Closes 2am');
  const c=H.status(NIGHT,new Date('2026-10-31T00:30:00Z'));
  assert.strictEqual(c.open,true,c.label);
  assert.strictEqual(c.label,'Open · Closes 2am');
  const c2=H.status(NIGHT,new Date('2026-10-31T01:00:00Z'));
  assert.strictEqual(c2.open,true);
  assert.strictEqual(c2.closingSoon,true);
  assert.strictEqual(c2.label,'Closes at 2am');
  const d=H.status(NIGHT,new Date('2026-10-31T02:00:00Z'));
  assert.strictEqual(d.open,false,d.label);
  assert.strictEqual(d.label,'Opens at 8pm');
}
// Friday night only, Saturday closed: 1am Saturday is still open, 3am is not.
{
  const fri='Mon-Thu 9am-5pm, Fri 10pm-2am, Sat closed, Sun closed';
  assert.strictEqual(H.status(fri,new Date('2026-10-31T01:00:00Z')).open,true);
  assert.strictEqual(H.status(fri,new Date('2026-10-31T03:00:00Z')).open,false);
  assert.strictEqual(H.status(fri,new Date('2026-10-30T22:30:00Z')).label,'Open · Closes 2am');
}

// 24 hours
{
  const s=H.status('Every day open 24 hours',new Date('2026-10-30T03:00:00Z'));
  assert.strictEqual(s.open,true);
  assert.strictEqual(s.label,'Open 24 hours');
}

// Closed day does not inherit a stale boolean.
{
  const s=H.status('Mon-Fri closed, Sat 9am-1pm, Sun closed',new Date('2026-10-30T12:00:00Z'));
  assert.strictEqual(s.open,false);
  assert.strictEqual(s.label,'Opens tomorrow at 9am');
}

// Legacy punctuation used by shops already saved (en dash, newlines, 5:30).
{
  const legacy='Mon–Sat 7am–7pm, Sun 9am–2pm';
  const p=H.parse(legacy);
  assert.strictEqual(p.usable,true);
  assert.strictEqual(p.w[0].o,true);
  assert.strictEqual(p.w[0].a,'07:00');
  assert.strictEqual(p.w[0].b,'19:00');
  assert.strictEqual(p.w[6].b,'14:00');
  const lines='Mon–Fri 9am–5pm\nSat 10am–2pm\nSun closed';
  const q=H.parse(lines);
  assert.strictEqual(q.w[5].a,'10:00');
  assert.strictEqual(q.w[5].b,'14:00');
  assert.strictEqual(q.w[6].o,false);
  assert.strictEqual(H.status('Mon-Fri 9am-5:30pm, Sat closed, Sun closed',new Date('2026-10-30T17:00:00Z')).open,true);
  assert.strictEqual(H.status('Mon-Fri 9am-5:30pm, Sat closed, Sun closed',new Date('2026-10-30T17:30:00Z')).open,false);
}

// Empty and unreadable hours must not be treated as open.
{
  assert.strictEqual(H.status('',new Date('2026-10-30T12:00:00Z')).open,false);
  assert.strictEqual(H.status('',new Date('2026-10-30T12:00:00Z')).unknown,true);
  assert.strictEqual(H.status(null,new Date()).label,'Hours not set');
  const junk=H.status('ring the bell',new Date('2026-10-30T12:00:00Z'));
  assert.strictEqual(junk.open,false);
  assert.strictEqual(junk.unknown,true);
}

// JSON v2 round-trip, then the same answer as the legacy string.
{
  const p=H.parse(SUMAN);
  const saved=H.encode(p.w,[]);
  const back=H.parse(saved);
  assert.strictEqual(back.usable,true);
  assert.deepStrictEqual(back.w,p.w.map(d=>({o:d.o,a:d.a,b:d.b,all:!!d.all})));
  const a=H.status(SUMAN,new Date('2026-10-30T11:00:00Z'));
  const b=H.status(saved,new Date('2026-10-30T11:00:00Z'));
  assert.strictEqual(b.label,a.label);
  assert.strictEqual(H.display(saved),H.summary(p.w));
  assert.ok(!H.display(saved).startsWith('{'));
}

// Holiday hours override the weekly timetable.
{
  const weekly=H.parse(SUMAN);
  const xmas=H.encode(weekly.w,[{date:'2026-12-25',closed:true,note:'Christmas Day'},{date:'2026-12-24',closed:false,a:'09:00',b:'13:00',note:'Christmas Eve'}]);
  const day=H.status(xmas,new Date('2026-12-25T12:00:00Z'));
  assert.strictEqual(day.open,false);
  assert.ok(/Christmas Day/.test(day.notice),day.notice);
  assert.strictEqual(day.label,'Opens Sun at 10am');
  const eveOpen=H.status(xmas,new Date('2026-12-24T12:30:00Z'));
  assert.strictEqual(eveOpen.open,true);
  assert.strictEqual(eveOpen.closingSoon,true);
  assert.strictEqual(eveOpen.label,'Closes at 1pm');
  const eveShut=H.status(xmas,new Date('2026-12-24T14:00:00Z'));
  assert.strictEqual(eveShut.open,false);
  // A normal Thursday in December still uses weekly hours (Thu closes 8pm).
  const normal=H.status(xmas,new Date('2026-12-17T15:00:00Z'));
  assert.strictEqual(normal.open,true);
  assert.strictEqual(normal.label,'Open · Closes 8pm');
}

// Summary of mixed days round-trips through the legacy parser.
{
  const p=H.parse(SUMAN);
  const again=H.parse(H.summary(p.w));
  assert.deepStrictEqual(again.w.map(d=>[d.o,d.a,d.b]),p.w.map(d=>[d.o,d.a,d.b]));
}

{
  const p=H.parse(SUMAN);
  const rows=H.weekRows(p.w,4);
  assert.strictEqual(rows.map(r=>r.label+' '+r.hours).join(' | '),'Mon 10am–6pm | Tue 10am–8pm | Wed 10am–6pm | Thu 10am–8pm | Fri 10am–6pm | Sat Closed | Sun 10am–2pm');
  assert.strictEqual(rows[4].today,true);
  assert.strictEqual(rows.filter(r=>r.today).length,1);
  const g=H.weekRows(H.parse('Mon-Fri 9am-5pm, Sat closed, Sun closed').w,2);
  assert.strictEqual(g[0].label,'Mon–Fri');
  assert.strictEqual(g[0].hours,'9am–5pm');
  assert.strictEqual(g[0].today,true);
  assert.strictEqual(g[1].label,'Sat–Sun');
  assert.strictEqual(g[1].hours,'Closed');
}
console.log('all opening-hours checks passed');
