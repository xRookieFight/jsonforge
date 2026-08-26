import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";

function syncPreloadCjs(): void {
  const src = resolve(__dirname, "electron/preload.cjs");
  const dir = resolve(__dirname, "dist-electron");
  const dest = resolve(dir, "preload.cjs");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  copyFileSync(src, dest);
}

function copyPreloadCjs(): Plugin {
  return {
    name: "copy-preload-cjs",
    buildStart() { syncPreloadCjs(); },
    closeBundle() { syncPreloadCjs(); },
    configureServer() { syncPreloadCjs(); }
  };
}

syncPreloadCjs();

export default defineConfig(({ mode }) => {
  const isElectron = mode === "electron";
  return {
    base: process.env.VITE_BASE_PATH ?? "./",
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
    plugins: [
      react(),
      ...(isElectron
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
        : [])
    ],
    build: {
      outDir: "dist",
      sourcemap: true,
      target: "es2022",
      rollupOptions: {
        output: {
          // Rolldown (Vite 8) only takes the function form here.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("monaco-editor") || id.includes("@monaco-editor")) return "monaco";
            if (/node_modules\/(react|react-dom|scheduler|zustand|immer)\//.test(id)) return "vendor";
            return undefined;
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
