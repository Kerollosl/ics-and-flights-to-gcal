---
name: ICS to Google Calendar
description: A quiet local utility for reviewing calendar files before opening them in Google Calendar.
colors:
  surface: "oklch(98.5% 0.003 255)"
  surface-sunken: "oklch(96% 0.004 255)"
  border: "oklch(90% 0.006 255)"
  border-strong: "oklch(80% 0.01 255)"
  text-primary: "oklch(24% 0.015 255)"
  text-secondary: "oklch(52% 0.014 255)"
  text-tertiary: "oklch(68% 0.01 255)"
  accent: "oklch(53% 0.16 258)"
  accent-subtle: "oklch(94% 0.025 258)"
rounded:
  sm: "8px"
  md: "12px"
spacing:
  compact: "8px"
  standard: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "oklch(99% 0.005 258)"
    rounded: "{rounded.sm}"
    padding: "9px 16px"
---

# Design System: ICS to Google Calendar

## Overview

**Creative North Star: "The Native Handoff"**

This is a short-lived browser utility, not a destination. It moves someone from a calendar file to a useful review of its events, then hands them to Google Calendar. The interface is quiet, local, and task-led: a single action is visually clear, while supporting detail stays available without becoming a dashboard.

## Colors

A cool-tinted neutral palette keeps the popup at home in Chrome and macOS. Blue is reserved for the action that moves events forward; green and red communicate completed or blocked work only.

## Typography

**Body Font:** System sans (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`)

Use 14px/600 for the popup title, 13px/600 for actions and event titles, and 11-12px for supporting details. The product does not need a display face: clarity at 360px is the personality.

## Layout

The popup is a fixed 360px column. Keep a 20px horizontal gutter. The first state contains one upload task; the review state contains one summary and a compact ruled list. Vertical motion is limited to the transition between those states.

## Elevation & Depth

Depth comes from muted surface steps and 1px rules. Event rows do not become floating cards. Shadows are not a resting-state language.

## Shapes

Use an 8px radius for controls and a 12px radius only for the upload target. Avoid large pills and decorative rounding.

## Components

### Upload target

The upload target is a dashed, low-contrast surface that becomes blue only on drag-over or keyboard focus. Its language names the file type and the next step once, without repeating the privacy promise.

### Event list

Events are ruled rows: title and time lead; location is secondary; the per-event action remains small. A multi-event import earns one full-width bulk action above the list.

### Buttons

The bulk handoff action is filled blue. Per-event and ancillary actions are text or outlined controls, so the user can identify the next dominant step immediately.

## Do's and Don'ts

### Do:
- Do preserve the local-processing and no-sign-in promise in one quiet, persistent place.
- Do show the event details needed to decide whether to open a calendar draft.
- Do keep focus states visible on every interactive control.

### Don't:
- Don't use gradients, broad shadows, or stacked cards to make a utility feel branded.
- Don't repeat privacy reassurance in the header, empty state, and footer.
- Don't give a secondary handoff the same visual weight as opening calendar events.
