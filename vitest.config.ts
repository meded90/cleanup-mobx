import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "storybook-static/**", "node_modules/**"],
  },
});
