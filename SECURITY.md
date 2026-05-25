# Security Policy

## Supported Versions

Only the latest **minor** release receives security fixes.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security problems.**

Create a security from https://github.com/jfbedrock/jsonforge/security

* A short description of the issue.
* Steps to reproduce (a minimal `.jfproject`, a malicious JSON UI input,
  the affected platform - web or Electron).
* The impact you observed.
* (Optional) a suggested fix.

You will get an acknowledgement within **72 hours**. We aim to release a fix
within **14 days** of confirmation, faster for actively exploitable issues.

## Scope

In scope:

* Renderer-process sandbox escapes or unsafe `ipcMain` handlers in the
  Electron build.
* `.jfproject` parsing bugs that allow arbitrary file write / read.
* XSS in the renderer (e.g. via crafted texture names or JSON UI input).
* Dependency vulnerabilities with a verified impact on JsonForge.

Out of scope:

* DoS via deliberately oversized inputs.
* Issues that require physical access to the host.
* Self-XSS that requires the user to paste hostile content into the URL bar.

## Disclosure

We coordinate disclosure with the reporter. Credits are recorded in
`CHANGELOG.md` unless you prefer to remain anonymous.
