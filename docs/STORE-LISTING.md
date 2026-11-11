# Chrome Web Store listing: ICS to Google Calendar

Placeholders to fill: `TODO_PRIVACY_URL`, `TODO_SUPPORT_URL`, `TODO_AUTHOR`.

## Short description (max 132 chars)
Preview .ics calendar files on your device, then open each event in Google Calendar. No sign-in, no account access.

## Long description
Pick one or more .ics files (from an invitation, an airline, a school or a club) and see every event in a clear list. Click Open to get a pre-filled Google Calendar event page in a new tab, review it, and save it yourself.

- Files are read inside the popup on your device. Nothing is uploaded.
- No sign-in and no access to your Google account. Events reach Google Calendar only when you click Open (the event details are placed in the Google Calendar URL for that tab).
- Handles UTC, named time zones, floating times, all-day events and recurrence rules.
- "Open all" opens at most 10 tabs at once, after a confirmation.
- If a file cannot be imported (for example, a modified occurrence of a repeating event), the popup tells you why.

Unofficial: not affiliated with, endorsed by, or sponsored by Google. Google Calendar is a trademark of Google LLC.

## Single purpose
Read local .ics files and open their events as pre-filled Google Calendar event pages.

## Permission justifications
- No extension permissions and no host permissions are requested. The popup opens Google Calendar tabs with chrome.tabs.create, which needs no permission.
- No content scripts, no background page, no remote code.

## Privacy answers
- Data collected or transmitted by the extension: none. Selected files are parsed locally and discarded when the popup closes.
- When you click Open, your browser loads a Google Calendar URL containing that event's title, time, location and description; that is a normal page visit to Google.
- Sold / shared: no. Analytics: none.

## Privacy policy text (host at TODO_PRIVACY_URL)
ICS to Google Calendar does not collect, store or transmit any data. Calendar files you choose are read in the extension popup on your device and discarded when it closes. When you click Open, the extension opens a Google Calendar page in a new tab; the details of that event are included in the page address and are handled by Google under Google's own privacy policy. The extension has no account access, no analytics and loads no remote code. Contact: TODO_SUPPORT_URL.

## Assets still needed (owner)
1280x800 screenshots, 440x280 promo tile, support URL.
