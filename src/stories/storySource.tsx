import type { CSSProperties, ReactNode } from "react";

const frameStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  fontFamily: "system-ui, sans-serif",
};

const sourceStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const summaryStyle: CSSProperties = {
  cursor: "pointer",
  fontWeight: 600,
};

const preStyle: CSSProperties = {
  maxHeight: 420,
  margin: 0,
  overflow: "auto",
  padding: 12,
  border: "1px solid #d6dee8",
  borderRadius: 8,
  background: "#111827",
  color: "#f8fafc",
  fontSize: 13,
  lineHeight: 1.5,
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

export function StoryExample(props: { children: ReactNode; source: string }) {
  return (
    <div style={frameStyle}>
      {props.children}
      <details open style={sourceStyle}>
        <summary style={summaryStyle}>Source code</summary>
        <pre style={preStyle}>
          <code>{props.source.trim()}</code>
        </pre>
      </details>
    </div>
  );
}
