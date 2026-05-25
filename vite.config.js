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
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var isElectron = mode === "electron";
    return {
        base: "./",
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
                            build: {
                                outDir: "dist-electron",
                                rollupOptions: {
                                    external: ["electron"]
                                }
                            }
                        }
                    },
                    {
                        entry: "electron/preload.ts",
                        onstart: function (options) {
                            options.reload();
                        },
                        vite: {
                            build: {
                                outDir: "dist-electron"
                            }
                        }
                    }
                ]),
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
