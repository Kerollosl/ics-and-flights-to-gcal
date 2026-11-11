/**
 * ICS to Google Calendar — Popup Script
 * Parses .ics files using ical.js and generates Google Calendar template URLs.
 */

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('event-preview');
const eventList = document.getElementById('event-list');
const statusEl = document.getElementById('status');

// Store parsed GCal URLs for "Open All"
let parsedUrls = [];
const parsedEventKeys = new Set();

// Store file groups: [{ filename, events: [{ event, url }] }]
let fileGroups = [];

// ─── File Input ───────────────────────────────────────────────────────────────

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => /\.ics$/i.test(f.name));
  if (files.length) {
    processFiles(files);
  } else {
    showStatus('Please drop valid .ics file(s).', 'error');
  }
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files).filter(f => /\.ics$/i.test(f.name));
  if (files.length) processFiles(files);
});

// ─── Loading State ───────────────────────────────────────────────────────────

function showLoading() {
  dropZone.classList.add('loading');
  const p = dropZone.querySelector('p');
  p.replaceChildren('Reading calendar files', Object.assign(document.createElement('span'), {className: 'loading-dots'}));
  dropZone.setAttribute('aria-busy', 'true');
}

function hideLoading() {
  dropZone.classList.remove('loading');
  const p = dropZone.querySelector('p');
  const strong = document.createElement('strong'); strong.textContent = '.ics';
  const help = document.createElement('span'); help.id = 'drop-zone-help'; help.textContent = 'Drop files here or click to browse';
  p.replaceChildren('Choose ', strong, ' file(s)', document.createElement('br'), help);
  dropZone.removeAttribute('aria-busy');
}

// ─── File Processing ──────────────────────────────────────────────────────────

function processFiles(files) {
  let remaining = files.length;
  let errors = [];
  fileGroups = [];
  parsedUrls = [];
  parsedEventKeys.clear();
  showLoading();

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onerror = () => {
      errors.push(`${file.name} (could not be read)`);
      remaining--;
      if (remaining === 0) finishProcessing(errors);
    };
    reader.onload = () => {
      try {
        const group = parseFile(file.name, reader.result);
        if (group) fileGroups.push(group);
      } catch (err) {
        errors.push(`${file.name} (${err && err.message ? err.message : 'unknown error'})`);
      }
      remaining--;
      if (remaining === 0) finishProcessing(errors);
    };
    reader.readAsText(file);
  });
}

function parseFile(filename,icsText){
 const events=CalendarImport.parse(icsText).filter(({event})=>{const key=`${event.uid}|${event.startDate.toString()}`;if(parsedEventKeys.has(key))return false;parsedEventKeys.add(key);return true;});if(!events.length)return null;
 events.forEach(({url})=>parsedUrls.push(url));return {filename,events};
}

function finishProcessing(errors) {
  hideLoading();

  if (!fileGroups.length) {
    showStatus(
      errors.length
        ? `Could not parse: ${errors.join('; ')}`
        : 'No events found in the uploaded file(s).',
      'error'
    );
    return;
  }

  renderEvents(fileGroups);
  if (errors.length) {
    showStatus(`Could not parse: ${errors.join('; ')}`, 'error');
  } else {
    hideStatus();
  }

  // Animate transition from drop zone to event list
  dropZone.classList.add('fade-out');
  setTimeout(() => {
    dropZone.style.display = 'none';
    dropZone.classList.remove('fade-out');
    preview.style.display = 'block';
    preview.classList.add('fade-in');
    preview.querySelector('button')?.focus();
  }, 200);
}

const {isAllDay}=CalendarImport;

// ─── Rendering ────────────────────────────────────────────────────────────────

const MAX_OPEN_ALL = 10;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function describeTimes(event) {
  const allDay = isAllDay(event.startDate);
  const start = event.startDate ? event.startDate.toJSDate() : null;
  const end = event.endDate ? event.endDate.toJSDate() : null;
  if (!start) return 'No date';
  if (allDay) {
    let range = formatDateOnly(start);
    if (end) {
      // ICS all-day end is exclusive. Step back one calendar day (setDate keeps
      // this correct across DST changes, unlike subtracting 86400000 ms).
      const lastDay = new Date(end);
      lastDay.setDate(lastDay.getDate() - 1);
      if (!isSameDay(start, lastDay)) range += ` — ${formatDateOnly(lastDay)}`;
    }
    return range;
  }
  if (end && !isSameDay(start, end)) return `${formatDateTime(start)} — ${formatDateTime(end)}`;
  const endStr = end ? formatTime(end) : '';
  return endStr ? `${formatDateTime(start)} — ${endStr}` : formatDateTime(start);
}

function renderEvents(groups) {
  const frag = document.createDocumentFragment();
  const totalEvents = groups.reduce((sum, g) => sum + g.events.length, 0);
  const multiFile = groups.length > 1;

  if (totalEvents > 1) {
    frag.append(el('p', 'events-header', `${totalEvents} events ready to review`));
    const label = totalEvents > MAX_OPEN_ALL
      ? `Open first ${MAX_OPEN_ALL} of ${totalEvents} events`
      : `Open ${totalEvents} events in Google Calendar`;
    const openAll = el('button', 'btn-open-all', label);
    openAll.type = 'button';
    openAll.addEventListener('click', () => {
      const urls = parsedUrls.slice(0, MAX_OPEN_ALL);
      const note = parsedUrls.length > MAX_OPEN_ALL
        ? `Open the first ${MAX_OPEN_ALL} of ${parsedUrls.length} events in new tabs? Use the Open buttons for the rest.`
        : `Open ${urls.length} new tabs in Google Calendar?`;
      if (!window.confirm(note)) return;
      urls.forEach((url, i) => {
        setTimeout(() => chrome.tabs.create({ url, active: false }), i * 300);
      });
    });
    frag.append(openAll);
  }

  let globalIndex = 0;
  groups.forEach(({ filename, events }) => {
    if (multiFile) frag.append(el('div', 'file-group-label', filename));
    events.forEach(({ event }) => {
      const idx = globalIndex++;
      const title = event.summary || 'Untitled Event';
      const card = el('div', 'event-card');
      card.append(el('div', 'ev-title', title));
      const meta = el('div', 'ev-meta');
      meta.append(el('span', '', describeTimes(event)));
      if (event.location) meta.append(el('span', '', event.location));
      card.append(meta);
      const actions = el('div', 'ev-actions');
      const btn = el('button', 'btn btn-gcal', 'Open');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Open ${title} in Google Calendar`);
      btn.addEventListener('click', () => chrome.tabs.create({ url: parsedUrls[idx] }));
      actions.append(btn);
      card.append(actions);
      frag.append(card);
    });
  });

  const wrap = el('div', 'reset-link-wrap');
  const reset = el('a', 'reset-link', 'Choose different files');
  reset.href = '#';
  reset.addEventListener('click', (e) => { e.preventDefault(); resetUI(); });
  wrap.append(reset);
  frag.append(wrap);
  eventList.replaceChildren(frag);
}

function resetUI() {
  preview.style.display = 'none';
  preview.classList.remove('fade-in');
  dropZone.style.display = '';
  dropZone.classList.remove('fade-out');
  eventList.replaceChildren();
  dropZone.focus();
  fileInput.value = '';
  parsedUrls = [];
  parsedEventKeys.clear();
  fileGroups = [];
  hideStatus();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

function formatDateOnly(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status status-${type}`;
  statusEl.style.display = 'block';
}

function hideStatus() {
  statusEl.style.display = 'none';
}

