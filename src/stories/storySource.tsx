import type { CSSProperties, ReactNode } from "react";

const frameStyle: CSSProperties = {
  display: "grid",
  fontFamily: "system-ui, sans-serif",
};

export function storySource(code: string) {
  return {
    docs: {
      source: {
        code: code.trim(),
        language: "tsx",
      },
    },
  } as const;
}

export function StoryExample(props: { children: ReactNode }) {
  return <div style={frameStyle}>{props.children}</div>;
}
