import type { Preview } from "@storybook/react-vite";

const preview: Preview = {
  parameters: {
    controls: {
      disable: true,
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
