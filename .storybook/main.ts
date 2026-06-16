import type { StorybookConfig } from "@storybook/react-vite";

const isStaticBuild =
  process.env.STORYBOOK_DOCS_WATCH === "0" ||
  process.env.npm_lifecycle_event === "storybook:build" ||
  process.argv.some((arg) => arg === "build");
const enableJsdocAutoGeneration = !isStaticBuild;

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    ...(enableJsdocAutoGeneration
      ? [
          {
            name: "storybook-addon-jsdoc-to-mdx",
            options: {
              folderPaths: ["./src/cleanup"],
              exclude: ["**/*.test.ts", "**/*.stories.@(js|jsx|mjs|ts|tsx)"],
              extensions: ["ts"],
            },
          },
        ]
      : []),
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    docsMode: false,
  },
  viteFinal: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@storybook/blocks": "@storybook/addon-docs/blocks",
      },
    },
  }),
};

export default config;
