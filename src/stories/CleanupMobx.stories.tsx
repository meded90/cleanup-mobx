import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { observer } from "mobx-react";
import { useMemo, useRef, useState } from "react";
import { useViewModel, useViewModelFactory, ViewModel } from "mobx-react-viewmodel";
import {
  cleanupEventListener,
  cleanupInterval,
  cleanupReaction,
  cleanupReactionList,
  cleanupRequestAnimationFrame,
} from "../index";
import { StoryExample, storySource } from "./storySource";

import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RefObject } from "react";

type Disposer = () => void;

type ScalarResourceStore = {
  link: "RX" | "TX";
  load: number;
  warning: boolean;
};

type LinkTask = {
  id: number;
  title: string;
  state: "queued" | "running" | "done";
};

type LinkTaskStore = {
  tasks: LinkTask[];
};

type ScalarResourceProps = {
  store: ScalarResourceStore;
};

type TaskSubscriptionProps = {
  store: LinkTaskStore;
};

type CanvasTelemetryProps = {
  running: boolean;
  tone: "cyan" | "amber";
};

type FeedClientProps = {
  channel: "alpha" | "beta";
};

const panelStyle = {
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
} as const;

const titleStyle = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.3,
} as const;

const rowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
} as const;

const buttonStyle = {
  border: "1px solid #9fb1c5",
  borderRadius: 6,
  background: "#ffffff",
  padding: "6px 10px",
  cursor: "pointer",
} as const;

const metricStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  minHeight: 26,
  padding: "3px 8px",
  borderRadius: 6,
  background: "#eef5ff",
  color: "#15426c",
  fontVariantNumeric: "tabular-nums",
} as const;

abstract class CleanupViewModel<P extends object> extends ViewModel<P> {
  protected addDisposer(disposer: Disposer): void {
    this.disposers.push(disposer);
  }

  dispose(): void {
    super.dispose();
    this.disposers = [];
  }
}

function pushEvent(events: string[], message: string): string[] {
  return [message, ...events].slice(0, 6);
}

