import { observable, runInAction } from "mobx";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  cleanupAutorun,
  cleanupDocumentEventListener,
  cleanupEventListener,
  cleanupIdleCallback,
  cleanupInterval,
  cleanupReaction,
  cleanupReactionList,
  cleanupReactionMap,
  cleanupReactionPrimitiveList,
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

type Job = {
  id: number;
  title: string;
  state: "queued" | "running" | "done";
};

type Channel = {
  id: string;
  title: string;
  packets: number;
};

const searchCatalog: SearchItem[] = [
  { id: "rx-1", label: "Ion drift alert", group: "Space weather" },
  { id: "rx-2", label: "Decoder warm start", group: "Decoder" },
  { id: "tx-1", label: "Tower handover", group: "Tower" },
  { id: "pa-1", label: "PA cooldown window", group: "Power" },
  { id: "rx-3", label: "Propagation ionogram", group: "Space weather" },
];

const feedProfiles: FeedProfile[] = [
  { id: "alpha", title: "Alpha telemetry", latencyMs: 90 },
  { id: "beta", title: "Beta telemetry", latencyMs: 140 },
];

const fallbackFeedProfile: FeedProfile = {
  id: "fallback",
  title: "Fallback telemetry",
  latencyMs: 120,
};

const idleTiles = [
  "Map tiles",
  "Decoder hints",
  "Audio presets",
  "Timeline rows",
  "Command palette",
];

const initialJobs: Job[] = [
  { id: 1, title: "Warm decoder", state: "queued" },
  { id: 2, title: "Open tower stream", state: "running" },
];

const initialChannels: [string, Channel][] = [
  ["rx", { id: "rx", title: "RX channel", packets: 12 }],
  ["tx", { id: "tx", title: "TX channel", packets: 8 }],
];

const initialTags = ["decoder", "timing", "telemetry"];

const surfaceStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  fontFamily: "Inter, system-ui, sans-serif",
  color: "#17202a",
};

const cardStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: 10,
  minHeight: 220,
  padding: 16,
  border: "1px solid #d6dee8",
  borderRadius: 8,
  background: "#fbfcfe",
  boxShadow: "0 1px 2px rgba(24, 39, 75, 0.06)",
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
  setter((value) => [message, ...value].slice(0, 5));
}

