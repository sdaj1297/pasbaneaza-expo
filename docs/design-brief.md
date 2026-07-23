# Pasban Design Brief

## Product Premise

The Pasban website/app is schedule-first. It exists to help the Houston azadari community find programs, verify locations, and track live majlis status.

The first screen must answer:

- What is happening today?
- What is the next Anjuman committed program?
- What approved community programs are coming up?
- Is a major flyer or special event active?
- Where is the program, and how do I get there?

Decorative storytelling, quotes, generic hero copy, and large prayer-time modules must not appear before the schedule utility.

## Homepage Priority

The homepage must be schedule-first.

First viewport target:

1. Compact brand header with logo.
2. Small date strip with Gregorian and Hijri date.
3. Primary schedule board with tabs or segments:
   - Today
   - Upcoming
   - Anjuman Committed
   - Community Programs
4. Optional active flyer/special event module that is visible but does not push the schedule below the fold.

The schedule board is the hero.

## Event Presentation

Event cards and rows must prioritize:

- time
- host/contact person
- event title
- location/address
- Anjuman committed vs community marker
- audience type where relevant
- map action

Avoid oversized cards that make users scroll through too much air. The design can be elegant and dense at the same time.

## Special Event/Flyer Behavior

Preserve the legacy flyer use case.

- Active flyers come from date-ranged announcements.
- A flyer can be visually prominent, but it must not hide the schedule.
- If a flyer has an image, render the actual flyer with a stable aspect ratio.
- If no flyer is active, do not show an empty hero placeholder.

## Platform Direction

This design language must transfer to Expo/iOS/Android later.

Use reusable primitives:

- schedule rows
- status badges
- segmented controls
- compact widgets
- flyer modules
- event detail sections
- form blocks

Avoid web-only patterns that cannot become native app surfaces.
