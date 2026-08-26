# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned with
[Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-08-26

### Added

* Minecraft addon export (`File > Export Addon`). Builds a `.mcaddon` or
  `.mcpack` containing the JSON UI, the textures with their nine-slice
  sidecars, the manifests with stable UUIDs, and - for form screens - a
  behavior pack script. Three targets: a form routed through
  `server_form.json`, a HUD overlay appended to `hud_screen.json` through
  `modifications`, or a restyled vanilla sidebar in `scoreboards.json` that
  keeps the engine bindings so real names and scores keep flowing.
* Scoreboard-aware labels. A label can read `objective_title`, `player_name`
  or `player_score` at a given row index, so a design can put row 0 and row 1
  anywhere instead of stacking them in a list.
* Form button actions: message, command, open another screen, or a scoreboard
  operation (add / remove / set / reset). Button text supports a
  `{score:objective}` placeholder filled in when the form opens.
* Bundled asset library: five ore-UI preset texture styles with their
  nine-slice data, plus the Minecraft fonts. A new texture picker with search,
  grouping and PNG (+ nine-slice JSON) upload.
* Canvas rendering that matches the game: textures are drawn through the same
  nine-slice algorithm at the game's scale, with the sidecar `base_size`
  honoured, and labels use the Minecraft fonts.
* Alignment tools (left / centre / right, top / middle / bottom), arrow-key
  nudging, and a "Scale with children" action that resizes a subtree
  proportionally in one undo step.
* Scoreboard Sidebar and Stats Menu project templates.
* Getting started guide in `docs/usage.md`.

### Changed

* The canvas works in JSON UI units and draws them scaled (Settings > Canvas
  Scale, default 3), so an element covers the same share of the screen as it
  does in game. Project templates were rescaled to a 384x216 screen.
* Dragging is driven by pointer capture and coalesced per frame, and the
  gesture is painted straight onto the DOM, committing one history entry at
  the end. The JSON preview is debounced.
* The History panel was removed; Undo / Redo moved to the canvas toolbar.
* Welcome screen redesign - hero with quick actions, template gallery,
  recent projects, and a reworked sidebar.
* Dependencies upgraded to React 19, Vite 8, Electron 42, TypeScript 6,
  zustand 5, immer 11, lucide 1.x, monaco 0.55 and react-mosaic-component 7.

### Fixed

* Textures were missing from exported packs: the exporter fetched `blob:`
  URLs, which the page's `connect-src` policy blocked. Bytes now come
  straight from storage.
* Exported JSON UI carried values the game rejects (`color` as hex, `tiled`
  as a word, zero `uv_size`), which made controls silently disappear.
* Wheel zoom never worked - the listener was attached before the canvas
  existed - and Firefox line-based wheel deltas are now normalised.
* Saving in Firefox failed because there is no File System Access API; text
  exports fall back to a download like the binary ones already did.
* Drags could stick when the pointer was released outside the window.
* Resize and move results were discarded by the next render.
* Zoomed canvas is centred correctly, and `layer` is honoured in the preview.

## [0.1.1] - 2026-05-26

### Added

* Hierarchy clipboard: copy / cut / paste (`Ctrl+C` / `Ctrl+X` / `Ctrl+V`) with
  fresh ids assigned to pasted subtrees, plus a right-click context menu in the
  Hierarchy panel exposing Copy / Cut / Paste / Duplicate / Delete.
* Sibling reordering in the Hierarchy panel: dragging a row now exposes three
  drop zones (before / into / after) with visual indicators, so children can
  be reordered inside the same parent in addition to reparenting.
* Default and vanilla `server_form` template. New projects default to that template.
* Discord Rich Presence integration via `electron-rpc` running in the main
  process (`DiscordRpcManager`). Client id and defaults live in
  `electron/discordConfig.ts`. Renderer pushes activity (`Editing <name>` /
  element count / namespace / project creation timestamp) on project changes
  and switches to an Idle presence when no project is open.
* Auto-updater via `electron-updater` (`AutoUpdaterManager`). On startup the
  packaged app checks the configured GitHub release feed
  (`jfbedrock/jsonforge`), shows an confirmation dialog when a newer
  version is available, downloads with a taskbar progress bar, then prompts
  for an immediate restart-and-install.
* Local ambient type declarations for `discord-rpc` and `electron-updater`
  so `tsc --noEmit` passes before the runtime packages are installed.

### Changed

* Drag and resize on the canvas no longer push one history entry per pixel.
  `SelectionOverlay` mutates the node live during the gesture (throttled by
  `requestAnimationFrame`) and commits a single `Move` / `Resize` undo entry
  on mouseup, removing the per-pixel CPU load and the per-pixel undo grain.
* `projectStore` gains `setPropertyLive`, `commitProperty`, and
  `commitPropertyBatch` for history-aware live editing, plus
  `moveNode(elementId, newParentId, index)` which collapses the same-parent
  reorder and cross-parent reparent paths into a single action.
* `ProjectService.createNew(name, namespace, template?)` accepts a template
  id; existing call sites default to `server_form`.
* `discord-rpc` and `electron-updater` are marked external in the Electron
  Vite build so the main process resolves them from `node_modules` at
  runtime.
* Updated electron-builder `publish` block to point at the
  `jfbedrock/jsonforge` GitHub repository.

## [0.1.0] - 2026-05-25

### Added

* Initial release: editor with 10 element types
  (panel, stack_panel, collection_panel, scrolling_panel, image, label,
  button, input_panel, toggle, custom), per-element property schema,
  bindings, undo/redo, JSON UI import/export, presets, Electron + web build.

[Unreleased]: https://github.com/jfbedrock/jsonforge/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/jfbedrock/jsonforge/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/jfbedrock/jsonforge/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/jfbedrock/jsonforge/releases/tag/v0.1.0
