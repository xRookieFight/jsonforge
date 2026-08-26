var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { resolve } from "node:path";
import { mkdirSync, existsSync, copyFileSync } from "node:fs";
function syncPreloadCjs() {
    var src = resolve(__dirname, "electron/preload.cjs");
    var dir = resolve(__dirname, "dist-electron");
    var dest = resolve(dir, "preload.cjs");
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    copyFileSync(src, dest);
}
function copyPreloadCjs() {
    return {
        name: "copy-preload-cjs",
        buildStart: function () { syncPreloadCjs(); },
        closeBundle: function () { syncPreloadCjs(); },
        configureServer: function () { syncPreloadCjs(); }
    };
}
syncPreloadCjs();
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var isElectron = mode === "electron";
    return {
        base: (_b = process.env.VITE_BASE_PATH) !== null && _b !== void 0 ? _b : "./",
        resolve: {
            alias: {
                "@": resolve(__dirname, "src"),
                "@core": resolve(__dirname, "src/core"),
                "@ui": resolve(__dirname, "src/ui"),
                "@platform": resolve(__dirname, "src/platform"),
                "@state": resolve(__dirname, "src/state"),
                "@hooks": resolve(__dirname, "src/hooks")
            }
        },
        plugins: __spreadArray([
            react()
        ], (isElectron
            ? [
                electron([
                    {
                        entry: "electron/main.ts",
                        vite: {
                            plugins: [copyPreloadCjs()],
                            build: {
                                outDir: "dist-electron",
                                emptyOutDir: false,
                                rollupOptions: {
                                    external: ["electron", "discord-rpc", "electron-updater"]
                                }
                            }
                        }
                    }
                ]),
                copyPreloadCjs(),
                renderer()
            ]
            : []), true),
        build: {
            outDir: "dist",
            sourcemap: true,
            target: "es2022",
            rollupOptions: {
                output: {
                    manualChunks: {
                        monaco: ["monaco-editor", "@monaco-editor/react"],
                        vendor: ["react", "react-dom", "zustand", "immer"]
                    }
                }
            }
        },
        server: {
            port: 5173,
            strictPort: true,
            host: true
        }
    };
});
