import type { CSSProperties, ReactNode } from "react";

const frameStyle: CSSProperties = {
  display: "grid",
  fontFamily: "system-ui, sans-serif",
};

const cardStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: 10,
  maxWidth: 560,
  padding: 16,
  border: "1px solid #d6dee8",
  borderRadius: 8,
  background: "#fbfcfe",
  boxShadow: "0 1px 2px rgba(24, 39, 75, 0.06)",
  color: "#17202a",
  fontFamily: "Inter, system-ui, sans-serif",
};

const cardTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.3,
};

export const storyRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

export const storyButtonStyle: CSSProperties = {
  border: "1px solid #9fb1c5",
  borderRadius: 6,
  background: "#ffffff",
  padding: "6px 10px",
  cursor: "pointer",
};

export const storyMetricStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  minHeight: 26,
  padding: "3px 8px",
  borderRadius: 6,
  background: "#eef5ff",
  color: "#15426c",
  fontVariantNumeric: "tabular-nums",
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

export function StoryCard(props: { children: ReactNode; title: string }) {
  return (
    <section style={cardStyle}>
      <h3 style={cardTitleStyle}>{props.title}</h3>
      {props.children}
    </section>
  );
}
