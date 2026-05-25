# Installer output

This directory is populated by `electron-builder` when you run:

```bash
npm run build:electron
```

Generated artifacts:

| File                                  | Platform | Notes                                |
| ------------------------------------- | -------- | ------------------------------------ |
| `JsonForge Setup <version>.exe`       | Windows  | NSIS installer, per-user install     |
| `JsonForge-<version>-portable.exe`    | Windows  | Standalone portable .exe             |
| `JsonForge-<version>.dmg`             | macOS    | Drag-and-drop DMG                    |
| `JsonForge-<version>.AppImage`        | Linux    | Self-contained AppImage              |
| `jsonforge_<version>_amd64.deb`       | Linux    | Debian package                       |
| `latest*.yml`                         | All      | Auto-update metadata                 |

The installer registers the `.jfproject` extension with JsonForge automatically.
