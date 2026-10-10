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
 function buildGCalUrl(event){
  if(!event.startDate)throw Error('Event is missing DTSTART');
  let end=event.endDate;
  if(!event.component.hasProperty('dtend')&&!event.component.hasProperty('duration')){
   end=event.startDate.clone();end.adjust(isAllDay(end)?1:0,isAllDay(end)?0:1,0,0);
  }
  const fmt=isAllDay(event.startDate)?compact:timed;
  const params=new URLSearchParams({action:'TEMPLATE',text:event.summary||'Untitled Event',dates:`${fmt(event.startDate)}/${fmt(end)}`,details:event.description||'',location:event.location||''});
  const recurrence=['rrule','rdate','exdate'].flatMap(name=>event.component.getAllProperties(name).map(p=>p.toICALString()));
  if(recurrence.length)params.set('recur',recurrence.join('\n'));
  return `https://calendar.google.com/calendar/render?${params}`;
 }
 function parse(text){
  const comp=new ICAL.Component(ICAL.parse(text));
  comp.getAllSubcomponents('vtimezone').forEach(c=>ICAL.TimezoneService.register(new ICAL.Timezone(c)));
  const seen=new Set();
  return comp.getAllSubcomponents('vevent').flatMap(c=>{
   if(c.getFirstPropertyValue('status')==='CANCELLED')return [];
   // A template URL cannot represent an overridden recurrence occurrence safely.
   if(c.hasProperty('recurrence-id'))throw Error('Recurring exceptions require native Calendar ICS import');
   const event=new ICAL.Event(c);const key=`${event.uid}|${event.startDate?.toString()}`;
   if(seen.has(key))return [];seen.add(key);return [{event,url:buildGCalUrl(event)}];
  });
 }
 root.CalendarImport={isAllDay,buildGCalUrl,parse};
})(globalThis);
