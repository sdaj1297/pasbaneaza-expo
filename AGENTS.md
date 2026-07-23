# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Pasban UI Standard

Before making UI changes, read:

- `docs/design-brief.md`
- `docs/ui-rubric.md`
- `docs/design-references.md`

Use the installed Codex `ui-refactor` skill for visual hierarchy, spacing, typography, color, and polish work.

The homepage must be schedule-first. The event schedule is the product hero, not quotes, prayer times, generic hero copy, or decorative sections.

Hard requirements:

- Show schedule/event utility in the first meaningful viewport.
- Distinguish Anjuman committed programs from approved community programs.
- Preserve active flyer/special event support without pushing the schedule below the fold.
- Keep prayer times compact on the homepage.
- Remove mojibake and broken text before shipping.
- Use the logo assets in `assets/images`.
- Build reusable primitives that can translate to Expo/iOS/Android.
- Reject generic template styling. The UI must feel curated, specific, and intentional.