function EventList(props: { items: string[] }) {
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

class ScalarResourceViewModel extends CleanupViewModel<ScalarResourceProps> {
  snapshot = "RX:24:normal";
  events: string[] = [];

  constructor(props: ScalarResourceProps) {
    super(props);
    makeObservable(this, {
      snapshot: observable,
      events: observable.shallow,
      increaseLoad: action.bound,
      toggleLink: action.bound,
    });
  }

  init(): void {
    this.addDisposer(
      cleanupReaction(
        () =>
          [
            this.props.store.link,
            this.props.store.load,
            this.props.store.warning ? "warning" : "normal",
          ].join(":"),
        (summary) => {
          this.snapshot = summary;
          this.events = pushEvent(this.events, `opened ${summary}`);
          return () => {
            this.events = pushEvent(this.events, `closed ${summary}`);
          };
        },
      ),
    );
  }

  increaseLoad(): void {
    this.props.store.load += 17;
    this.props.store.warning = this.props.store.load > 50;
  }

  toggleLink(): void {
    this.props.store.link = this.props.store.link === "RX" ? "TX" : "RX";
  }
}

const ScalarMobxResourceReplacementExample = observer(
  function ScalarMobxResourceReplacementExample() {
    const store = useMemo(
      () =>
        observable<ScalarResourceStore>({
          link: "RX",
          load: 24,
          warning: false,
        }),
      [],
    );
    const vm = useViewModel(ScalarResourceViewModel, { store });

    return (
      <section style={panelStyle}>
        <h3 style={titleStyle}>Scalar MobX resource replacement</h3>
        <div style={rowStyle}>
          <button style={buttonStyle} type="button" onClick={vm.increaseLoad}>
            Increase load
          </button>
          <button style={buttonStyle} type="button" onClick={vm.toggleLink}>
            Toggle link
          </button>
        </div>
        <span data-testid="scalar-snapshot" style={metricStyle}>
          {vm.snapshot}
        </span>
        <EventList items={vm.events} />
      </section>
    );
  },
);

class TaskSubscriptionViewModel extends CleanupViewModel<TaskSubscriptionProps> {
  activeTaskIds: number[] = [];
  events: string[] = [];

  constructor(props: TaskSubscriptionProps) {
    super(props);
    makeObservable(this, {
      activeTaskIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addTask: action.bound,
      updateTask: action.bound,
      removeTask: action.bound,
    });
  }

  init(): void {
    this.addDisposer(
      cleanupReactionList(
        () => this.props.store.tasks,
        (task) => {
          this.activeTaskIds = [...new Set([...this.activeTaskIds, task.id])];
          this.events = pushEvent(this.events, `open ${task.title}:${task.state}`);
          return (isModified) => {
            this.events = pushEvent(
              this.events,
              `${isModified ? "refresh" : "close"} ${task.title}`,
            );
            if (!isModified) {
              this.activeTaskIds = this.activeTaskIds.filter((id) => id !== task.id);
            }
          };
        },
        { getKey: (task) => task.id },
      ),
    );
  }

  get activeLabel(): string {
    return `Active tasks: ${this.activeTaskIds.length}`;
  }

  addTask(): void {
    this.props.store.tasks = [
      ...this.props.store.tasks,
      { id: 3, title: "Calibrate link", state: "queued" },
    ];
  }

  updateTask(): void {
    this.props.store.tasks = this.props.store.tasks.map((task) =>
      task.id === 2 ? { ...task, state: "done" } : task,
    );
  }

  removeTask(): void {
    this.props.store.tasks = this.props.store.tasks.filter((task) => task.id !== 1);
  }
}

const ViewModelListSubscriptionsExample = observer(function ViewModelListSubscriptionsExample() {
  const store = useMemo(
    () =>
      observable<LinkTaskStore>({
        tasks: [
          { id: 1, title: "Warm decoder", state: "queued" },
          { id: 2, title: "Open tower stream", state: "running" },
        ],
      }),
    [],
  );
  const vm = useViewModel(TaskSubscriptionViewModel, { store });

  return (
    <section style={panelStyle}>
      <h3 style={titleStyle}>ViewModel list subscriptions</h3>
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={vm.addTask}>
          Add task
        </button>
        <button style={buttonStyle} type="button" onClick={vm.updateTask}>
          Update task
        </button>
        <button style={buttonStyle} type="button" onClick={vm.removeTask}>
          Remove task
        </button>
      </div>
      <span data-testid="active-tasks" style={metricStyle}>
        {vm.activeLabel}
      </span>
      <EventList items={vm.events} />
    </section>
  );
});

class CanvasTelemetryViewModel extends CleanupViewModel<CanvasTelemetryProps> {
  frames = 0;
  pointer = "outside";
  private disposeFrame: Disposer | null = null;

  constructor(
    props: CanvasTelemetryProps,
    private canvasRef: RefObject<HTMLCanvasElement | null>,
  ) {
    super(props);
    makeObservable(this, {
      frames: observable,
      pointer: observable,
      status: computed,
    });
  }

  init(): void {
    this.addDisposer(
      cleanupEventListener(
        "pointermove",
        (event: PointerEvent) => {
          this.pointer = `${Math.round(event.offsetX)},${Math.round(event.offsetY)}`;
          this.scheduleDraw();
        },
        this.canvasRef,
      ),
    );

    this.addDisposer(
      cleanupReaction(
        () => ({ running: this.props.running, tone: this.props.tone }),
        ({ running }) => {
          this.scheduleDraw();
          if (!running) {
            return;
          }

          return cleanupInterval(() => {
            runInAction(() => {
              this.frames += 1;
            });
            this.scheduleDraw();
          }, "180ms");
        },
      ),
    );
  }

  get status(): string {
    return `${this.props.running ? "Running" : "Paused"} / ${this.frames} frames`;
  }

  private scheduleDraw(): void {
    this.disposeFrame?.();
    this.disposeFrame = cleanupRequestAnimationFrame(() => {
      this.disposeFrame = null;
      this.draw();
    });
  }

  private draw(): void {
    const canvas = this.canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 120;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);
    context.fillStyle = this.props.tone === "cyan" ? "#d9f7f4" : "#fff4d6";
    context.fillRect(0, 0, width, height);
    context.fillStyle = this.props.tone === "cyan" ? "#08766f" : "#8a4b00";
    context.fillRect(12, 12, Math.min(width - 24, 24 + this.frames * 8), 18);
    context.fillStyle = "#17202a";
    context.font = "13px system-ui";
    context.fillText(`pointer ${this.pointer}`, 12, height - 16);
  }

  dispose(): void {
    this.disposeFrame?.();
    this.disposeFrame = null;
    super.dispose();
  }
}

