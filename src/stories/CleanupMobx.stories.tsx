import { action, computed, makeObservable, observable, runInAction, untracked } from "mobx";
import { observer } from "mobx-react";
import { useMemo, useRef, useState } from "react";
import { useViewModel, useViewModelFactory } from "mobx-react-viewmodel";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  cleanupEventListener,
  cleanupAutorun,
  cleanupInterval,
  cleanupReaction,
  cleanupReactionList,
  cleanupReactionMap,
  cleanupReactionPrimitiveList,
  cleanupRequestAnimationFrame,
} from "../index";
import {
  StoryCard,
  StoryExample,
  storyButtonStyle as buttonStyle,
  storyMetricStyle as metricStyle,
  storyRowStyle as rowStyle,
  storySource,
} from "./storySource";

import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ObservableMap } from "mobx";
import type { RefObject } from "react";

type Disposer = () => void;

function pushEvent(events: string[], message: string): string[] {
  return [message, ...events].slice(0, 6);
}

abstract class CleanupViewModel<P extends object> {
  props: P;
  protected disposers: Disposer[] = [];

  constructor(props: P) {
    this.props = props;
    makeObservable(this, {
      props: observable.ref,
    });
  }

  init?(): void;

  dispose(): void {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
  }
}

const cleanupViewModelSource = `
class CleanupViewModel<P extends object> {
  props: P;
  protected disposers: (() => void)[] = [];

  constructor(props: P) {
    this.props = props;
    makeObservable(this, {
      props: observable.ref,
    });
  }

  dispose() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
  }
}
`;

function cleanupMobxStorySource(code: string) {
  return storySource(`${cleanupViewModelSource}\n${code}`);
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

//region Scalar MobX resource replacement

type ScalarResourceStore = {
  link: "RX" | "TX";
  load: number;
  warning: boolean;
};

type ScalarResourceProps = {
  store: ScalarResourceStore;
};

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
    this.disposers.push(
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
      <StoryCard title="Scalar MobX resource replacement">
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
      </StoryCard>
    );
  },
);

