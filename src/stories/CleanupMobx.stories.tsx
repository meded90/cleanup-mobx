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
  workspace: "Inbox" | "Backlog";
  load: number;
  warning: boolean;
};

type ScalarResourceProps = {
  store: ScalarResourceStore;
};

class ScalarResourceViewModel extends CleanupViewModel<ScalarResourceProps> {
  snapshot = "Inbox:24:normal";
  events: string[] = [];

  constructor(props: ScalarResourceProps) {
    super(props);
    makeObservable(this, {
      snapshot: observable,
      events: observable.shallow,
      increaseLoad: action.bound,
      toggleWorkspace: action.bound,
    });
  }

  init(): void {
    this.disposers.push(
      cleanupReaction(
        () =>
          [
            this.props.store.workspace,
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

  toggleWorkspace(): void {
    this.props.store.workspace = this.props.store.workspace === "Inbox" ? "Backlog" : "Inbox";
  }
}

const ScalarMobxResourceReplacementExample = observer(
  function ScalarMobxResourceReplacementExample() {
    const store = useMemo(
      () =>
        observable<ScalarResourceStore>({
          workspace: "Inbox",
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
          <button style={buttonStyle} type="button" onClick={vm.toggleWorkspace}>
            Toggle workspace
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
  snapshot = "Inbox:24:normal";
  events: string[] = [];

  constructor(props: { store: ScalarResourceStore }) {
    super(props);
    makeObservable(this, {
      snapshot: observable,
      events: observable.shallow,
      increaseLoad: action.bound,
      toggleWorkspace: action.bound,
    });
  }

  init() {
    this.disposers.push(
      cleanupReaction(
        () => [
          this.props.store.workspace,
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

  toggleWorkspace() {
    this.props.store.workspace =
      this.props.store.workspace === "Inbox" ? "Backlog" : "Inbox";
  }
}

const ScalarMobxResourceReplacementExample = observer(function Example() {
  const store = useMemo(
    () => observable({ workspace: "Inbox", load: 24, warning: false }),
    [],
  );
  const vm = useViewModel(ScalarResourceViewModel, { store });

  return (
    <section>
      <button onClick={vm.increaseLoad}>Increase load</button>
      <button onClick={vm.toggleWorkspace}>Toggle workspace</button>
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
        expect(canvas.getByTestId("scalar-snapshot")).toHaveTextContent("Inbox:41:normal"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Toggle workspace" }));
      await expect(canvas.getByTestId("scalar-snapshot")).toHaveTextContent("Backlog:41:normal");
    });
  },
};

//endregion

//region ViewModel list subscriptions

type WorkflowTask = {
  id: number;
  title: string;
  state: "queued" | "running" | "done";
};

type WorkflowTaskStore = {
  tasks: WorkflowTask[];
};

type TaskSubscriptionProps = {
  store: WorkflowTaskStore;
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
      { id: 3, title: "Prepare release notes", state: "queued" },
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
      observable<WorkflowTaskStore>({
        tasks: [
          { id: 1, title: "Review todo list", state: "queued" },
          { id: 2, title: "Assign project owner", state: "running" },
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
class TaskSubscriptionViewModel extends CleanupViewModel<{ store: WorkflowTaskStore }> {
  activeTaskIds: number[] = [];
  events: string[] = [];

  constructor(props: { store: WorkflowTaskStore }) {
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
      { id: 1, title: "Review todo list", state: "queued" },
      { id: 2, title: "Assign project owner", state: "running" },
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
        expect(canvas.getByText("refresh Assign project owner")).toBeInTheDocument(),
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
  { id: 1, title: "Review todo list", state: "queued" },
  { id: 2, title: "Assign project owner", state: "running" },
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
      { id: 3, title: "Prepare onboarding checklist", state: "queued" },
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
      { id: 1, title: "Review todo list", state: "queued" },
      { id: 2, title: "Assign project owner", state: "running" },
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
          expect(canvas.getByText("refresh Assign project owner")).toBeInTheDocument(),
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

//region Map keyed board subscriptions

type ProjectBoard = {
  id: string;
  title: string;
  activity: number;
};

type ProjectBoardStore = {
  boards: ObservableMap<string, ProjectBoard>;
};

type BoardSubscriptionProps = {
  store: ProjectBoardStore;
};

const initialBoards: [string, ProjectBoard][] = [
  ["design", { id: "design", title: "Design board", activity: 12 }],
  ["support", { id: "support", title: "Support board", activity: 8 }],
];

class MapKeyedBoardSubscriptionViewModel extends CleanupViewModel<BoardSubscriptionProps> {
  activeBoardIds: string[] = [];
  events: string[] = [];

  constructor(props: BoardSubscriptionProps) {
    super(props);
    makeObservable(this, {
      activeBoardIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addBoard: action.bound,
      updateDesign: action.bound,
      dropArchive: action.bound,
    });
  }

  init(): void {
    this.disposers.push(
      cleanupReactionMap(
        () => this.props.store.boards,
        (board, key) => {
          this.activeBoardIds = [...new Set([...this.activeBoardIds, key])];
          this.events = pushEvent(this.events, `watch ${board.title}:${board.activity}`);
          return (isModified) => {
            this.events = pushEvent(this.events, `${isModified ? "refresh" : "drop"} ${board.id}`);
            if (!isModified) {
              this.activeBoardIds = this.activeBoardIds.filter((id) => id !== key);
            }
          };
        },
        { equals: (a, b) => a?.activity === b?.activity && a?.title === b?.title },
      ),
    );
  }

  get activeLabel(): string {
    return `Active boards: ${this.activeBoardIds.length}`;
  }

  addBoard(): void {
    this.props.store.boards.set("archive", {
      id: "archive",
      title: "Archive board",
      activity: 2,
    });
  }

  updateDesign(): void {
    const design = this.props.store.boards.get("design");
    if (design) {
      this.props.store.boards.set("design", { ...design, activity: design.activity + 5 });
    }
  }

  dropArchive(): void {
    this.props.store.boards.delete("archive");
  }
}

const MapKeyedBoardSubscriptionsExample = observer(function MapKeyedBoardSubscriptionsExample() {
  const store = useMemo(
    () =>
      observable<ProjectBoardStore>({
        boards: observable.map<string, ProjectBoard>(initialBoards),
      }),
    [],
  );
  const vm = useViewModel(MapKeyedBoardSubscriptionViewModel, { store });

  return (
    <StoryCard title="Map keyed board subscriptions">
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={vm.addBoard}>
          Add board
        </button>
        <button style={buttonStyle} type="button" onClick={vm.updateDesign}>
          Update design
        </button>
        <button style={buttonStyle} type="button" onClick={vm.dropArchive}>
          Drop archive
        </button>
      </div>
      <span data-testid="active-boards" style={metricStyle}>
        {vm.activeLabel}
      </span>
      <EventList items={vm.events} />
    </StoryCard>
  );
});

const mapKeyedBoardSubscriptionsSource = `
class MapKeyedBoardSubscriptionViewModel extends CleanupViewModel<{ store: ProjectBoardStore }> {
  activeBoardIds: string[] = [];
  events: string[] = [];

  constructor(props: { store: ProjectBoardStore }) {
    super(props);
    makeObservable(this, {
      activeBoardIds: observable.shallow,
      events: observable.shallow,
      activeLabel: computed,
      addBoard: action.bound,
      updateDesign: action.bound,
      dropArchive: action.bound,
    });
  }

  init() {
    this.disposers.push(
      cleanupReactionMap(
        () => this.props.store.boards,
        (board, key) => {
          this.activeBoardIds = [...new Set([...this.activeBoardIds, key])];
          this.events = [\`watch \${board.title}:\${board.activity}\`, ...this.events].slice(0, 6);
          return (isModified) => {
            this.events = [
              \`\${isModified ? "refresh" : "drop"} \${board.id}\`,
              ...this.events,
            ].slice(0, 6);
            if (!isModified) {
              this.activeBoardIds = this.activeBoardIds.filter((id) => id !== key);
            }
          };
        },
        { equals: (a, b) => a?.activity === b?.activity && a?.title === b?.title },
      ),
    );
  }

  get activeLabel() {
    return \`Active boards: \${this.activeBoardIds.length}\`;
  }
}

const Example = observer(function Example() {
  const store = useMemo(() => observable({
    boards: observable.map([
      ["design", { id: "design", title: "Design board", activity: 12 }],
      ["support", { id: "support", title: "Support board", activity: 8 }],
    ]),
  }), []);
  const vm = useViewModel(MapKeyedBoardSubscriptionViewModel, { store });

  return (
    <section>
      <button onClick={vm.addBoard}>Add board</button>
      <button onClick={vm.updateDesign}>Update design</button>
      <button onClick={vm.dropArchive}>Drop archive</button>
      <span>{vm.activeLabel}</span>
      <ol>{vm.events.map((event) => <li key={event}>{event}</li>)}</ol>
    </section>
  );
});
`;

export const MapKeyedBoardSubscriptions: Story = {
  render: () => (
    <StoryExample>
      <MapKeyedBoardSubscriptionsExample />
    </StoryExample>
  ),
  parameters: cleanupMobxStorySource(mapKeyedBoardSubscriptionsSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step(
      "tracks map entries by key and refreshes changed values inside the view model",
      async () => {
        await userEvent.click(canvas.getByRole("button", { name: "Add board" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-boards")).toHaveTextContent("Active boards: 3"),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Update design" }));
        await waitFor(() => expect(canvas.getByText("refresh design")).toBeInTheDocument());
        await userEvent.click(canvas.getByRole("button", { name: "Drop archive" }));
        await waitFor(() =>
          expect(canvas.getByTestId("active-boards")).toHaveTextContent("Active boards: 2"),
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

const initialTags = ["billing", "security", "analytics"];

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
      removeBilling: action.bound,
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
    this.props.tagStore.tags.add("support");
  }

  removeBilling(): void {
    this.props.tagStore.tags.delete("billing");
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
          <button style={buttonStyle} type="button" onClick={vm.removeBilling}>
            Remove billing
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
      removeBilling: action.bound,
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
  const tagStore = useMemo(() => observable({ tags: new Set(["billing", "security", "analytics"]) }), []);
  const preferenceStore = useMemo(() => observable({ mode: "Desk", volume: 35 }), []);
  const vm = useViewModel(PrimitiveSetAndAutorunSettingsViewModel, {
    tagStore,
    preferenceStore,
  });

  return (
    <section>
      <button onClick={vm.addTag}>Add tag</button>
      <button onClick={vm.removeBilling}>Remove billing</button>
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
        await userEvent.click(canvas.getByRole("button", { name: "Remove billing" }));
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

type CanvasDashboardProps = {
  running: boolean;
  theme: "blue" | "gold";
};

class CanvasDashboardViewModel extends CleanupViewModel<CanvasDashboardProps> {
  frames = 0;
  pointer = "outside";
  private disposeFrame: Disposer | null = null;

  constructor(
    props: CanvasDashboardProps,
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
        () => ({ running: this.props.running, theme: this.props.theme }),
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
    context.fillStyle = this.props.theme === "blue" ? "#e0f2fe" : "#fff4d6";
    context.fillRect(0, 0, width, height);
    context.fillStyle = this.props.theme === "blue" ? "#0369a1" : "#8a4b00";
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
  const [theme, setTheme] = useState<CanvasDashboardProps["theme"]>("blue");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vm = useViewModel(CanvasDashboardViewModel, { running, theme }, [canvasRef]);

  return (
    <StoryCard title="Canvas ref lifecycle">
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={() => setRunning((value) => !value)}>
          {running ? "Pause" : "Run"}
        </button>
        <button
          style={buttonStyle}
          type="button"
          onClick={() => setTheme((value) => (value === "blue" ? "gold" : "blue"))}
        >
          Toggle theme
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
class CanvasDashboardViewModel extends CleanupViewModel<CanvasDashboardProps> {
  frames = 0;
  pointer = "outside";
  private disposeFrame: (() => void) | null = null;

  constructor(
    props: CanvasDashboardProps,
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
        () => ({ running: this.props.running, theme: this.props.theme }),
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
  const [theme, setTheme] = useState<"blue" | "gold">("blue");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vm = useViewModel(CanvasDashboardViewModel, { running, theme }, [canvasRef]);

  return (
    <section>
      <button onClick={() => setRunning((value) => !value)}>
        {running ? "Pause" : "Run"}
      </button>
      <button onClick={() => setTheme((value) => (value === "blue" ? "gold" : "blue"))}>
        Toggle theme
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

//region Factory stable project client

type ProjectClientProps = {
  workspace: "planning" | "delivery";
};

class StableProjectClientViewModel extends CleanupViewModel<ProjectClientProps> {
  updates = 0;
  events: string[] = [];

  constructor(
    props: ProjectClientProps,
    private readonly clientId: string,
  ) {
    super(props);
    makeObservable(this, {
      updates: observable,
      events: observable.shallow,
      label: computed,
    });
  }

  init(): void {
    this.disposers.push(
      cleanupReaction(
        () => this.props.workspace,
        (workspace) => {
          this.events = pushEvent(this.events, `connect ${this.clientId}:${workspace}`);
          return cleanupInterval(() => {
            runInAction(() => {
              this.updates += workspace === "planning" ? 1 : 2;
            });
          }, "220ms");
        },
      ),
    );
  }

  get label(): string {
    return `${this.clientId}:${this.props.workspace} updates ${this.updates}`;
  }
}

const FactoryStableClientExample = observer(function FactoryStableClientExample() {
  const [workspace, setWorkspace] = useState<ProjectClientProps["workspace"]>("planning");
  const vm = useViewModelFactory(
    (props?: ProjectClientProps) =>
      new StableProjectClientViewModel(props ?? { workspace: "planning" }, "project-sync"),
    { workspace },
  );

  return (
    <StoryCard title="Factory stable client">
      <div style={rowStyle}>
        <button
          style={buttonStyle}
          type="button"
          onClick={() => setWorkspace((value) => (value === "planning" ? "delivery" : "planning"))}
        >
          Switch workspace
        </button>
      </div>
      <span data-testid="project-client-label" style={metricStyle}>
        {vm.label}
      </span>
      <EventList items={vm.events} />
    </StoryCard>
  );
});

const factoryStableClientSource = `
class StableProjectClientViewModel extends CleanupViewModel<{ workspace: "planning" | "delivery" }> {
  updates = 0;
  events: string[] = [];

  constructor(
    props: { workspace: "planning" | "delivery" },
    private readonly clientId: string,
  ) {
    super(props);
    makeObservable(this, {
      updates: observable,
      events: observable.shallow,
      label: computed,
    });
  }

  init() {
    this.disposers.push(
      cleanupReaction(
        () => this.props.workspace,
        (workspace) => {
          this.events = [\`connect \${this.clientId}:\${workspace}\`, ...this.events].slice(0, 6);
          return cleanupInterval(() => {
            runInAction(() => {
              this.updates += workspace === "planning" ? 1 : 2;
            });
          }, "220ms");
        },
      ),
    );
  }

  get label() {
    return \`\${this.clientId}:\${this.props.workspace} updates \${this.updates}\`;
  }
}

const Example = observer(function Example() {
  const [workspace, setWorkspace] = useState<"planning" | "delivery">("planning");
  const vm = useViewModelFactory(
    (props) => new StableProjectClientViewModel(props ?? { workspace: "planning" }, "project-sync"),
    { workspace },
  );

  return (
    <section>
      <button onClick={() => setWorkspace((value) => (value === "planning" ? "delivery" : "planning"))}>
        Switch workspace
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

    await step(
      "keeps the factory-created client while replacing the workspace effect",
      async () => {
        await waitFor(() =>
          expect(canvas.getByTestId("project-client-label")).toHaveTextContent(
            /planning updates [1-9]/,
          ),
        );
        await userEvent.click(canvas.getByRole("button", { name: "Switch workspace" }));
        await waitFor(() =>
          expect(canvas.getByTestId("project-client-label")).toHaveTextContent(
            "project-sync:delivery",
          ),
        );
      },
    );
  },
};

//endregion