function getFeedProfile(index: number): FeedProfile {
  return feedProfiles[index] ?? fallbackFeedProfile;
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

function AdvancedCleanupShowcase() {
  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("Idle");
  const [results, setResults] = useState<SearchItem[]>(searchCatalog.slice(0, 2));

  const [feedRunning, setFeedRunning] = useState(false);
  const [feedIndex, setFeedIndex] = useState(0);
  const [feedTick, setFeedTick] = useState(0);
  const [feedLog, setFeedLog] = useState<string[]>([]);

  const [rafRunning, setRafRunning] = useState(false);
  const [rafProgress, setRafProgress] = useState(0);
  const rafStartRef = useRef(0);

  const [loadedTiles, setLoadedTiles] = useState<string[]>([]);
  const [idleStatus, setIdleStatus] = useState("Not queued");

  const zoneRef = useRef<HTMLDivElement>(null);
  const [zoneClicks, setZoneClicks] = useState(0);
  const [zoneEntries, setZoneEntries] = useState(0);
  const [zoneCleanupCount, setZoneCleanupCount] = useState(0);

  const [globalArmed, setGlobalArmed] = useState(false);
  const [globalLog, setGlobalLog] = useState<string[]>([]);

  const scalarStore = useMemo(
    () =>
      observable({
        link: "RX",
        load: 24,
        warning: false,
      }),
    [],
  );
  const [scalarSnapshot, setScalarSnapshot] = useState("RX:24:normal");
  const [scalarLog, setScalarLog] = useState<string[]>([]);

  const jobStore = useMemo(
    () =>
      observable({
        jobs: [...initialJobs],
      }),
    [],
  );
  const [activeJobs, setActiveJobs] = useState<number[]>([]);
  const [jobLog, setJobLog] = useState<string[]>([]);

  const channelStore = useMemo(
    () =>
      observable({
        channels: observable.map<string, Channel>(initialChannels),
      }),
    [],
  );
  const [activeChannels, setActiveChannels] = useState<string[]>([]);
  const [channelLog, setChannelLog] = useState<string[]>([]);

  const tagStore = useMemo(
    () =>
      observable({
        tags: new Set<string>(initialTags),
      }),
    [],
  );
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [tagLog, setTagLog] = useState<string[]>([]);

  const preferenceStore = useMemo(
    () =>
      observable({
        mode: "Desk",
        volume: 35,
      }),
    [],
  );
  const [preferenceSummary, setPreferenceSummary] = useState("Desk at 35%");
  const [preferenceLog, setPreferenceLog] = useState<string[]>([]);

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

  useEffect(() => {
    return cleanupReaction(
      () => `${scalarStore.link}:${scalarStore.load}:${scalarStore.warning ? "warning" : "normal"}`,
      (summary) => {
        setScalarSnapshot(summary);
        pushLog(setScalarLog, `subscribed ${summary}`);
        return () => pushLog(setScalarLog, `closed ${summary}`);
      },
    );
  }, [scalarStore]);

  useEffect(() => {
    return cleanupReactionList(
      () => jobStore.jobs,
      (job) => {
        setActiveJobs((value) => [...new Set([...value, job.id])]);
        pushLog(setJobLog, `track ${job.title}:${job.state}`);
        return (isModified) => {
          pushLog(setJobLog, `${isModified ? "refresh" : "stop"} ${job.title}`);
          if (!isModified) {
            setActiveJobs((value) => value.filter((id) => id !== job.id));
          }
        };
      },
      { getKey: (job) => job.id },
    );
  }, [jobStore]);

  useEffect(() => {
    return cleanupReactionMap(
      () => channelStore.channels,
      (channel, key) => {
        setActiveChannels((value) => [...new Set([...value, key])]);
        pushLog(setChannelLog, `listen ${channel.title}:${channel.packets}`);
        return (isModified) => {
          pushLog(setChannelLog, `${isModified ? "refresh" : "drop"} ${channel.id}`);
          if (!isModified) {
            setActiveChannels((value) => value.filter((id) => id !== key));
          }
        };
      },
      { equals: (a, b) => a?.packets === b?.packets && a?.title === b?.title },
    );
  }, [channelStore]);

  useEffect(() => {
    return cleanupReactionPrimitiveList(
      () => tagStore.tags,
      (tag) => {
        setActiveTags((value) => [...new Set([...value, tag])]);
        pushLog(setTagLog, `watch #${tag}`);
        return () => {
          setActiveTags((value) => value.filter((item) => item !== tag));
          pushLog(setTagLog, `unwatch #${tag}`);
        };
      },
    );
  }, [tagStore]);

  useEffect(() => {
    return cleanupAutorun(() => {
      const summary = `${preferenceStore.mode} at ${preferenceStore.volume}%`;
      setPreferenceSummary(summary);
      pushLog(setPreferenceLog, `apply ${summary}`);
      return () => pushLog(setPreferenceLog, `cleanup ${summary}`);
    });
  }, [preferenceStore]);

  const activeFeedProfile = getFeedProfile(feedIndex);

  return (
    <main style={surfaceStyle} data-testid="advanced-cleanup-showcase">
      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>1. Debounced command search</h3>
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
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>2. Switchable telemetry interval</h3>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            type="button"
            onClick={() => setFeedRunning((value) => !value)}
          >
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
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>3. requestAnimationFrame progress</h3>
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
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>4. Idle staged preload</h3>
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
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>5. Element event listener with per-click cleanup</h3>
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
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>6. Window, document and selector listeners</h3>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            type="button"
            onClick={() => setGlobalArmed((value) => !value)}
          >
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
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>7. Scalar MobX resource replacement</h3>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                scalarStore.load += 17;
                scalarStore.warning = scalarStore.load > 50;
              })
            }
          >
            Increase load
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                scalarStore.link = scalarStore.link === "RX" ? "TX" : "RX";
              })
            }
          >
            Toggle link
          </button>
        </div>
        <span data-testid="scalar-snapshot" style={metricStyle}>
          {scalarSnapshot}
        </span>
        <LogList items={scalarLog} />
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>8. Object list subscriptions</h3>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                jobStore.jobs = [
                  ...jobStore.jobs,
                  { id: 3, title: "Calibrate clock", state: "queued" },
                ];
              })
            }
          >
            Add job
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                jobStore.jobs = jobStore.jobs.map((job) =>
                  job.id === 2
                    ? { ...job, state: job.state === "running" ? "done" : "running" }
                    : job,
                );
              })
            }
          >
            Update job
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                jobStore.jobs = jobStore.jobs.filter((job) => job.id !== 1);
              })
            }
          >
            Remove job
          </button>
        </div>
        <span data-testid="active-jobs" style={metricStyle}>
          Active jobs: {activeJobs.length}
        </span>
        <LogList items={jobLog} />
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>9. Map keyed stream subscriptions</h3>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                channelStore.channels.set("backup", {
                  id: "backup",
                  title: "Backup channel",
                  packets: 2,
                });
              })
            }
          >
            Add channel
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                const rx = channelStore.channels.get("rx");
                if (rx) {
                  channelStore.channels.set("rx", { ...rx, packets: rx.packets + 5 });
                }
              })
            }
          >
            Update RX
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                channelStore.channels.delete("backup");
              })
            }
          >
            Drop backup
          </button>
        </div>
        <span data-testid="active-channels" style={metricStyle}>
          Active channels: {activeChannels.length}
        </span>
        <LogList items={channelLog} />
      </article>

      <article style={cardStyle} data-testid="cleanup-example">
        <h3 style={titleStyle}>10. Primitive Set watchers plus autorun settings</h3>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                tagStore.tags.add("handover");
              })
            }
          >
            Add tag
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                tagStore.tags.delete("decoder");
              })
            }
          >
            Remove decoder
          </button>
          <button
            style={buttonStyle}
            type="button"
            onClick={() =>
              runInAction(() => {
                preferenceStore.mode = preferenceStore.mode === "Desk" ? "Field" : "Desk";
                preferenceStore.volume += 5;
              })
            }
          >
            Cycle mode
          </button>
        </div>
        <span data-testid="active-tags" style={metricStyle}>
          Active tags: {activeTags.length}
        </span>
        <span data-testid="preference-summary" style={metricStyle}>
          {preferenceSummary}
        </span>
        <LogList items={[...tagLog, ...preferenceLog].slice(0, 5)} />
      </article>
    </main>
  );
}