const scalarMobxResourceReplacementSource = `
import { action, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { useViewModel } from "mobx-react-viewmodel";
import { cleanupReaction } from "@meded90/cleanup";

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
    this.disposers.push(
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
  parameters: cleanupMobxStorySource(scalarMobxResourceReplacementSource),
  play: async ({ canvasElement, step }) => {
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

//endregion

//region ViewModel list subscriptions

type LinkTask = {
  id: number;
  title: string;
  state: "queued" | "running" | "done";
};

type LinkTaskStore = {
  tasks: LinkTask[];
};

type TaskSubscriptionProps = {
  store: LinkTaskStore;
};

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
    this.disposers.push(
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
    <StoryCard title="ViewModel list subscriptions">
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
    </StoryCard>
  );
});

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
    this.disposers.push(
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

export const ViewModelListSubscriptions: Story = {
  render: () => (
    <StoryExample>
      <ViewModelListSubscriptionsExample />
    </StoryExample>
  ),
  parameters: cleanupMobxStorySource(viewModelListSubscriptionsSource),
  play: async ({ canvasElement, step }) => {
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

//endregion

//region Object list subscriptions

type JobState = "queued" | "running" | "done";

type Job = {
  id: number;
  title: string;
  state: JobState;
};

type JobStore = {
  jobs: Job[];
};

type JobSubscriptionProps = {
  store: JobStore;
};

const initialJobs: Job[] = [
  { id: 1, title: "Warm decoder", state: "queued" },
  { id: 2, title: "Open tower stream", state: "running" },
];

class ObjectListSubscriptionViewModel extends CleanupViewModel<JobSubscriptionProps> {
  activeJobIds: number[] = [];
  events: string[] = [];

  constructor(props: JobSubscriptionProps) {
    super(props);
    makeObservable(this, {
      activeJobIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addJob: action.bound,
      updateJob: action.bound,
      removeJob: action.bound,
    });
  }

  init(): void {
    this.disposers.push(
      cleanupReactionList(
        () => this.props.store.jobs,
        (job) => {
          this.activeJobIds = [...new Set([...this.activeJobIds, job.id])];
          this.events = pushEvent(this.events, `track ${job.title}:${job.state}`);
          return (isModified) => {
            this.events = pushEvent(this.events, `${isModified ? "refresh" : "stop"} ${job.title}`);
            if (!isModified) {
              this.activeJobIds = this.activeJobIds.filter((id) => id !== job.id);
            }
          };
        },
        { getKey: (job) => job.id },
      ),
    );
  }

  get activeLabel(): string {
    return `Active jobs: ${this.activeJobIds.length}`;
  }

  addJob(): void {
    this.props.store.jobs = [
      ...this.props.store.jobs,
      { id: 3, title: "Calibrate clock", state: "queued" },
    ];
  }

  updateJob(): void {
    this.props.store.jobs = this.props.store.jobs.map((job) =>
      job.id === 2 ? { ...job, state: job.state === "running" ? "done" : "running" } : job,
    );
  }

  removeJob(): void {
    this.props.store.jobs = this.props.store.jobs.filter((job) => job.id !== 1);
  }
}

const ObjectListSubscriptionsExample = observer(function ObjectListSubscriptionsExample() {
  const store = useMemo(
    () =>
      observable<JobStore>({
        jobs: [...initialJobs],
      }),
    [],
  );
  const vm = useViewModel(ObjectListSubscriptionViewModel, { store });

  return (
    <StoryCard title="Object list subscriptions">
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={vm.addJob}>
          Add job
        </button>
        <button style={buttonStyle} type="button" onClick={vm.updateJob}>
          Update job
        </button>
        <button style={buttonStyle} type="button" onClick={vm.removeJob}>
          Remove job
        </button>
      </div>
      <span data-testid="active-jobs" style={metricStyle}>
        {vm.activeLabel}
      </span>
      <EventList items={vm.events} />
    </StoryCard>
  );
});

const objectListSubscriptionsSource = `
class ObjectListSubscriptionViewModel extends CleanupViewModel<{ store: JobStore }> {
  activeJobIds: number[] = [];
  events: string[] = [];

  constructor(props: { store: JobStore }) {
    super(props);
    makeObservable(this, {
      activeJobIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addJob: action.bound,
      updateJob: action.bound,
      removeJob: action.bound,
    });
  }

