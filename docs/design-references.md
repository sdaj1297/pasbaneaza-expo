# Design References And Workflow

## Installed Codex Skill

The `ui-refactor` Codex skill has been installed locally:

`C:\Users\danis\.codex\skills\ui-refactor`

Use it for UI redesign, visual hierarchy, spacing, typography, color, and polish work.

## Working Method

1. Start with the core feature, not the shell.
2. Wireframe in grayscale before choosing color.
3. Use a constrained spacing scale.
4. Use a constrained type scale.
5. De-emphasize secondary modules instead of making primary modules louder.
6. Review with `docs/ui-rubric.md` before merging.

## Pasban-Specific Design Checks

- The schedule board is the homepage hero.
- Flyers are important but secondary to immediate event discovery.
- Prayer times are useful but must be compact on home.
- Quotes/sayings are tertiary content.
- The design should feel like a new product surface, not a re-skin.

## Native Portability

Prefer primitives that can become Expo components:

- schedule list
- status badge
- flyer preview
- segmented filter
- event detail row
- compact prayer widget
- contact form block