const CanvasRefLifecycleExample = observer(function CanvasRefLifecycleExample() {
  const [running, setRunning] = useState(false);
  const [tone, setTone] = useState<CanvasTelemetryProps["tone"]>("cyan");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vm = useViewModel(CanvasTelemetryViewModel, { running, tone }, [canvasRef]);

  return (
    <section style={panelStyle}>
      <h3 style={titleStyle}>Canvas ref lifecycle</h3>
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={() => setRunning((value) => !value)}>
          {running ? "Pause" : "Run"}
        </button>
        <button
          style={buttonStyle}
          type="button"
          onClick={() => setTone((value) => (value === "cyan" ? "amber" : "cyan"))}
        >
          Toggle tone
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: 120,
          border: "1px solid #b8c4d2",
          borderRadius: 6,
        }}
      />
      <span data-testid="canvas-status" style={metricStyle}>
        {vm.status}
      </span>
    </section>
  );
});

class StableFeedClientViewModel extends CleanupViewModel<FeedClientProps> {
  packets = 0;
  events: string[] = [];

  constructor(
    props: FeedClientProps,
    private readonly clientId: string,
  ) {
    super(props);
    makeObservable(this, {
      packets: observable,
      events: observable.shallow,
      label: computed,
    });
  }

  init(): void {
    this.addDisposer(
      cleanupReaction(
        () => this.props.channel,
        (channel) => {
          this.events = pushEvent(this.events, `connect ${this.clientId}:${channel}`);
          return cleanupInterval(() => {
            runInAction(() => {
              this.packets += channel === "alpha" ? 1 : 2;
            });
          }, "220ms");
        },
      ),
    );
  }

  get label(): string {
    return `${this.clientId}:${this.props.channel} packets ${this.packets}`;
  }
}

const FactoryStableClientExample = observer(function FactoryStableClientExample() {
  const [channel, setChannel] = useState<FeedClientProps["channel"]>("alpha");
  const vm = useViewModelFactory(
    (props?: FeedClientProps) =>
      new StableFeedClientViewModel(props ?? { channel: "alpha" }, "waterfall-feed"),
    { channel },
  );

  return (
    <section style={panelStyle}>
      <h3 style={titleStyle}>Factory stable client</h3>
      <div style={rowStyle}>
        <button
          style={buttonStyle}
          type="button"
          onClick={() => setChannel((value) => (value === "alpha" ? "beta" : "alpha"))}
        >
          Switch channel
        </button>
      </div>
      <span data-testid="feed-client-label" style={metricStyle}>
        {vm.label}
      </span>
      <EventList items={vm.events} />
    </section>
  );
});

const scalarMobxResourceReplacementSource = `
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { useViewModel, ViewModel } from "mobx-react-viewmodel";
import { cleanupReaction } from "@meded90/cleanup";

class CleanupViewModel<P extends object> extends ViewModel<P> {
  protected addDisposer(disposer: () => void) {
    this.disposers.push(disposer);
  }

  dispose() {
    super.dispose();
    this.disposers = [];
  }
}

class ScalarResourceViewModel extends CleanupViewModel<{ store: ScalarResourceStore }> {
  snapshot = "RX:24:normal";
  events: string[] = [];

  constructor(props: { store: ScalarResourceStore }) {
    super(props);
    makeObservable(this, {
      snapshot: observable,
      events: observable.shallow,
      increaseLoad: action.bound,
      toggleLink: action.bound,
    });
  }

  init() {
    this.addDisposer(
      cleanupReaction(
        () => [
          this.props.store.link,
          this.props.store.load,
          this.props.store.warning ? "warning" : "normal",
        ].join(":"),
        (summary) => {
          this.snapshot = summary;
          this.events = [\`opened \${summary}\`, ...this.events].slice(0, 6);
          return () => {
            this.events = [\`closed \${summary}\`, ...this.events].slice(0, 6);
          };
        },
      ),
    );
  }

  increaseLoad() {
    this.props.store.load += 17;
    this.props.store.warning = this.props.store.load > 50;
  }

  toggleLink() {
    this.props.store.link = this.props.store.link === "RX" ? "TX" : "RX";
  }
}

const ScalarMobxResourceReplacementExample = observer(function Example() {
  const store = useMemo(
    () => observable({ link: "RX", load: 24, warning: false }),
    [],
  );
  const vm = useViewModel(ScalarResourceViewModel, { store });

  return (
    <section>
      <button onClick={vm.increaseLoad}>Increase load</button>
      <button onClick={vm.toggleLink}>Toggle link</button>
      <span>{vm.snapshot}</span>
      <ol>{vm.events.map((event) => <li key={event}>{event}</li>)}</ol>
    </section>
  );
});
`;

