import { Source } from "@storybook/addon-docs/blocks";
import React from "react";
import { addons, types, useParameter } from "storybook/manager-api";

const ADDON_ID = "cleanup/source-panel";
const PANEL_ID = `${ADDON_ID}/panel`;

type DocsParameter = {
  source?: {
    code?: string;
    language?: string;
  };
};

function SourcePanel(props: { active?: boolean }) {
  const docs = useParameter<DocsParameter>("docs", {});
  const code = docs.source?.code?.trim();
  const language = (docs.source?.language ?? "tsx") as React.ComponentProps<
    typeof Source
  >["language"];

  if (!props.active) {
    return null;
  }

  if (!code) {
    return (
      <section style={emptyStyle}>
        <strong>No source code</strong>
        <span>This story does not define docs.source.code.</span>
      </section>
    );
  }

  return (
    <section className="cleanup-source-panel" style={panelStyle}>
      <style>{sourcePanelCss}</style>
      <Source code={code} copyable dark language={language} />
    </section>
  );
}

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: "Source",
    render: ({ active }) => <SourcePanel active={active} />,
  });
});

const panelStyle = {
  height: "100%",
  padding: 0,
  overflow: "auto",
  background: "#1f2329",
  boxSizing: "border-box",
} satisfies React.CSSProperties;

const sourcePanelCss = `
  .cleanup-source-panel > div {
    margin: 0 !important;
  }

  .cleanup-source-panel pre {
    margin: 0 !important;
    border-radius: 0 !important;
    padding: 8px 12px !important;
  }
`;

const emptyStyle = {
  display: "grid",
  gap: 4,
  padding: 16,
  color: "#cbd5e1",
  font: "13px/1.4 system-ui, sans-serif",
} satisfies React.CSSProperties;
