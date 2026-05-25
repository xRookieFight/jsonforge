import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const isElectron = mode === "electron";
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
    plugins: [
      react(),
      ...(isElectron
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
                onstart(options) {
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
        : [])
    ],
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
