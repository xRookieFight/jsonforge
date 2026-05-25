# Contributing to JsonForge

Thanks for taking the time to contribute! This document covers everything you
need to start landing changes.

## Quick start

```bash
git clone https://github.com/jfbedrock/jsonforge
cd jsonforge
npm install
npm run dev              # web at http://localhost:5173
npm run dev:electron     # desktop window
```

## Project layout

See [README.md](./README.md#architecture). Short version:

```
src/core/        Domain layer (services, registries, element types, IO)
src/platform/   Web vs Electron bridges
src/state/      Zustand stores
src/ui/         React panels, canvas, modals, welcome
electron/       Main + preload processes
build/icons/    Platform icons consumed by electron-builder
installer/      Generated installers (gitignored except README)
```

## Style conventions

* **Strict OOP**. Domain logic lives in classes under `src/core`. UI is React,
  but service access goes through `Container.resolve`.
* TypeScript strict mode. Run `npm run lint` before pushing.
* Add new element types under `src/core/element/impl/` and register them in
  `ElementBootstrap`.
* Add new services by extending `Service`, picking a `ServicePriority`, and
  appending them in `main.tsx`.

## Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(canvas): add marquee multi-select
fix(properties): clamp negative font scale
docs(readme): document .jfproject format
chore(deps): bump lucide-react to 0.430
```

Sign-off (`git commit -s`) is appreciated but not required.

## Pull requests

1. Fork → feature branch → PR against `main`.
2. CI must pass (`tsc`, `vite build`).
3. Describe the change, link the issue, and add screenshots for UI changes.
4. Keep PRs scoped - one concern per PR. Split mechanical refactors from
   behavior changes.

## Reporting bugs

Use the **Bug report** issue template. Include:

* OS + Electron version (if desktop)
* Repro steps
* Expected vs actual behavior
* `.jfproject` file (or trimmed snippet) when relevant

## Security issues

Do **not** open a public issue. See [SECURITY.md](./SECURITY.md).

## Releasing (maintainers only)

1. Update `CHANGELOG.md`.
2. Bump `version` in `package.json`.
3. Tag: `git tag v0.x.y && git push --tags`.
4. The **Release** workflow builds installers for Windows, macOS, Linux and
   attaches them to a GitHub Release.

## Code of Conduct

By participating you agree to abide by the
[Code of Conduct](./CODE_OF_CONDUCT.md).
