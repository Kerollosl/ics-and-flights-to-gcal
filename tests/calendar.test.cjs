const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={URLSearchParams};vm.createContext(context);
vm.runInContext(fs.readFileSync('popup/ical.min.js','utf8'),context);
vm.runInContext(fs.readFileSync('popup/calendar.js','utf8'),context);
const parse=lines=>context.CalendarImport.parse(['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','UID:test',...lines,'END:VEVENT','END:VCALENDAR'].join('\r\n'));
test('UTC dates retain Z',()=>assert.equal(new URL(parse(['DTSTART:20261010T120000Z','DTEND:20261010T130000Z'])[0].url).searchParams.get('dates'),'20261010T120000Z/20261010T130000Z'));
test('all-day default end is next exclusive day',()=>assert.equal(new URL(parse(['DTSTART;VALUE=DATE:20261010'])[0].url).searchParams.get('dates'),'20261010/20261011'));
test('floating times remain floating',()=>assert.equal(new URL(parse(['DTSTART:20261010T120000','DTEND:20261010T130000'])[0].url).searchParams.get('dates'),'20261010T120000/20261010T130000'));
test('recurrence exclusions survive',()=>assert.match(new URL(parse(['DTSTART:20261010T120000Z','RRULE:FREQ=DAILY;COUNT=3','EXDATE:20261011T120000Z'])[0].url).searchParams.get('recur'),/EXDATE/));
test('overridden instances are skipped with a warning',()=>{const r=parse(['DTSTART:20261010T120000Z','RECURRENCE-ID:20261009T120000Z']);assert.equal(r.length,0);assert.match(r.warnings[0],/native Calendar/);});
test('long descriptions are truncated in the template URL',()=>{const d=new URL(parse(['DTSTART:20261010T120000Z','DESCRIPTION:'+'x'.repeat(5000)])[0].url).searchParams.get('details');assert.equal(d.length,1500);assert.ok(d.endsWith('…'));});

test('unknown named zone rejected rather than silently shifted',()=>assert.throws(()=>parse(['DTSTART;TZID=Unknown/Zone:20261010T120000']),/Missing VTIMEZONE/));
test('timed missing end defaults to one hour',()=>assert.equal(new URL(parse(['DTSTART:20261010T120000Z'])[0].url).searchParams.get('dates'),'20261010T120000Z/20261010T130000Z'));

test('garbage input gives a readable error',()=>assert.throws(()=>context.CalendarImport.parse('not a calendar'),/Not a valid calendar/));
