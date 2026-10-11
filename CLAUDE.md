# ICS and Flights to Google Calendar — Chrome Extension

MV3 Chrome Extension that parses `.ics` files (drag-drop or file picker), previews events locally, then opens Google Calendar event templates for review and saving.

## Architecture

```
popup/          → popup.html + popup.js (UI: drag-drop zone, status)
popup/calendar.js → CalendarImport parsing and Google Calendar URL generation
popup/ical.min.js → bundled ical.js library
manifest.json   → MV3; permissions: ["tabs"]; no content scripts
```

## How It Works

1. User drops a `.ics` file onto the popup; `popup.js` reads it via `FileReader` and calls `CalendarImport.parse`, which uses the bundled ical.js library.
2. The popup previews VEVENT details and builds `https://calendar.google.com/calendar/render?action=TEMPLATE&...` URLs.
3. Clicking Open uses `chrome.tabs.create` — one new tab per event. The user reviews and saves each template in Google Calendar. Open Flighty launches the installed app via its URL scheme.

The active extension does not read Gmail or detect flight emails. Legacy files under `content/` are not loaded by the manifest.

## Known Limitation / Planned Upgrade

Intent URLs open one tab per event and do not confirm whether the user saved it. Modified recurrence instances require Google Calendar's native ICS import. A future Calendar REST API integration would require a separate OAuth workflow; the current extension has no account access.

## Development

```bash
# Load unpacked in Chrome:
# chrome://extensions/ → Developer mode → Load unpacked → select this folder

# No build step — plain JS/HTML
node --test tests/*.cjs
```

## Key File

`popup/ical.min.js` is the active bundled copy of `ical.js`. Do not hand-edit it — replace with a fresh build from the upstream repo if updating.
