import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));
const entry = {
  index: resolve(rootDir, "src/index.ts"),
  cleanupAutorun: resolve(rootDir, "src/cleanup/cleanupAutorun.ts"),
  cleanupEventListener: resolve(rootDir, "src/cleanup/cleanupEventListener.ts"),
  cleanupIdleCallback: resolve(rootDir, "src/cleanup/cleanupIdleCallback.ts"),
  cleanupInterval: resolve(rootDir, "src/cleanup/cleanupInterval.ts"),
  cleanupReaction: resolve(rootDir, "src/cleanup/cleanupReaction.ts"),
  cleanupReactionList: resolve(rootDir, "src/cleanup/cleanupReactionList.ts"),
  cleanupReactionMap: resolve(rootDir, "src/cleanup/cleanupReactionMap.ts"),
  cleanupReactionPrimitiveList: resolve(rootDir, "src/cleanup/cleanupReactionPrimitiveList.ts"),
  cleanupRequestAnimationFrame: resolve(rootDir, "src/cleanup/cleanupRequestAnimationFrame.ts"),
  cleanupTimeout: resolve(rootDir, "src/cleanup/cleanupTimeout.ts"),
};

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry,
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: ["lodash", "mobx", "ms"],
      output: {
        exports: "named",
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