  init() {
    this.disposers.push(
      cleanupReactionList(
        () => this.props.store.jobs,
        (job) => {
          this.activeJobIds = [...new Set([...this.activeJobIds, job.id])];
          this.events = [\`track \${job.title}:\${job.state}\`, ...this.events].slice(0, 6);
          return (isModified) => {
            this.events = [
              \`\${isModified ? "refresh" : "stop"} \${job.title}\`,
              ...this.events,
            ].slice(0, 6);
            if (!isModified) {
              this.activeJobIds = this.activeJobIds.filter((id) => id !== job.id);
            }
          };
        },
        { getKey: (job) => job.id },
      ),
    );
  }

  get activeLabel() {
    return \`Active jobs: \${this.activeJobIds.length}\`;
  }
}

const Example = observer(function Example() {
  const store = useMemo(() => observable({
    jobs: [
      { id: 1, title: "Warm decoder", state: "queued" },
      { id: 2, title: "Open tower stream", state: "running" },
    ],
  }), []);
  const vm = useViewModel(ObjectListSubscriptionViewModel, { store });

  return (
    <section>
      <button onClick={vm.addJob}>Add job</button>
      <button onClick={vm.updateJob}>Update job</button>
      <button onClick={vm.removeJob}>Remove job</button>
      <span>{vm.activeLabel}</span>
      <ol>{vm.events.map((event) => <li key={event}>{event}</li>)}</ol>
    </section>
  );
});
`;

export const ObjectListSubscriptions: Story = {
  render: () => (
    <StoryExample>
      <ObjectListSubscriptionsExample />
    </StoryExample>
  ),
  parameters: cleanupMobxStorySource(objectListSubscriptionsSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step(
      "tracks added, updated and removed object list items inside the view model",
      async () => {
        await userEvent.click(canvas.getByRole("button", { name: "Add job" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-jobs")).toHaveTextContent("Active jobs: 3"),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Update job" }));
        await waitFor(() =>
          expect(canvas.getByText("refresh Open tower stream")).toBeInTheDocument(),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Remove job" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-jobs")).toHaveTextContent("Active jobs: 2"),
        );
      },
    );
  },
};

//endregion

//region Map keyed stream subscriptions

type Channel = {
  id: string;
  title: string;
  packets: number;
};

type ChannelStore = {
  channels: ObservableMap<string, Channel>;
};

type ChannelSubscriptionProps = {
  store: ChannelStore;
};

const initialChannels: [string, Channel][] = [
  ["rx", { id: "rx", title: "RX channel", packets: 12 }],
  ["tx", { id: "tx", title: "TX channel", packets: 8 }],
];

class MapKeyedStreamSubscriptionViewModel extends CleanupViewModel<ChannelSubscriptionProps> {
  activeChannelIds: string[] = [];
  events: string[] = [];

  constructor(props: ChannelSubscriptionProps) {
    super(props);
    makeObservable(this, {
      activeChannelIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addChannel: action.bound,
      updateRx: action.bound,
      dropBackup: action.bound,
    });
  }

  init(): void {
    this.disposers.push(
      cleanupReactionMap(
        () => this.props.store.channels,
        (channel, key) => {
          this.activeChannelIds = [...new Set([...this.activeChannelIds, key])];
          this.events = pushEvent(this.events, `listen ${channel.title}:${channel.packets}`);
          return (isModified) => {
            this.events = pushEvent(
              this.events,
              `${isModified ? "refresh" : "drop"} ${channel.id}`,
            );
            if (!isModified) {
              this.activeChannelIds = this.activeChannelIds.filter((id) => id !== key);
            }
          };
        },
        { equals: (a, b) => a?.packets === b?.packets && a?.title === b?.title },
      ),
    );
  }

  get activeLabel(): string {
    return `Active channels: ${this.activeChannelIds.length}`;
  }

  addChannel(): void {
    this.props.store.channels.set("backup", {
      id: "backup",
      title: "Backup channel",
      packets: 2,
    });
  }

  updateRx(): void {
    const rx = this.props.store.channels.get("rx");
    if (rx) {
      this.props.store.channels.set("rx", { ...rx, packets: rx.packets + 5 });
    }
  }

  dropBackup(): void {
    this.props.store.channels.delete("backup");
  }
}

const MapKeyedStreamSubscriptionsExample = observer(function MapKeyedStreamSubscriptionsExample() {
  const store = useMemo(
    () =>
      observable<ChannelStore>({
        channels: observable.map<string, Channel>(initialChannels),
      }),
    [],
  );
  const vm = useViewModel(MapKeyedStreamSubscriptionViewModel, { store });

  return (
    <StoryCard title="Map keyed stream subscriptions">
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={vm.addChannel}>
          Add channel
        </button>
        <button style={buttonStyle} type="button" onClick={vm.updateRx}>
          Update RX
        </button>
        <button style={buttonStyle} type="button" onClick={vm.dropBackup}>
          Drop backup
        </button>
      </div>
      <span data-testid="active-channels" style={metricStyle}>
        {vm.activeLabel}
      </span>
      <EventList items={vm.events} />
    </StoryCard>
  );
});

const mapKeyedStreamSubscriptionsSource = `
class MapKeyedStreamSubscriptionViewModel extends CleanupViewModel<{ store: ChannelStore }> {
  activeChannelIds: string[] = [];
  events: string[] = [];

  constructor(props: { store: ChannelStore }) {
    super(props);
    makeObservable(this, {
      activeChannelIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addChannel: action.bound,
      updateRx: action.bound,
      dropBackup: action.bound,
    });
  }

  init() {
    this.disposers.push(
      cleanupReactionMap(
        () => this.props.store.channels,
        (channel, key) => {
          this.activeChannelIds = [...new Set([...this.activeChannelIds, key])];
          this.events = [\`listen \${channel.title}:\${channel.packets}\`, ...this.events].slice(0, 6);
          return (isModified) => {
            this.events = [
              \`\${isModified ? "refresh" : "drop"} \${channel.id}\`,
              ...this.events,
            ].slice(0, 6);
            if (!isModified) {
              this.activeChannelIds = this.activeChannelIds.filter((id) => id !== key);
            }
          };
        },
        { equals: (a, b) => a?.packets === b?.packets && a?.title === b?.title },
      ),
    );
  }

  get activeLabel() {
    return \`Active channels: \${this.activeChannelIds.length}\`;
  }
}

const Example = observer(function Example() {
  const store = useMemo(() => observable({
    channels: observable.map([
      ["rx", { id: "rx", title: "RX channel", packets: 12 }],
      ["tx", { id: "tx", title: "TX channel", packets: 8 }],
    ]),
  }), []);
  const vm = useViewModel(MapKeyedStreamSubscriptionViewModel, { store });

  return (
    <section>
      <button onClick={vm.addChannel}>Add channel</button>
      <button onClick={vm.updateRx}>Update RX</button>
      <button onClick={vm.dropBackup}>Drop backup</button>
      <span>{vm.activeLabel}</span>
      <ol>{vm.events.map((event) => <li key={event}>{event}</li>)}</ol>
    </section>
  );
});
`;

export const MapKeyedStreamSubscriptions: Story = {
  render: () => (
    <StoryExample>
      <MapKeyedStreamSubscriptionsExample />
    </StoryExample>
  ),
  parameters: cleanupMobxStorySource(mapKeyedStreamSubscriptionsSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step(
      "tracks map entries by key and refreshes changed values inside the view model",
      async () => {
        await userEvent.click(canvas.getByRole("button", { name: "Add channel" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-channels")).toHaveTextContent("Active channels: 3"),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Update RX" }));
        await waitFor(() => expect(canvas.getByText("refresh rx")).toBeInTheDocument());
        await userEvent.click(canvas.getByRole("button", { name: "Drop backup" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-channels")).toHaveTextContent("Active channels: 2"),
        );
      },
    );
  },
};

//endregion

//region Primitive set and autorun settings

type TagStore = {
  tags: Set<string>;
};

type PreferenceStore = {
  mode: "Desk" | "Field";
  volume: number;
};

type PrimitiveSetProps = {
  tagStore: TagStore;
  preferenceStore: PreferenceStore;
};

const initialTags = ["decoder", "timing", "telemetry"];

class PrimitiveSetAndAutorunSettingsViewModel extends CleanupViewModel<PrimitiveSetProps> {
  activeTags: string[] = [];
  tagEvents: string[] = [];
  preferenceSummary = "Desk at 35%";
  preferenceEvents: string[] = [];

  constructor(props: PrimitiveSetProps) {
    super(props);
    makeObservable(this, {
      activeTags: observable.shallow,
      tagEvents: observable.shallow,
      preferenceSummary: observable,
      preferenceEvents: observable.shallow,
      activeTagsLabel: computed,
      combinedEvents: computed,
      addTag: action.bound,
      removeDecoder: action.bound,
      cycleMode: action.bound,
    });
  }

  init(): void {
    this.disposers.push(
      cleanupReactionPrimitiveList(
        () => this.props.tagStore.tags,
        (tag) => {
          this.activeTags = [...new Set([...this.activeTags, tag])];
          this.tagEvents = pushEvent(this.tagEvents, `watch #${tag}`);
          return () => {
            this.activeTags = this.activeTags.filter((item) => item !== tag);
            this.tagEvents = pushEvent(this.tagEvents, `unwatch #${tag}`);
          };
        },
      ),
    );

    this.disposers.push(
      cleanupAutorun(() => {
        const summary = `${this.props.preferenceStore.mode} at ${this.props.preferenceStore.volume}%`;
        untracked(() => {
          runInAction(() => {
            this.preferenceSummary = summary;
            this.preferenceEvents = pushEvent(this.preferenceEvents, `apply ${summary}`);
          });
        });
        return () => {
          untracked(() => {
            runInAction(() => {
              this.preferenceEvents = pushEvent(this.preferenceEvents, `cleanup ${summary}`);
            });
          });
        };
      }),
    );
  }

  get activeTagsLabel(): string {
    return `Active tags: ${this.activeTags.length}`;
  }

  get combinedEvents(): string[] {
    return [...this.tagEvents, ...this.preferenceEvents].slice(0, 5);
  }

  addTag(): void {
    this.props.tagStore.tags.add("handover");
  }

  removeDecoder(): void {
    this.props.tagStore.tags.delete("decoder");
  }

  cycleMode(): void {
    this.props.preferenceStore.mode = this.props.preferenceStore.mode === "Desk" ? "Field" : "Desk";
    this.props.preferenceStore.volume += 5;
  }
}

const PrimitiveSetAndAutorunSettingsExample = observer(
  function PrimitiveSetAndAutorunSettingsExample() {
    const tagStore = useMemo(
      () =>
        observable<TagStore>({
          tags: new Set<string>(initialTags),
        }),
      [],
    );
    const preferenceStore = useMemo(
      () =>
        observable<PreferenceStore>({
          mode: "Desk",
          volume: 35,
        }),
      [],
    );
    const vm = useViewModel(PrimitiveSetAndAutorunSettingsViewModel, {
      tagStore,
      preferenceStore,
    });

    return (
      <StoryCard title="Primitive Set watchers plus autorun settings">
        <div style={rowStyle}>
          <button style={buttonStyle} type="button" onClick={vm.addTag}>
            Add tag
          </button>
          <button style={buttonStyle} type="button" onClick={vm.removeDecoder}>
            Remove decoder
          </button>
          <button style={buttonStyle} type="button" onClick={vm.cycleMode}>
            Cycle mode
          </button>
        </div>
        <span data-testid="active-tags" style={metricStyle}>
          {vm.activeTagsLabel}
        </span>
        <span data-testid="preference-summary" style={metricStyle}>
          {vm.preferenceSummary}
        </span>
        <EventList items={vm.combinedEvents} />
      </StoryCard>
    );
  },
);

const primitiveSetAndAutorunSettingsSource = `
class PrimitiveSetAndAutorunSettingsViewModel extends CleanupViewModel<PrimitiveSetProps> {
  activeTags: string[] = [];
  tagEvents: string[] = [];
  preferenceSummary = "Desk at 35%";
  preferenceEvents: string[] = [];

  constructor(props: PrimitiveSetProps) {
    super(props);
    makeObservable(this, {
      activeTags: observable.shallow,
      tagEvents: observable.shallow,
      preferenceSummary: observable,
      preferenceEvents: observable.shallow,
      activeTagsLabel: computed,
      combinedEvents: computed,
      addTag: action.bound,
      removeDecoder: action.bound,
      cycleMode: action.bound,
    });
  }

  init() {
    this.disposers.push(
      cleanupReactionPrimitiveList(
        () => this.props.tagStore.tags,
        (tag) => {
          this.activeTags = [...new Set([...this.activeTags, tag])];
          this.tagEvents = [\`watch #\${tag}\`, ...this.tagEvents].slice(0, 6);
          return () => {
            this.activeTags = this.activeTags.filter((item) => item !== tag);
            this.tagEvents = [\`unwatch #\${tag}\`, ...this.tagEvents].slice(0, 6);
          };
        },
      ),
    );

    this.disposers.push(
      cleanupAutorun(() => {
        const summary = \`\${this.props.preferenceStore.mode} at \${this.props.preferenceStore.volume}%\`;
        untracked(() => {
          runInAction(() => {
            this.preferenceSummary = summary;
            this.preferenceEvents = [\`apply \${summary}\`, ...this.preferenceEvents].slice(0, 6);
          });
        });
        return () => {
          untracked(() => {
            runInAction(() => {
              this.preferenceEvents = [\`cleanup \${summary}\`, ...this.preferenceEvents].slice(0, 6);
            });
          });
        };
      }),
    );
  }

  get activeTagsLabel() {
    return \`Active tags: \${this.activeTags.length}\`;
  }
}

const Example = observer(function Example() {
  const tagStore = useMemo(() => observable({ tags: new Set(["decoder", "timing", "telemetry"]) }), []);
  const preferenceStore = useMemo(() => observable({ mode: "Desk", volume: 35 }), []);
  const vm = useViewModel(PrimitiveSetAndAutorunSettingsViewModel, {
    tagStore,
    preferenceStore,
  });

  return (
    <section>
      <button onClick={vm.addTag}>Add tag</button>
      <button onClick={vm.removeDecoder}>Remove decoder</button>
      <button onClick={vm.cycleMode}>Cycle mode</button>
      <span>{vm.activeTagsLabel}</span>
      <span>{vm.preferenceSummary}</span>
      <ol>{vm.combinedEvents.map((event) => <li key={event}>{event}</li>)}</ol>
    </section>
  );
});
`;

export const PrimitiveSetAndAutorunSettings: Story = {
  render: () => (
    <StoryExample>
      <PrimitiveSetAndAutorunSettingsExample />
    </StoryExample>
  ),
  parameters: cleanupMobxStorySource(primitiveSetAndAutorunSettingsSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step(
      "tracks primitive set entries and autorun settings together inside the view model",
      async () => {
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

//endregion

//region Canvas ref lifecycle

type CanvasTelemetryProps = {
  running: boolean;
  tone: "cyan" | "amber";
};

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
    this.disposers.push(
      cleanupEventListener(
        "pointermove",
        (event: PointerEvent) => {
          this.pointer = `${Math.round(event.offsetX)},${Math.round(event.offsetY)}`;
          this.scheduleDraw();
        },
        this.canvasRef,
      ),
    );

    this.disposers.push(
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
    <StoryCard title="Canvas ref lifecycle">
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
    </StoryCard>
  );
});

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
    this.disposers.push(
      cleanupEventListener(
        "pointermove",
        (event: PointerEvent) => {
          this.pointer = \`\${Math.round(event.offsetX)},\${Math.round(event.offsetY)}\`;
          this.scheduleDraw();
        },
        this.canvasRef,
      ),
    );

    this.disposers.push(
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

export const CanvasRefLifecycle: Story = {
  render: () => (
    <StoryExample>
      <CanvasRefLifecycleExample />
    </StoryExample>
  ),
  parameters: cleanupMobxStorySource(canvasRefLifecycleSource),
  play: async ({ canvasElement, step }) => {
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

//endregion

//region Factory stable client

type FeedClientProps = {
  channel: "alpha" | "beta";
};

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
    this.disposers.push(
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
    <StoryCard title="Factory stable client">
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
    </StoryCard>
  );
});

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
    this.disposers.push(
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

export const FactoryStableClient: Story = {
  render: () => (
    <StoryExample>
      <FactoryStableClientExample />
    </StoryExample>
  ),
  parameters: cleanupMobxStorySource(factoryStableClientSource),
  play: async ({ canvasElement, step }) => {
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

//endregion