const advancedCleanupSource = `
function AdvancedCleanupShowcase() {
  const [query, setQuery] = useState("");
  const [feedRunning, setFeedRunning] = useState(false);
  const [feedTick, setFeedTick] = useState(0);
  const zoneRef = useRef<HTMLDivElement>(null);
  const store = useMemo(() => observable({ jobs: [] as Job[] }), []);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    return cleanupTimeout(() => {
      // Applies only the latest query because the previous timeout is cleared.
      runSearch(query);
    }, "250ms");
  }, [query]);

  useEffect(() => {
    if (!feedRunning) {
      return;
    }

    return cleanupInterval(() => {
      setFeedTick((value) => value + 1);
    }, "180ms");
  }, [feedRunning]);

  useEffect(() => {
    return cleanupEventListener("click", handleZoneClick, zoneRef);
  }, []);

  useEffect(() => {
    return cleanupReactionList(
      () => store.jobs,
      (job) => subscribeToJob(job),
      { getKey: (job) => job.id },
    );
  }, [store]);
}
`;

const meta = {
  title: "Cleanup/Advanced Examples",
  component: AdvancedCleanupShowcase,
} satisfies Meta<typeof AdvancedCleanupShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TenCleanupPatterns: Story = {
  render: () => (
    <StoryExample source={advancedCleanupSource}>
      <AdvancedCleanupShowcase />
    </StoryExample>
  ),
  parameters: storySource(advancedCleanupSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("render ten diverse cleanup examples", async () => {
      await expect(canvas.getAllByTestId("cleanup-example")).toHaveLength(10);
    });

    await step(
      "debounced search cleans the previous timeout and applies the last query",
      async () => {
        const input = canvas.getByLabelText("Search commands");
        await userEvent.clear(input);
        await userEvent.type(input, "ion");
        await expect(canvas.getByTestId("search-status")).toHaveTextContent("Debouncing input");
        await waitFor(() =>
          expect(canvas.getByTestId("search-status")).toHaveTextContent('Applied "ion"'),
        );
        await expect(canvas.getByTestId("search-results")).toHaveTextContent("Ion drift alert");
      },
    );

    await step("interval feed can start and switch channels without duplicate timers", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Start feed" }));
      await waitFor(() =>
        expect(canvas.getByTestId("feed-ticks")).not.toHaveTextContent("Packets: 0"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Switch channel" }));
      await expect(canvas.getByTestId("feed-channel")).toHaveTextContent("Beta telemetry");
      await userEvent.click(canvas.getByRole("button", { name: "Stop feed" }));
    });

    await step("animation frame and idle callbacks visibly update delayed UI", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Start animation" }));
      await waitFor(() =>
        expect(canvas.getByTestId("raf-progress")).not.toHaveTextContent("Progress: 0%"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Stop animation" }));

      await userEvent.click(canvas.getByRole("button", { name: "Queue preload" }));
      await waitFor(() => expect(canvas.getByTestId("idle-status")).toHaveTextContent("Loaded"));
      await expect(canvas.getByTestId("idle-count")).toHaveTextContent("Loaded: 5/5");
    });

    await step("element, window and selector listeners react and can be cleaned", async () => {
      await userEvent.hover(canvas.getByText("Click or hover the zone"));
      await userEvent.click(canvas.getByText("Click or hover the zone"));
      await expect(canvas.getByTestId("zone-entries")).toHaveTextContent(/Pointer entries: [1-9]/);
      await expect(canvas.getByTestId("zone-clicks")).toHaveTextContent("Clicks: 1");

      await userEvent.click(canvas.getByRole("button", { name: "Arm globals" }));
      await userEvent.keyboard("k");
      await userEvent.click(canvas.getByRole("button", { name: "Selector target" }));
      await waitFor(() => expect(canvas.getByText("window key:K")).toBeInTheDocument());
      await expect(canvas.getByText("selector target clicked")).toBeInTheDocument();
      await userEvent.click(canvas.getByRole("button", { name: "Disarm globals" }));
    });

    await step(
      "MobX scalar, list, map and primitive cleanup patterns stay observable",
      async () => {
        await userEvent.click(canvas.getByRole("button", { name: "Increase load" }));
        await waitFor(() =>
          expect(canvas.getByTestId("scalar-snapshot")).toHaveTextContent("RX:41:normal"),
        );

        await userEvent.click(canvas.getByRole("button", { name: "Add job" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-jobs")).toHaveTextContent("Active jobs: 3"),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Update job" }));
        await waitFor(() =>
          expect(canvas.getByText("refresh Open tower stream")).toBeInTheDocument(),
        );

        await userEvent.click(canvas.getByRole("button", { name: "Add channel" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-channels")).toHaveTextContent("Active channels: 3"),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Drop backup" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-channels")).toHaveTextContent("Active channels: 2"),
        );

        await userEvent.click(canvas.getByRole("button", { name: "Add tag" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-tags")).toHaveTextContent("Active tags: 4"),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Remove decoder" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-tags")).toHaveTextContent("Active tags: 3"),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Cycle mode" }));
        await expect(canvas.getByTestId("preference-summary")).toHaveTextContent("Field at 40%");
      },
    );
  },
};
