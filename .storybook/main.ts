import type { StorybookConfig } from "@storybook/react-vite";

const enableJsdocAutoGeneration = process.env.STORYBOOK_DOCS_WATCH !== "0";

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
};

export default config;
