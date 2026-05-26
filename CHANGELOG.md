# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioned with
[Semantic Versioning](https://semver.org/).

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

[Unreleased]: https://github.com/jfbedrock/jsonforge/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/jfbedrock/jsonforge/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/jfbedrock/jsonforge/releases/tag/v0.1.0
