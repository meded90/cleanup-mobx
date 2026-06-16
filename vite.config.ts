import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(rootDir, "src/index.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
    },
    rollupOptions: {
      external: ["lodash", "mobx", "ms"],
      output: {
        globals: {
          lodash: "_",
          mobx: "mobx",
          ms: "ms",
        },
      },
    },
    sourcemap: true,
    target: "es2022",
  },
});
