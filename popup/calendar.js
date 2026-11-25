/* global ICAL */
(function(root){
 const compact=t=>t.toString().replace(/[-:]/g,'');
 function isAllDay(t){return Boolean(t?.isDate);}
 function timed(t){
  const zone=t.zone?.tzid || t.timezone || 'floating';
  if(zone==='floating')return compact(t);
  if(zone==='UTC'||zone==='Z')return compact(t).replace(/Z?$/,'Z');
  return compact(t.convertToZone(ICAL.Timezone.utcTimezone)).replace(/Z?$/,'Z');
 }
 // Long descriptions make template URLs too long for Calendar to open; keep the start.
 const MAX_DETAILS=1500;
 const clip=s=>s.length>MAX_DETAILS?s.slice(0,MAX_DETAILS-1).trimEnd()+'…':s;
 function buildGCalUrl(event){
  if(!event.startDate)throw Error('Event is missing DTSTART');
  let end=event.endDate;
  if(!event.component.hasProperty('dtend')&&!event.component.hasProperty('duration')){
   end=event.startDate.clone();end.adjust(isAllDay(end)?1:0,isAllDay(end)?0:1,0,0);
  }
  const fmt=isAllDay(event.startDate)?compact:timed;
  const params=new URLSearchParams({action:'TEMPLATE',text:event.summary||'Untitled Event',dates:`${fmt(event.startDate)}/${fmt(end)}`,details:clip(event.description||''),location:event.location||''});
  const recurrence=['rrule','rdate','exdate'].flatMap(name=>event.component.getAllProperties(name).map(p=>p.toICALString()));
  if(recurrence.length)params.set('recur',recurrence.join('\n'));
  return `https://calendar.google.com/calendar/render?${params}`;
 }
 function parse(text){
  let comp;
  try{comp=new ICAL.Component(ICAL.parse(text));}catch(e){throw Error('Not a valid calendar (.ics) file');}
  comp.getAllSubcomponents('vtimezone').forEach(c=>ICAL.TimezoneService.register(new ICAL.Timezone(c)));
  const seen=new Set();const warnings=[];let overrides=0;
  const events=comp.getAllSubcomponents('vevent').flatMap(c=>{
   if(c.getFirstPropertyValue('status')==='CANCELLED')return [];
   // A template URL cannot represent an overridden recurrence occurrence safely.
   // Skip just that occurrence and report it, instead of rejecting the whole file.
   if(c.hasProperty('recurrence-id')){overrides++;return [];}
   for(const name of ['dtstart','dtend']){
    const tzid=c.getFirstProperty(name)?.getParameter('tzid');
    if(tzid && tzid!=='UTC' && !ICAL.TimezoneService.has(tzid))throw Error(`Missing VTIMEZONE definition for ${tzid}; use native Calendar ICS import`);
   }
   const event=new ICAL.Event(c);const key=`${event.uid}|${event.startDate?.toString()}`;
   if(seen.has(key))return [];seen.add(key);return [{event,url:buildGCalUrl(event)}];
  });
  if(overrides)warnings.push(`skipped ${overrides} modified recurring occurrence${overrides===1?'':'s'} (use native Calendar ICS import for those)`);
  events.warnings=warnings;
  return events;
 }
 root.CalendarImport={isAllDay,buildGCalUrl,parse};
})(globalThis);
