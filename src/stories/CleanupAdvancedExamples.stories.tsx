import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { logAndAction } from "../../.storybook/utils/logAndAction";
import {
  cleanupDocumentEventListener,
  cleanupEventListener,
  cleanupIdleCallback,
  cleanupInterval,
  cleanupRequestAnimationFrame,
  cleanupSelectorEventListener,
  cleanupTimeout,
  cleanupWindowEventListener,
} from "../index";
import { StoryExample, storySource } from "./storySource";

import type { Meta, StoryObj } from "@storybook/react-vite";

type SearchItem = {
  id: string;
  label: string;
  group: string;
};

type FeedProfile = {
  id: string;
  title: string;
  latencyMs: number;
};

const logAdvancedExample = logAndAction("advanced example log");

const exampleStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: 10,
  maxWidth: 520,
  padding: 16,
  border: "1px solid #d6dee8",
  borderRadius: 8,
  background: "#fbfcfe",
  boxShadow: "0 1px 2px rgba(24, 39, 75, 0.06)",
  color: "#17202a",
  fontFamily: "Inter, system-ui, sans-serif",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.3,
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
};

const buttonStyle: CSSProperties = {
  border: "1px solid #9fb1c5",
  borderRadius: 6,
  background: "#ffffff",
  padding: "6px 10px",
  cursor: "pointer",
};

