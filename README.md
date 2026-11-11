# Local ICS to Google Calendar templates

Load this folder as an unpacked Chromium extension. Select ICS files in the popup and inspect generated Google Calendar event templates before saving. This does not read Gmail, detect airlines, or create calendar events automatically. UTC, named zones, floating times, exclusive all-day ends and recurrence dates/exclusions are preserved. Modified recurrence instances require Google Calendar native ICS import. Run `node --test tests/*.cjs`.

## Packaging
`scripts/package.sh` zips only shipping files into `dist/`. Store text: `docs/STORE-LISTING.md`. Third-party licence: `THIRD-PARTY-NOTICES.md`. `dist/` is git-ignored.
