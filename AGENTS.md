# Repository Guidelines

## Project Structure & Module Organization

This repository is a vanilla TypeScript/Three.js explorer for the BETAFPV Matrix 1S 5IN1 II flight controller. `src/main.ts` orchestrates the application; `src/scene/` handles geometry, materials, cameras, and picking; `src/ui/` implements controls and information panels. Keep hardware specifications and placements in `src/data/`, with derived JSON in `src/data/generated/`. Styles live in `src/styles.css`.

`public/assets/` contains rendered textures; `public/references/` holds manufacturer images and source attribution. `tools/` contains Python asset generators and the Playwright screenshot script; visual evidence lives in `tools/screenshots/`. Production output goes to ignored `dist/`.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from the committed lockfile.
- `npm run dev`: start Vite at `http://localhost:8080`.
- `npm run typecheck`: run strict TypeScript checks.
- `npm run build`: typecheck and produce the production bundle.
- `npm run preview`: serve the existing production build on port 8080.
- `npm run screenshots`: exercise UI flows and capture screenshots from the built app; requires Chrome at `/usr/bin/google-chrome` and uses port 4173.
- `just verify`: run typechecking, build, screenshots, and comparison-image generation. Python image tooling requires Pillow.

## Coding Style & Naming Conventions

Follow existing TypeScript style: two-space indentation, single quotes, semicolons, camelCase functions and filenames, PascalCase types, and uppercase shared constants such as `BOARD`. Use explicit types at module boundaries and preserve strict checks, including unused-local and unused-parameter checks. No formatter or linter is configured. Keep interface copy in Traditional Chinese (Taiwan).

## Testing Guidelines

There is no unit-test framework or coverage threshold. Run `npm run build` for code changes. For scene or UI changes, follow with `npm run screenshots` and inspect the numbered captures for both board faces, texture modes, selection, tutorial, and comparison modal. Extend `tools/screenshots.mjs` for new interaction flows; retain its numbered, descriptive screenshot naming pattern.

## Commit & Pull Request Guidelines

History commonly uses `feat(ui): …`, `fix(controls): …`, `refactor(highlight): …`, `docs: …`, and `ci: …`; follow that concise, imperative convention. PRs should describe behavior changes, link relevant issues, report validation commands, and include screenshots for visual changes.

## Hardware Accuracy

For geometry or specification changes, consult `guideline.md`, `REFERENCE_NOTES.md`, and `public/references/SOURCE.md`. Preserve millimeter units, the X-Z board plane, and forward along -Z. Distinguish verified specifications from estimated placements; model only supported physical features and label educational overlays clearly.