const viewModelListSubscriptionsSource = `
class TaskSubscriptionViewModel extends CleanupViewModel<{ store: LinkTaskStore }> {
  activeTaskIds: number[] = [];
  events: string[] = [];

  constructor(props: { store: LinkTaskStore }) {
    super(props);
    makeObservable(this, {
      activeTaskIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addTask: action.bound,
      updateTask: action.bound,
      removeTask: action.bound,
    });
  }

  init() {
    this.addDisposer(
      cleanupReactionList(
        () => this.props.store.tasks,
        (task) => {
          this.activeTaskIds = [...new Set([...this.activeTaskIds, task.id])];
          this.events = [\`open \${task.title}:\${task.state}\`, ...this.events].slice(0, 6);
          return (isModified) => {
            this.events = [
              \`\${isModified ? "refresh" : "close"} \${task.title}\`,
              ...this.events,
            ].slice(0, 6);
            if (!isModified) {
              this.activeTaskIds = this.activeTaskIds.filter((id) => id !== task.id);
            }
          };
        },
        { getKey: (task) => task.id },
      ),
    );
  }

  get activeLabel() {
    return \`Active tasks: \${this.activeTaskIds.length}\`;
  }
}

const Example = observer(function Example() {
  const store = useMemo(() => observable({
    tasks: [
      { id: 1, title: "Warm decoder", state: "queued" },
      { id: 2, title: "Open tower stream", state: "running" },
    ],
  }), []);
  const vm = useViewModel(TaskSubscriptionViewModel, { store });

  return (
    <section>
      <button onClick={vm.addTask}>Add task</button>
      <button onClick={vm.updateTask}>Update task</button>
      <button onClick={vm.removeTask}>Remove task</button>
      <span>{vm.activeLabel}</span>
      <ol>{vm.events.map((event) => <li key={event}>{event}</li>)}</ol>
    </section>
  );
});
`;

const canvasRefLifecycleSource = `
class CanvasTelemetryViewModel extends CleanupViewModel<CanvasTelemetryProps> {
  frames = 0;
  pointer = "outside";
  private disposeFrame: (() => void) | null = null;

  constructor(
    props: CanvasTelemetryProps,
    private canvasRef: RefObject<HTMLCanvasElement | null>,
  ) {
    super(props);
    makeObservable(this, {
      frames: observable,
      pointer: observable,
      status: computed,
    });
  }

  init() {
    this.addDisposer(
      cleanupEventListener(
        "pointermove",
        (event: PointerEvent) => {
          this.pointer = \`\${Math.round(event.offsetX)},\${Math.round(event.offsetY)}\`;
          this.scheduleDraw();
        },
        this.canvasRef,
      ),
    );

    this.addDisposer(
      cleanupReaction(
        () => ({ running: this.props.running, tone: this.props.tone }),
        ({ running }) => {
          this.scheduleDraw();
          if (!running) return;

          return cleanupInterval(() => {
            runInAction(() => {
              this.frames += 1;
            });
            this.scheduleDraw();
          }, "180ms");
        },
      ),
    );
  }

  get status() {
    return \`\${this.props.running ? "Running" : "Paused"} / \${this.frames} frames\`;
  }

  private scheduleDraw() {
    this.disposeFrame?.();
    this.disposeFrame = cleanupRequestAnimationFrame(() => {
      this.disposeFrame = null;
      this.draw();
    });
  }
}

const Example = observer(function Example() {
  const [running, setRunning] = useState(false);
  const [tone, setTone] = useState<"cyan" | "amber">("cyan");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vm = useViewModel(CanvasTelemetryViewModel, { running, tone }, [canvasRef]);

  return (
    <section>
      <button onClick={() => setRunning((value) => !value)}>
        {running ? "Pause" : "Run"}
      </button>
      <button onClick={() => setTone((value) => (value === "cyan" ? "amber" : "cyan"))}>
        Toggle tone
      </button>
      <canvas ref={canvasRef} />
      <span>{vm.status}</span>
    </section>
  );
});
`;

