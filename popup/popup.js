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
  dropZone.querySelector('p').innerHTML = 'Reading calendar files<span class="loading-dots"></span>';
}

function hideLoading() {
  dropZone.classList.remove('loading');
  dropZone.querySelector('p').innerHTML = 'Choose <strong>.ics</strong> file(s)<br><span id="drop-zone-help">Drop files here or click to browse</span>';
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
      errors.push(file.name);
      remaining--;
      if (remaining === 0) finishProcessing(errors);
    };
    reader.onload = () => {
      try {
        const group = parseFile(file.name, reader.result);
        if (group) fileGroups.push(group);
      } catch (err) {
        console.error(`ICS parse error (${file.name}):`, err);
        errors.push(file.name);
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
        ? `Could not parse: ${errors.join(', ')}`
        : 'No events found in the uploaded file(s).',
      'error'
    );
    return;
  }

  renderEvents(fileGroups);
  if (errors.length) {
    showStatus(`Could not parse: ${errors.join(', ')}`, 'error');
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
  }, 200);
}

// ─── Google Calendar URL Builder ──────────────────────────────────────────────

const {isAllDay}=CalendarImport;

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderEvents(groups) {
  let html = '';
  const totalEvents = groups.reduce((sum, g) => sum + g.events.length, 0);
  const multiFile = groups.length > 1;

  if (totalEvents > 1) {
    html += `<p class="events-header">${totalEvents} events ready to review</p>`;
    html += `<button class="btn-open-all" id="openAllBtn">Open ${totalEvents} events in Google Calendar</button>`;
  }

  let globalIndex = 0;
  groups.forEach(({ filename, events }) => {
    if (multiFile) {
      html += `<div class="file-group-label">${escapeHtml(filename)}</div>`;
    }

    html += events.map(({ event, url }) => {
      const allDay = isAllDay(event.startDate);
      const start = event.startDate ? event.startDate.toJSDate() : null;
      const end = event.endDate ? event.endDate.toJSDate() : null;
      let timeRange;
      if (!start) {
        timeRange = 'No date';
      } else if (allDay) {
        timeRange = formatDateOnly(start);
        if (end && !isSameDay(start, end) && !isSameDay(start, new Date(end - 86400000))) {
          // Multi-day all-day event: show end date (subtract 1 day since ICS end is exclusive)
          timeRange += ` — ${formatDateOnly(new Date(end - 86400000))}`;
        }
      } else if (end && !isSameDay(start, end)) {
        // Cross-day timed event: show full date+time for both
        timeRange = `${formatDateTime(start)} — ${formatDateTime(end)}`;
      } else {
        const dateStr = formatDateTime(start);
        const endStr = end ? formatTime(end) : '';
        timeRange = endStr ? `${dateStr} — ${endStr}` : dateStr;
      }
      const idx = globalIndex++;

      return `
        <div class="event-card">
          <div class="ev-title">${escapeHtml(event.summary || 'Untitled Event')}</div>
          <div class="ev-meta">
            <span>${timeRange}</span>
            ${event.location ? `<span>${escapeHtml(event.location)}</span>` : ''}
          </div>
          <div class="ev-actions">
            <button class="btn btn-gcal" data-index="${idx}" aria-label="Open ${escapeHtml(event.summary || 'untitled event')} in Google Calendar">Open</button>
          </div>
        </div>
      `;
    }).join('');
  });

  // Jump to the Flighty desktop app
  html += `<button class="btn-flighty" id="flightyBtn">Open Flighty</button>`;

  // "Upload another" link
  html += `<div class="reset-link-wrap">
    <a href="#" id="resetBtn" class="reset-link">Choose different files</a>
  </div>`;

  eventList.innerHTML = html;

  // Attach listeners
  eventList.querySelectorAll('.btn-gcal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index);
      chrome.tabs.create({ url: parsedUrls[idx] });
    });
  });

  const openAllBtn = document.getElementById('openAllBtn');
  if (openAllBtn) {
    openAllBtn.addEventListener('click', () => {
      // Stagger tab opens to avoid overwhelming the browser
      parsedUrls.forEach((url, i) => {
        setTimeout(() => chrome.tabs.create({ url, active: false }), i * 300);
      });
    });
  }

  document.getElementById('flightyBtn').addEventListener('click', openFlighty);

  document.getElementById('resetBtn').addEventListener('click', (e) => {
    e.preventDefault();
    resetUI();
  });
}

// ─── Flighty ──────────────────────────────────────────────────────────────────

function openFlighty() {
  // Flighty registers the flighty:// scheme on macOS/iOS. Open it in a
  // throwaway tab so the OS hands off to the app, then close the tab.
  chrome.tabs.create({ url: 'flighty://' }, (tab) => {
    if (chrome.runtime.lastError || !tab?.id) return;
    setTimeout(
      () => chrome.tabs.remove(tab.id, () => void chrome.runtime.lastError),
      800
    );
  });
}

function resetUI() {
  preview.style.display = 'none';
  preview.classList.remove('fade-in');
  dropZone.style.display = '';
  dropZone.classList.remove('fade-out');
  eventList.innerHTML = '';
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/"/g, '&quot;');
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status status-${type}`;
  statusEl.style.display = 'block';
}

function hideStatus() {
  statusEl.style.display = 'none';
}