const metricStyle: CSSProperties = {
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

function pushLog(setter: (updater: (value: string[]) => string[]) => void, message: string): void {
  logAdvancedExample(message);
  setter((value) => [message, ...value].slice(0, 5));
}

function LogList(props: { items: string[] }) {
  if (props.items.length === 0) {
    return <span style={{ color: "#667085" }}>No events yet</span>;
  }

  return (
    <ol style={{ margin: 0, paddingLeft: 18 }}>
      {props.items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ol>
  );
}

//region Debounced command search

const searchCatalog: SearchItem[] = [
  { id: "rx-1", label: "Ion drift alert", group: "Space weather" },
  { id: "rx-2", label: "Decoder warm start", group: "Decoder" },
  { id: "tx-1", label: "Tower handover", group: "Tower" },
  { id: "pa-1", label: "PA cooldown window", group: "Power" },
  { id: "rx-3", label: "Propagation ionogram", group: "Space weather" },
];

function DebouncedCommandSearchExample() {
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("Idle");
  const [results, setResults] = useState<SearchItem[]>(searchCatalog.slice(0, 2));

  useEffect(() => {
    if (!query.trim()) {
      setSearchStatus("Idle");
      setResults(searchCatalog.slice(0, 2));
      return;
    }

    setSearchStatus("Debouncing input");
    return cleanupTimeout(() => {
      const normalizedQuery = query.toLowerCase();
      setResults(
        searchCatalog.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
      );
      setSearchStatus(`Applied "${query}"`);
    }, "250ms");
  }, [query]);

  return (
    <section style={exampleStyle}>
      <h3 style={titleStyle}>Debounced command search</h3>
      <input
        aria-label="Search commands"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Type ion"
        style={{ padding: 8, border: "1px solid #b8c4d2", borderRadius: 6 }}
      />
      <span data-testid="search-status" style={metricStyle}>
        {searchStatus}
      </span>
      <ul style={{ margin: 0, paddingLeft: 18 }} data-testid="search-results">
        {results.map((item) => (
          <li key={item.id}>
            {item.label} <small>({item.group})</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

const debouncedCommandSearchSource = `
const searchCatalog = [
  { id: "rx-1", label: "Ion drift alert", group: "Space weather" },
  { id: "rx-2", label: "Decoder warm start", group: "Decoder" },
  { id: "tx-1", label: "Tower handover", group: "Tower" },
  { id: "pa-1", label: "PA cooldown window", group: "Power" },
  { id: "rx-3", label: "Propagation ionogram", group: "Space weather" },
];

function DebouncedCommandSearchExample() {
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("Idle");
  const [results, setResults] = useState(searchCatalog.slice(0, 2));

  useEffect(() => {
    if (!query.trim()) {
      setSearchStatus("Idle");
      setResults(searchCatalog.slice(0, 2));
      return;
    }

    setSearchStatus("Debouncing input");
    return cleanupTimeout(() => {
      const normalizedQuery = query.toLowerCase();
      setResults(
        searchCatalog.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
      );
      setSearchStatus('Applied "' + query + '"');
    }, "250ms");
  }, [query]);

  return (
    <section>
      <input
        aria-label="Search commands"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <span>{searchStatus}</span>
      <ul>{results.map((item) => <li key={item.id}>{item.label}</li>)}</ul>
    </section>
  );
}
`;

const meta = {
  title: "Example/Advanced Examples",
  component: DebouncedCommandSearchExample,
} satisfies Meta<typeof DebouncedCommandSearchExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DebouncedCommandSearch: Story = {
  render: () => (
    <StoryExample>
      <DebouncedCommandSearchExample />
    </StoryExample>
  ),
  parameters: storySource(debouncedCommandSearchSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("cleans previous timeout and applies the last query", async () => {
      const input = canvas.getByLabelText("Search commands");
      await userEvent.clear(input);
      await userEvent.type(input, "ion");
      await expect(canvas.getByTestId("search-status")).toHaveTextContent("Debouncing input");
      await waitFor(() =>
        expect(canvas.getByTestId("search-status")).toHaveTextContent('Applied "ion"'),
      );
      await expect(canvas.getByTestId("search-results")).toHaveTextContent("Ion drift alert");
    });
  },
};

//endregion

//region Switchable telemetry interval

const feedProfiles: FeedProfile[] = [
  { id: "alpha", title: "Alpha telemetry", latencyMs: 90 },
  { id: "beta", title: "Beta telemetry", latencyMs: 140 },
];

const fallbackFeedProfile: FeedProfile = {
  id: "fallback",
  title: "Fallback telemetry",
  latencyMs: 120,
};

function getFeedProfile(index: number): FeedProfile {
  return feedProfiles[index] ?? fallbackFeedProfile;
}

function SwitchableTelemetryIntervalExample() {
  const [feedRunning, setFeedRunning] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);
  const [feedTick, setFeedTick] = useState(0);
  const [feedLog, setFeedLog] = useState<string[]>([]);

  useEffect(() => {
    if (!feedRunning) {
      return;
    }

    const profile = getFeedProfile(feedIndex);
    pushLog(setFeedLog, `opened ${profile.title}`);

    return cleanupInterval(() => {
      setFeedTick((value) => value + 1);
      pushLog(setFeedLog, `packet from ${profile.id} after ${profile.latencyMs}ms`);
    }, "180ms");
  }, [feedIndex, feedRunning]);

  const activeFeedProfile = getFeedProfile(feedIndex);

  return (
    <section style={exampleStyle}>
      <h3 style={titleStyle}>Switchable telemetry interval</h3>
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={() => setFeedRunning((value) => !value)}>
          {feedRunning ? "Stop feed" : "Start feed"}
        </button>
        <button
          style={buttonStyle}
          type="button"
          onClick={() => setFeedIndex((value) => (value + 1) % 2)}
        >
          Switch channel
        </button>
      </div>
      <span data-testid="feed-channel" style={metricStyle}>
        {activeFeedProfile.title}
      </span>
      <span data-testid="feed-ticks">Packets: {feedTick}</span>
      <LogList items={feedLog} />
    </section>
  );
}

const switchableTelemetryIntervalSource = `
const feedProfiles = [
  { id: "alpha", title: "Alpha telemetry", latencyMs: 90 },
  { id: "beta", title: "Beta telemetry", latencyMs: 140 },
];

function SwitchableTelemetryIntervalExample() {
  const [feedRunning, setFeedRunning] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);
  const [feedTick, setFeedTick] = useState(0);
  const [feedLog, setFeedLog] = useState<string[]>([]);

  useEffect(() => {
    if (!feedRunning) {
      return;
    }

    const profile = feedProfiles[feedIndex];
    pushLog(setFeedLog, "opened " + profile.title);

    return cleanupInterval(() => {
      setFeedTick((value) => value + 1);
      pushLog(setFeedLog, "packet from " + profile.id);
    }, "180ms");
  }, [feedIndex, feedRunning]);

  return (
    <section>
      <button type="button" onClick={() => setFeedRunning((value) => !value)}>
        {feedRunning ? "Stop feed" : "Start feed"}
      </button>
      <button type="button" onClick={() => setFeedIndex((value) => (value + 1) % 2)}>
        Switch channel
      </button>
      <span>Packets: {feedTick}</span>
      <LogList items={feedLog} />
    </section>
  );
}
`;

export const SwitchableTelemetryInterval: Story = {
  render: () => (
    <StoryExample>
      <SwitchableTelemetryIntervalExample />
    </StoryExample>
  ),
  parameters: storySource(switchableTelemetryIntervalSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("starts, switches and stops without duplicate timers", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Start feed" }));
      await waitFor(() =>
        expect(canvas.getByTestId("feed-ticks")).not.toHaveTextContent("Packets: 0"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Switch channel" }));
      await expect(canvas.getByTestId("feed-channel")).toHaveTextContent("Beta telemetry");
      await userEvent.click(canvas.getByRole("button", { name: "Stop feed" }));
    });
  },
};

//endregion

//region Request animation frame progress

function RequestAnimationFrameProgressExample() {
  const [rafRunning, setRafRunning] = useState(false);
  const [rafProgress, setRafProgress] = useState(0);
  const rafStartRef = useRef(0);

  useEffect(() => {
    if (!rafRunning) {
      return;
    }

    let disposed = false;
    let disposeFrame: (() => void) | undefined;
    rafStartRef.current = performance.now();

    const schedule = () => {
      disposeFrame = cleanupRequestAnimationFrame(() => {
        if (disposed) {
          return;
        }

        const elapsed = performance.now() - rafStartRef.current;
        setRafProgress(Math.min(100, Math.round(elapsed / 8)));

        if (elapsed < 800) {
          schedule();
        }
      });
    };

    schedule();

    return () => {
      disposed = true;
      disposeFrame?.();
    };
  }, [rafRunning]);

  return (
    <section style={exampleStyle}>
      <h3 style={titleStyle}>requestAnimationFrame progress</h3>
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={() => setRafRunning(true)}>
          Start animation
        </button>
        <button style={buttonStyle} type="button" onClick={() => setRafRunning(false)}>
          Stop animation
        </button>
      </div>
      <div style={{ height: 12, borderRadius: 6, background: "#e4eaf2", overflow: "hidden" }}>
        <div
          data-testid="raf-bar"
          style={{
            width: `${rafProgress}%`,
            height: "100%",
            background: "#2563eb",
            transition: "width 120ms linear",
          }}
        />
      </div>
      <span data-testid="raf-progress">Progress: {rafProgress}%</span>
    </section>
  );
}

const requestAnimationFrameProgressSource = `
function RequestAnimationFrameProgressExample() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!running) {
      return;
    }

    let disposed = false;
    let disposeFrame: (() => void) | undefined;
    startedAtRef.current = performance.now();

    const schedule = () => {
      disposeFrame = cleanupRequestAnimationFrame(() => {
        if (disposed) {
          return;
        }

        const elapsed = performance.now() - startedAtRef.current;
        setProgress(Math.min(100, Math.round(elapsed / 8)));

        if (elapsed < 800) {
          schedule();
        }
      });
    };

    schedule();

    return () => {
      disposed = true;
      disposeFrame?.();
    };
  }, [running]);

  return (
    <section>
      <button type="button" onClick={() => setRunning(true)}>Start animation</button>
      <button type="button" onClick={() => setRunning(false)}>Stop animation</button>
      <span>Progress: {progress}%</span>
    </section>
  );
}
`;

export const RequestAnimationFrameProgress: Story = {
  render: () => (
    <StoryExample>
      <RequestAnimationFrameProgressExample />
    </StoryExample>
  ),
  parameters: storySource(requestAnimationFrameProgressSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("updates progress through animation frames", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Start animation" }));
      await waitFor(() =>
        expect(canvas.getByTestId("raf-progress")).not.toHaveTextContent("Progress: 0%"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Stop animation" }));
    });
  },
};

//endregion

//region Idle staged preload

const idleTiles = [
  "Map tiles",
  "Decoder hints",
  "Audio presets",
  "Timeline rows",
  "Command palette",
];

function IdleStagedPreloadExample() {
  const [loadedTiles, setLoadedTiles] = useState<string[]>([]);
  const [idleStatus, setIdleStatus] = useState("Not queued");

  useEffect(() => {
    if (idleStatus !== "Queued") {
      return;
    }

    let index = 0;
    let disposeIdle: (() => void) | undefined;

    const schedule = () => {
      disposeIdle = cleanupIdleCallback(
        () => {
          const tile = idleTiles[index];

          if (tile === undefined) {
            setIdleStatus("Loaded");
            return;
          }

          setLoadedTiles((value) => [...value, tile]);
          index += 1;

          if (index < idleTiles.length) {
            schedule();
            return;
          }

          setIdleStatus("Loaded");
        },
        { timeout: 120 },
      );
    };

    schedule();

    return () => {
      disposeIdle?.();
    };
  }, [idleStatus]);

  return (
    <section style={exampleStyle}>
      <h3 style={titleStyle}>Idle staged preload</h3>
      <button
        style={buttonStyle}
        type="button"
        onClick={() => {
          setLoadedTiles([]);
          setIdleStatus("Queued");
        }}
      >
        Queue preload
      </button>
      <span data-testid="idle-status" style={metricStyle}>
        {idleStatus}
      </span>
      <span data-testid="idle-count">
        Loaded: {loadedTiles.length}/{idleTiles.length}
      </span>
      <LogList items={loadedTiles} />
    </section>
  );
}

const idleStagedPreloadSource = `
const idleTiles = [
  "Map tiles",
  "Decoder hints",
  "Audio presets",
  "Timeline rows",
  "Command palette",
];

function IdleStagedPreloadExample() {
  const [loadedTiles, setLoadedTiles] = useState<string[]>([]);
  const [idleStatus, setIdleStatus] = useState("Not queued");

  useEffect(() => {
    if (idleStatus !== "Queued") {
      return;
    }

    let index = 0;
    let disposeIdle: (() => void) | undefined;

    const schedule = () => {
      disposeIdle = cleanupIdleCallback(() => {
        const tile = idleTiles[index];

        if (tile === undefined) {
          setIdleStatus("Loaded");
          return;
        }

        setLoadedTiles((value) => [...value, tile]);
        index += 1;
        schedule();
      }, { timeout: 120 });
    };

    schedule();

    return () => {
      disposeIdle?.();
    };
  }, [idleStatus]);
}
`;

export const IdleStagedPreload: Story = {
  render: () => (
    <StoryExample>
      <IdleStagedPreloadExample />
    </StoryExample>
  ),
  parameters: storySource(idleStagedPreloadSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("loads staged work through idle callbacks", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Queue preload" }));
      await waitFor(() => expect(canvas.getByTestId("idle-status")).toHaveTextContent("Loaded"));
      await expect(canvas.getByTestId("idle-count")).toHaveTextContent("Loaded: 5/5");
    });
  },
};

//endregion

//region Element event listener with click cleanup

function ElementEventListenerWithClickCleanupExample() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [zoneClicks, setZoneClicks] = useState(0);
  const [zoneEntries, setZoneEntries] = useState(0);
  const [zoneCleanupCount, setZoneCleanupCount] = useState(0);

  useEffect(() => {
    const disposeClick = cleanupEventListener(
      "click",
      () => {
        setZoneClicks((value) => value + 1);
        return () => setZoneCleanupCount((value) => value + 1);
      },
      zoneRef,
    );
    const disposeEnter = cleanupEventListener(
      "pointerenter",
      () => {
        setZoneEntries((value) => value + 1);
      },
      zoneRef,
    );

    return () => {
      disposeClick();
      disposeEnter();
    };
  }, []);

  return (
    <section style={exampleStyle}>
      <h3 style={titleStyle}>Element event listener with per-click cleanup</h3>
      <div
        ref={zoneRef}
        role="button"
        tabIndex={0}
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: 74,
          border: "1px dashed #7b8da4",
          borderRadius: 8,
          background: "#f4f7fb",
          cursor: "pointer",
        }}
      >
        Click or hover the zone
      </div>
      <span data-testid="zone-clicks">Clicks: {zoneClicks}</span>
      <span data-testid="zone-entries">Pointer entries: {zoneEntries}</span>
      <span data-testid="zone-cleanups">Click cleanups: {zoneCleanupCount}</span>
    </section>
  );
}

const elementEventListenerWithClickCleanupSource = `
function ElementEventListenerWithClickCleanupExample() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [clicks, setClicks] = useState(0);
  const [cleanups, setCleanups] = useState(0);

  useEffect(() => {
    return cleanupEventListener(
      "click",
      () => {
        setClicks((value) => value + 1);
        return () => setCleanups((value) => value + 1);
      },
      zoneRef,
    );
  }, []);

  return (
    <section>
      <div ref={zoneRef} role="button" tabIndex={0}>Click target</div>
      <span>Clicks: {clicks}</span>
      <span>Click cleanups: {cleanups}</span>
    </section>
  );
}
`;

export const ElementEventListenerWithClickCleanup: Story = {
  render: () => (
    <StoryExample>
      <ElementEventListenerWithClickCleanupExample />
    </StoryExample>
  ),
  parameters: storySource(elementEventListenerWithClickCleanupSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("reacts to element events and runs per-click cleanup", async () => {
      await userEvent.hover(canvas.getByText("Click or hover the zone"));
      await userEvent.click(canvas.getByText("Click or hover the zone"));
      await expect(canvas.getByTestId("zone-entries")).toHaveTextContent(/Pointer entries: [1-9]/);
      await expect(canvas.getByTestId("zone-clicks")).toHaveTextContent("Clicks: 1");
    });
  },
};

//endregion

//region Window document and selector listeners

function WindowDocumentAndSelectorListenersExample() {
  const [globalArmed, setGlobalArmed] = useState(false);
  const [globalLog, setGlobalLog] = useState<string[]>([]);

  useEffect(() => {
    if (!globalArmed) {
      return;
    }

    const disposeKey = cleanupWindowEventListener("keydown", (event) => {
      if (event?.key.toLowerCase() === "k") {
        pushLog(setGlobalLog, "window key:K");
      }
    });
    const disposeVisibility = cleanupDocumentEventListener("visibilitychange", () => {
      pushLog(setGlobalLog, `document visibility:${document.visibilityState}`);
    });
    const disposeSelector = cleanupSelectorEventListener(
      "[data-cleanup-selector-target]",
      "click",
      () => {
        pushLog(setGlobalLog, "selector target clicked");
      },
    );

    return () => {
      disposeKey();
      disposeVisibility();
      disposeSelector();
      pushLog(setGlobalLog, "global listeners disposed");
    };
  }, [globalArmed]);

  return (
    <section style={exampleStyle}>
      <h3 style={titleStyle}>Window, document and selector listeners</h3>
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={() => setGlobalArmed((value) => !value)}>
          {globalArmed ? "Disarm globals" : "Arm globals"}
        </button>
        <button style={buttonStyle} type="button" data-cleanup-selector-target>
          Selector target
        </button>
      </div>
      <span data-testid="global-state" style={metricStyle}>
        {globalArmed ? "Armed" : "Disarmed"}
      </span>
      <LogList items={globalLog} />
    </section>
  );
}

const windowDocumentAndSelectorListenersSource = `
function WindowDocumentAndSelectorListenersExample() {
  const [armed, setArmed] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    if (!armed) {
      return;
    }

    const disposeKey = cleanupWindowEventListener("keydown", (event) => {
      if (event?.key.toLowerCase() === "k") {
        pushLog(setEvents, "window key:K");
      }
    });
    const disposeVisibility = cleanupDocumentEventListener("visibilitychange", () => {
      pushLog(setEvents, "document visibility changed");
    });
    const disposeSelector = cleanupSelectorEventListener(
      "[data-cleanup-selector-target]",
      "click",
      () => pushLog(setEvents, "selector target clicked"),
    );

    return () => {
      disposeKey();
      disposeVisibility();
      disposeSelector();
    };
  }, [armed]);
}
`;

export const WindowDocumentAndSelectorListeners: Story = {
  render: () => (
    <StoryExample>
      <WindowDocumentAndSelectorListenersExample />
    </StoryExample>
  ),
  parameters: storySource(windowDocumentAndSelectorListenersSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("registers window, document and selector listeners while armed", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Arm globals" }));
      await userEvent.keyboard("k");
      await userEvent.click(canvas.getByRole("button", { name: "Selector target" }));
      await waitFor(() => expect(canvas.getByText("window key:K")).toBeInTheDocument());
      await expect(canvas.getByText("selector target clicked")).toBeInTheDocument();
      await userEvent.click(canvas.getByRole("button", { name: "Disarm globals" }));
    });
  },
};

//endregion
