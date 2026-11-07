/**
 * Gmail Content Script
 * Detects flight confirmation emails and offers one-click Google Calendar event creation.
 * Uses FlightParser from parser.js (injected before this script).
 */

(() => {
  const BANNER_ID = 'ics-flight-banner';
  const PROCESSED_ATTR = 'data-flight-parsed';
  let lastUrl = '';
  let debounceTimer = null;

  // ─── Observer: watch for Gmail navigation / email open ─────────────────────

  function init() {
    // Gmail is a SPA — watch URL changes and DOM mutations
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        cleanup();
      }
      scheduleCheck();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    // Initial check
    scheduleCheck();
  }

  function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkForFlightEmail, 500);
  }

  // ─── Detection ─────────────────────────────────────────────────────────────

  function checkForFlightEmail() {
    // Only run on individual email view (URL contains '#inbox/' or similar with an ID)
    if (!isEmailView()) return;

    // Don't re-process if banner already exists for current email
    if (document.getElementById(BANNER_ID)) return;

    const emailBody = getEmailBody();
    if (!emailBody) return;
    if (emailBody.hasAttribute(PROCESSED_ATTR)) return;

    const subject = getEmailSubject();
    const bodyText = emailBody.textContent || '';
    const bodyHtml = emailBody.innerHTML || '';

    if (!FlightParser.isFlightConfirmation(subject, bodyText)) {
      emailBody.setAttribute(PROCESSED_ATTR, 'no');
      return;
    }

    const segments = FlightParser.parseEmail(bodyHtml, subject);
    if (!segments.length) {
      emailBody.setAttribute(PROCESSED_ATTR, 'no');
      return;
    }

    emailBody.setAttribute(PROCESSED_ATTR, 'yes');
    injectBanner(emailBody, segments, subject);
  }

  function isEmailView() {
    // Gmail email view URLs contain a message ID hash
    const hash = location.hash;
    // Matches patterns like #inbox/FMfcg... or #sent/FMfcg... or #label/X/FMfcg...
    return /^#[a-zA-Z]+\/[A-Za-z0-9]+/.test(hash) ||
           /^#[a-zA-Z]+\/[^/]+\/[A-Za-z0-9]+/.test(hash);
  }

  function getEmailBody() {
    // Gmail renders the email body in a div with class "a3s" (main content) or "ii gt"
    const bodies = document.querySelectorAll('.a3s.aiL, .a3s');
    // Return the last visible one (in case of quoted/expanded messages)
    for (let i = bodies.length - 1; i >= 0; i--) {
      if (bodies[i].offsetHeight > 0) return bodies[i];
    }
    return bodies[0] || null;
  }

  function getEmailSubject() {
    // Gmail renders subject in h2 with class "hP"
    const subjectEl = document.querySelector('h2.hP');
    return subjectEl ? subjectEl.textContent.trim() : '';
  }

  // ─── Banner UI ─────────────────────────────────────────────────────────────

  function injectBanner(emailBody, segments, subject) {
    const banner = document.createElement('div');
    banner.id = BANNER_ID;

    const segCount = segments.length;
    const airlineName = segments[0].airlineName || 'Flight';

    // Build segment summary lines
    const segLines = segments.map(seg => {
      const route = [seg.departure, seg.arrival].filter(Boolean).join(' → ');
      const dateStr = seg.date || '';
      const timeStr = [seg.departureTime, seg.arrivalTime].filter(Boolean).join(' – ');
      const flight = seg.flightNumber || '';
      return `<div class="flight-seg">
        <span class="flight-num">${esc(flight)}</span>
        ${route ? `<span class="flight-route">${esc(route)}</span>` : ''}
        ${dateStr ? `<span class="flight-date">${esc(dateStr)}${timeStr ? ' · ' + esc(timeStr) : ''}</span>` : ''}
      </div>`;
    }).join('');

    banner.innerHTML = `
      <div class="flight-banner-inner">
        <div class="flight-banner-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
          </svg>
        </div>
        <div class="flight-banner-content">
          <div class="flight-banner-title">${esc(airlineName)} · ${segCount} flight${segCount > 1 ? 's' : ''} detected</div>
          <div class="flight-segments">${segLines}</div>
        </div>
        <div class="flight-banner-actions">
          <button class="flight-btn-add" id="flight-add-cal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Add to Google Calendar
          </button>
          <button class="flight-btn-dismiss" id="flight-dismiss" title="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;

    // Insert before the email body
    const container = emailBody.closest('.gs') || emailBody.parentElement;
    container.insertBefore(banner, emailBody.closest('.adn') || emailBody);

    // Add button handlers
    banner.querySelector('#flight-add-cal').addEventListener('click', () => {
      openFlightsInCalendar(segments);
      const btn = banner.querySelector('#flight-add-cal');
      btn.textContent = 'Opened!';
      btn.disabled = true;
      btn.classList.add('flight-btn-done');
    });

    banner.querySelector('#flight-dismiss').addEventListener('click', () => {
      banner.remove();
    });
  }

  // ─── Calendar Integration ──────────────────────────────────────────────────

  function openFlightsInCalendar(segments) {
    segments.forEach((seg, i) => {
      const url = buildFlightGCalUrl(seg);
      setTimeout(() => {
        window.open(url, '_blank');
      }, i * 400);
    });
  }

  function buildFlightGCalUrl(seg) {
    const title = [seg.airlineName, seg.flightNumber].filter(Boolean).join(' — ');
    const location = [seg.departure, seg.arrival].filter(Boolean).join(' → ');

    // Build dates string
    let dates = '';
    if (seg.date) {
      const dateClean = seg.date.replace(/-/g, '');
      if (seg.departureTime && seg.arrivalTime) {
        const startTime = seg.departureTime.replace(':', '');
        const endTime = seg.arrivalTime.replace(':', '');
        dates = `${dateClean}T${startTime}00/${dateClean}T${endTime}00`;
      } else if (seg.departureTime) {
        const startTime = seg.departureTime.replace(':', '');
        // Default to 2 hours later
        const startH = parseInt(seg.departureTime.split(':')[0]);
        const startM = seg.departureTime.split(':')[1];
        const endH = String(Math.min(startH + 2, 23)).padStart(2, '0');
        dates = `${dateClean}T${startTime}00/${dateClean}T${endH}${startM}00`;
      } else {
        // All-day event
        dates = `${dateClean}/${dateClean}`;
      }
    }

    const details = [
      seg.flightNumber ? `Flight: ${seg.flightNumber}` : '',
      seg.confirmationCode ? `Confirmation: ${seg.confirmationCode}` : '',
      seg.passenger ? `Passenger: ${seg.passenger}` : ''
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title || 'Flight',
      dates: dates,
      details: details,
      location: location
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ─── Styles ────────────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('ics-flight-styles')) return;
    const style = document.createElement('style');
    style.id = 'ics-flight-styles';
    style.textContent = `
      #${BANNER_ID} {
        margin: 0 0 12px 0;
        font-family: 'Google Sans', Roboto, -apple-system, sans-serif;
      }
      .flight-banner-inner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        border-radius: 12px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      }
      .flight-banner-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: #4f46e5;
        color: white;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .flight-banner-icon svg { color: white; }
      .flight-banner-content { flex: 1; min-width: 0; }
      .flight-banner-title {
        font-size: 13px;
        font-weight: 600;
        color: #1e1b4b;
        margin-bottom: 6px;
      }
      .flight-segments { display: flex; flex-direction: column; gap: 4px; }
      .flight-seg {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12px;
        color: #4338ca;
      }
      .flight-num { font-weight: 600; }
      .flight-route { color: #6366f1; }
      .flight-date { color: #64748b; }
      .flight-banner-actions {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        flex-shrink: 0;
      }
      .flight-btn-add {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: #4f46e5;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
        font-family: inherit;
      }
      .flight-btn-add:hover { background: #4338ca; }
      .flight-btn-add:disabled { cursor: default; }
      .flight-btn-done {
        background: #16a34a !important;
      }
      .flight-btn-dismiss {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        padding: 0;
        background: none;
        border: 1px solid #c7d2fe;
        border-radius: 8px;
        color: #6366f1;
        cursor: pointer;
        transition: all 0.15s;
      }
      .flight-btn-dismiss:hover {
        background: #e0e7ff;
        border-color: #a5b4fc;
      }

      /* Dark mode for Gmail (Gmail has its own dark mode class) */
      .dark #${BANNER_ID} .flight-banner-inner,
      [style*="background-color: rgb(17"] #${BANNER_ID} .flight-banner-inner {
        background: #1e1b4b;
        border-color: #312e81;
      }
      .dark .flight-banner-title,
      [style*="background-color: rgb(17"] .flight-banner-title { color: #e0e7ff; }
      .dark .flight-seg,
      [style*="background-color: rgb(17"] .flight-seg { color: #a5b4fc; }
      .dark .flight-date,
      [style*="background-color: rgb(17"] .flight-date { color: #94a3b8; }
      .dark .flight-btn-dismiss,
      [style*="background-color: rgb(17"] .flight-btn-dismiss {
        border-color: #312e81;
        color: #a5b4fc;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────

  // Clean up old banners on navigation
  function cleanup() {
    const old = document.getElementById(BANNER_ID);
    if (old) old.remove();
    // Clear processed attributes so re-check works after navigation
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => {
      el.removeAttribute(PROCESSED_ATTR);
    });
  }

  injectStyles();
  init();
})();
