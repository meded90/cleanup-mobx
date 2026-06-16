import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
      canvas: {
        sourceState: "shown",
      },
    },
    options: {
      storySort: {
        order: ["Cleanup", "API"],
      },
    },
  },
  tags: ["autodocs"],
};

export default preview;
