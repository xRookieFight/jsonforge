# Icons

Drop platform icons here. `electron-builder` reads them at package time.

## Required files (replace placeholders)

| File                            | Platform | Format        | Size                                    |
| ------------------------------- | -------- | ------------- | --------------------------------------- |
| `icon.ico`                      | Windows  | Multi-res ICO | 16, 24, 32, 48, 64, 128, 256 px         |
| `icon.icns`                     | macOS    | ICNS bundle   | up to 1024×1024                         |
| `icon.png`                      | Linux    | PNG           | 512×512 recommended                     |
| `512x512.png`                   | Linux    | PNG           | 512×512                                 |
| `256x256.png`                   | Linux    | PNG           | 256×256                                 |
| `128x128.png`                   | Linux    | PNG           | 128×128                                 |
| `64x64.png`                     | Linux    | PNG           | 64×64                                   |
| `jfproject.ico`                 | Windows  | ICO           | shown for `.jfproject` files            |
| `installer-header.bmp`          | Windows  | BMP, 150×57   | NSIS installer top banner               |
| `installer-sidebar.bmp`         | Windows  | BMP, 164×314  | NSIS sidebar (welcome + finish pages)   |
| `dmg-background.png`            | macOS    | PNG, 540×380  | DMG window background                   |

## Quick generation

If you only have a single high-res master PNG, use **electron-icon-maker** or
**electron-icon-builder** to generate the full set:

```bash
npx electron-icon-builder --input=./master.png --output=./build/icons
```