const factoryStableClientSource = `
class StableFeedClientViewModel extends CleanupViewModel<{ channel: "alpha" | "beta" }> {
  packets = 0;
  events: string[] = [];

  constructor(
    props: { channel: "alpha" | "beta" },
    private readonly clientId: string,
  ) {
    super(props);
    makeObservable(this, {
      packets: observable,
      events: observable.shallow,
      label: computed,
    });
  }

  init() {
    this.addDisposer(
      cleanupReaction(
        () => this.props.channel,
        (channel) => {
          this.events = [\`connect \${this.clientId}:\${channel}\`, ...this.events].slice(0, 6);
          return cleanupInterval(() => {
            runInAction(() => {
              this.packets += channel === "alpha" ? 1 : 2;
            });
          }, "220ms");
        },
      ),
    );
  }

  get label() {
    return \`\${this.clientId}:\${this.props.channel} packets \${this.packets}\`;
  }
}

const Example = observer(function Example() {
  const [channel, setChannel] = useState<"alpha" | "beta">("alpha");
  const vm = useViewModelFactory(
    (props) => new StableFeedClientViewModel(props ?? { channel: "alpha" }, "waterfall-feed"),
    { channel },
  );

  return (
    <section>
      <button onClick={() => setChannel((value) => (value === "alpha" ? "beta" : "alpha"))}>
        Switch channel
      </button>
      <span>{vm.label}</span>
      <ol>{vm.events.map((event) => <li key={event}>{event}</li>)}</ol>
    </section>
  );
});
`;

const meta = {
  title: "Example/MobX",
  component: ScalarMobxResourceReplacementExample,
} satisfies Meta<typeof ScalarMobxResourceReplacementExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ScalarMobxResourceReplacement: Story = {
  render: () => (
    <StoryExample>
      <ScalarMobxResourceReplacementExample />
    </StoryExample>
  ),
  parameters: storySource(scalarMobxResourceReplacementSource),
  play: async ({ canvasElement, step }) => {
    const { expect, userEvent, waitFor, within } = await import("storybook/test");
    const canvas = within(canvasElement);

    await step("replaces scalar resource subscriptions on observable changes", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Increase load" }));
      await waitFor(() =>
        expect(canvas.getByTestId("scalar-snapshot")).toHaveTextContent("RX:41:normal"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Toggle link" }));
      await expect(canvas.getByTestId("scalar-snapshot")).toHaveTextContent("TX:41:normal");
    });
  },
};

export const ViewModelListSubscriptions: Story = {
  render: () => (
    <StoryExample>
      <ViewModelListSubscriptionsExample />
    </StoryExample>
  ),
  parameters: storySource(viewModelListSubscriptionsSource),
  play: async ({ canvasElement, step }) => {
    const { expect, userEvent, waitFor, within } = await import("storybook/test");
    const canvas = within(canvasElement);

    await step("tracks added, updated and removed tasks inside the view model", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Add task" }));
      await waitFor(() =>
        expect(canvas.getByTestId("active-tasks")).toHaveTextContent("Active tasks: 3"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Update task" }));
      await waitFor(() =>
        expect(canvas.getByText("refresh Open tower stream")).toBeInTheDocument(),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Remove task" }));
      await waitFor(() =>
        expect(canvas.getByTestId("active-tasks")).toHaveTextContent("Active tasks: 2"),
      );
    });
  },
};

export const CanvasRefLifecycle: Story = {
  render: () => (
    <StoryExample>
      <CanvasRefLifecycleExample />
    </StoryExample>
  ),
  parameters: storySource(canvasRefLifecycleSource),
  play: async ({ canvasElement, step }) => {
    const { expect, userEvent, waitFor, within } = await import("storybook/test");
    const canvas = within(canvasElement);

    await step("starts and stops a canvas VM with ref-bound cleanup", async () => {
      await userEvent.click(canvas.getByRole("button", { name: "Run" }));
      await waitFor(() =>
        expect(canvas.getByTestId("canvas-status")).toHaveTextContent(/Running \/ [1-9]/),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Pause" }));
      await waitFor(() => expect(canvas.getByTestId("canvas-status")).toHaveTextContent("Paused"));
    });
  },
};

export const FactoryStableClient: Story = {
  render: () => (
    <StoryExample>
      <FactoryStableClientExample />
    </StoryExample>
  ),
  parameters: storySource(factoryStableClientSource),
  play: async ({ canvasElement, step }) => {
    const { expect, userEvent, waitFor, within } = await import("storybook/test");
    const canvas = within(canvasElement);

    await step("keeps the factory-created client while replacing the channel effect", async () => {
      await waitFor(() =>
        expect(canvas.getByTestId("feed-client-label")).toHaveTextContent(/alpha packets [1-9]/),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Switch channel" }));
      await waitFor(() =>
        expect(canvas.getByTestId("feed-client-label")).toHaveTextContent("waterfall-feed:beta"),
      );
    });
  },
};
