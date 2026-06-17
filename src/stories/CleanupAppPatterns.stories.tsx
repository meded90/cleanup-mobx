import { action, computed, makeObservable, observable, runInAction, untracked } from "mobx";
import { observer } from "mobx-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useViewModel } from "mobx-react-viewmodel";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  cleanupAutorun,
  cleanupEventListener,
  cleanupInterval,
  cleanupReactionList,
  cleanupReactionMap,
  cleanupTimeout,
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

type Disposer = () => void;

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

//region Todo workspace

type TodoItem = {
  id: number;
  title: string;
  done: boolean;
  assignee: string;
};

const initialTodos: TodoItem[] = [
  { id: 1, title: "Write README", done: false, assignee: "Maya" },
  { id: 2, title: "Publish package", done: true, assignee: "Leo" },
];

function TodoWorkspaceExample() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [reminders, setReminders] = useState<string[]>([]);

  const visibleTodos = todos.filter((todo) => {
    if (filter === "active") {
      return !todo.done;
    }
    if (filter === "done") {
      return todo.done;
    }
    return true;
  });
  const activeCount = todos.filter((todo) => !todo.done).length;

  useEffect(() => {
    setSaveStatus("Saving draft");
    return cleanupTimeout(() => {
      setSaveStatus(`Saved ${todos.length} todos`);
    }, "250ms");
  }, [todos]);

  useEffect(() => {
    const nextTodo = todos.find((todo) => !todo.done);
    if (!nextTodo) {
      return;
    }

    return cleanupInterval(() => {
      setReminders((events) => pushEvent(events, `remind ${nextTodo.title}`));
    }, "300ms");
  }, [todos]);

  useEffect(() => {
    return cleanupEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setDraft("");
        }
      },
      inputRef,
    );
  }, []);

  const addTodo = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }

    setTodos((items) => [
      ...items,
      {
        id: Math.max(...items.map((item) => item.id)) + 1,
        title,
        done: false,
        assignee: "You",
      },
    ]);
    setDraft("");
  };

  const toggleFirstTodo = () => {
    setTodos((items) =>
      items.map((item, index) => (index === 0 ? { ...item, done: !item.done } : item)),
    );
  };

  return (
    <StoryCard title="Todo workspace">
      <div style={rowStyle}>
        <input
          ref={inputRef}
          aria-label="Todo title"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a task"
          style={{ border: "1px solid #b8c4d2", borderRadius: 6, padding: "6px 8px" }}
        />
        <button style={buttonStyle} type="button" onClick={addTodo}>
          Add todo
        </button>
        <button style={buttonStyle} type="button" onClick={toggleFirstTodo}>
          Toggle first
        </button>
      </div>
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={() => setFilter("all")}>
          All
        </button>
        <button style={buttonStyle} type="button" onClick={() => setFilter("active")}>
          Active
        </button>
        <button style={buttonStyle} type="button" onClick={() => setFilter("done")}>
          Done
        </button>
      </div>
      <span data-testid="todo-save-status" style={metricStyle}>
        {saveStatus}
      </span>
      <span data-testid="todo-active-count" style={metricStyle}>
        Active todos: {activeCount}
      </span>
      <ul style={{ margin: 0, paddingLeft: 18 }} data-testid="todo-list">
        {visibleTodos.map((todo) => (
          <li key={todo.id}>
            {todo.done ? "[done]" : "[active]"} {todo.title} - {todo.assignee}
          </li>
        ))}
      </ul>
      <EventList items={reminders} />
    </StoryCard>
  );
}

const todoWorkspaceSource = `
function TodoWorkspaceExample() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [todos, setTodos] = useState(initialTodos);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [reminders, setReminders] = useState<string[]>([]);

  useEffect(() => {
    setSaveStatus("Saving draft");
    return cleanupTimeout(() => {
      setSaveStatus(\`Saved \${todos.length} todos\`);
    }, "250ms");
  }, [todos]);

  useEffect(() => {
    const nextTodo = todos.find((todo) => !todo.done);
    if (!nextTodo) return;

    return cleanupInterval(() => {
      setReminders((events) => [\`remind \${nextTodo.title}\`, ...events].slice(0, 6));
    }, "300ms");
  }, [todos]);

  useEffect(() => {
    return cleanupEventListener(
      "keydown",
      (event: KeyboardEvent) => {
        if (event.key === "Escape") setDraft("");
      },
      inputRef,
    );
  }, []);

  const addTodo = () => {
    const title = draft.trim();
    if (!title) return;
    setTodos((items) => [
      ...items,
      { id: Math.max(...items.map((item) => item.id)) + 1, title, done: false, assignee: "You" },
    ]);
    setDraft("");
  };

  return (
    <section>
      <input ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button onClick={addTodo}>Add todo</button>
      <button onClick={() => setFilter("active")}>Active</button>
      <span>{saveStatus}</span>
      <ul>{visibleTodos.map((todo) => <li key={todo.id}>{todo.title}</li>)}</ul>
    </section>
  );
}
`;

//endregion

//region User management

type UserRole = "admin" | "editor" | "viewer";

type AppUser = {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
};

type UserSession = {
  userId: string;
  online: boolean;
  lastSeenMinutes: number;
};

type UserManagementStore = {
  users: AppUser[];
  sessions: ObservableMap<string, UserSession>;
  selectedRole: UserRole;
};

type UserManagementProps = {
  store: UserManagementStore;
};

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

class UserManagementViewModel extends CleanupViewModel<UserManagementProps> {
  trackedUsers: string[] = [];
  onlineUserIds: string[] = [];
  roleSummary = "admin: 1 active";
  events: string[] = [];

  constructor(props: UserManagementProps) {
    super(props);
    makeObservable(this, {
      trackedUsers: observable.shallow,
      onlineUserIds: observable.shallow,
      roleSummary: observable,
      events: observable.shallow,
      trackedLabel: computed,
      onlineLabel: computed,
      inviteUser: action.bound,
      promoteBen: action.bound,
      deactivateAlice: action.bound,
      toggleCaraOnline: action.bound,
      selectRole: action.bound,
    });
  }

  init(): void {
    this.disposers.push(
      cleanupReactionList(
        () => this.props.store.users.filter((user) => user.active),
        (user) => {
          this.trackedUsers = [...new Set([...this.trackedUsers, user.id])];
          this.events = pushEvent(this.events, `subscribe ${user.name}:${user.role}`);
          return (isModified) => {
            this.events = pushEvent(
              this.events,
              `${isModified ? "refresh" : "unsubscribe"} ${user.name}`,
            );
            if (!isModified) {
              this.trackedUsers = this.trackedUsers.filter((id) => id !== user.id);
            }
          };
        },
        {
          getKey: (user) => user.id,
          equals: (left, right) =>
            left.name === right.name && left.role === right.role && left.active === right.active,
        },
      ),
    );

    this.disposers.push(
      cleanupReactionMap(
        () => this.props.store.sessions,
        (session, key) => {
          this.syncOnlineUsers();
          this.events = pushEvent(
            this.events,
            `presence ${key}:${session.online ? "online" : "offline"}`,
          );
          return (isModified) => {
            this.syncOnlineUsers();
            this.events = pushEvent(
              this.events,
              `${isModified ? "presence update" : "presence closed"} ${key}`,
            );
          };
        },
      ),
    );

    this.disposers.push(
      cleanupAutorun(() => {
        const role = this.props.store.selectedRole;
        const activeUsers = this.props.store.users.filter(
          (user) => user.active && user.role === role,
        ).length;
        const summary = `${role}: ${activeUsers} active`;

        untracked(() => {
          runInAction(() => {
            this.roleSummary = summary;
            this.events = pushEvent(this.events, `audit ${summary}`);
          });
        });

        return () => {
          untracked(() => {
            runInAction(() => {
              this.events = pushEvent(this.events, `clear audit ${summary}`);
            });
          });
        };
      }),
    );
  }

  get trackedLabel(): string {
    return `Tracked users: ${this.trackedUsers.length}`;
  }

  get onlineLabel(): string {
    return `Online users: ${this.onlineUserIds.length}`;
  }

  inviteUser(): void {
    if (this.props.store.users.some((user) => user.id === "u3")) {
      return;
    }

    this.props.store.users = [
      ...this.props.store.users,
      { id: "u3", name: "Cara", role: "viewer", active: true },
    ];
    this.props.store.sessions.set("u3", {
      userId: "u3",
      online: false,
      lastSeenMinutes: 0,
    });
  }

  promoteBen(): void {
    this.props.store.users = this.props.store.users.map((user) =>
      user.id === "u2" ? { ...user, role: "admin" } : user,
    );
  }

  deactivateAlice(): void {
    this.props.store.users = this.props.store.users.map((user) =>
      user.id === "u1" ? { ...user, active: false } : user,
    );
    this.props.store.sessions.delete("u1");
  }

  toggleCaraOnline(): void {
    const session = this.props.store.sessions.get("u3");
    if (!session) {
      return;
    }

    this.props.store.sessions.set("u3", {
      ...session,
      online: !session.online,
      lastSeenMinutes: 0,
    });
  }

  selectRole(role: UserRole): void {
    this.props.store.selectedRole = role;
  }

  private syncOnlineUsers(): void {
    this.onlineUserIds = [...this.props.store.sessions.values()]
      .filter((session) => session.online)
      .map((session) => session.userId);
  }
}

const UserManagementExample = observer(function UserManagementExample() {
  const store = useMemo(
    () =>
      observable<UserManagementStore>({
        users: [
          { id: "u1", name: "Alice", role: "admin", active: true },
          { id: "u2", name: "Ben", role: "editor", active: true },
        ],
        sessions: observable.map<string, UserSession>([
          ["u1", { userId: "u1", online: true, lastSeenMinutes: 0 }],
          ["u2", { userId: "u2", online: false, lastSeenMinutes: 12 }],
        ]),
        selectedRole: "admin",
      }),
    [],
  );
  const vm = useViewModel(UserManagementViewModel, { store });

  return (
    <StoryCard title="User management subscriptions">
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={vm.inviteUser}>
          Invite user
        </button>
        <button style={buttonStyle} type="button" onClick={vm.promoteBen}>
          Promote Ben
        </button>
        <button style={buttonStyle} type="button" onClick={vm.deactivateAlice}>
          Deactivate Alice
        </button>
        <button style={buttonStyle} type="button" onClick={vm.toggleCaraOnline}>
          Toggle Cara online
        </button>
      </div>
      <div style={rowStyle}>
        <button style={buttonStyle} type="button" onClick={() => vm.selectRole("admin")}>
          Audit admins
        </button>
        <button style={buttonStyle} type="button" onClick={() => vm.selectRole("viewer")}>
          Audit viewers
        </button>
      </div>
      <span data-testid="tracked-users" style={metricStyle}>
        {vm.trackedLabel}
      </span>
      <span data-testid="online-users" style={metricStyle}>
        {vm.onlineLabel}
      </span>
      <span data-testid="role-summary" style={metricStyle}>
        {vm.roleSummary}
      </span>
      <EventList items={vm.events} />
    </StoryCard>
  );
});

const userManagementSource = `
class UserManagementViewModel extends CleanupViewModel<{ store: UserManagementStore }> {
  trackedUsers: string[] = [];
  onlineUserIds: string[] = [];
  roleSummary = "admin: 1 active";
  events: string[] = [];

  init() {
    this.disposers.push(
      cleanupReactionList(
        () => this.props.store.users.filter((user) => user.active),
        (user) => {
          this.trackedUsers = [...new Set([...this.trackedUsers, user.id])];
          this.events = [\`subscribe \${user.name}:\${user.role}\`, ...this.events].slice(0, 6);
          return (isModified) => {
            this.events = [
              \`\${isModified ? "refresh" : "unsubscribe"} \${user.name}\`,
              ...this.events,
            ].slice(0, 6);
            if (!isModified) {
              this.trackedUsers = this.trackedUsers.filter((id) => id !== user.id);
            }
          };
        },
        { getKey: (user) => user.id },
      ),
    );

    this.disposers.push(
      cleanupReactionMap(
        () => this.props.store.sessions,
        (session, key) => {
          this.onlineUserIds = [...this.props.store.sessions.values()]
            .filter((item) => item.online)
            .map((item) => item.userId);
          this.events = [
            \`presence \${key}:\${session.online ? "online" : "offline"}\`,
            ...this.events,
          ].slice(0, 6);
        },
      ),
    );

    this.disposers.push(
      cleanupAutorun(() => {
        const role = this.props.store.selectedRole;
        const activeUsers = this.props.store.users.filter(
          (user) => user.active && user.role === role,
        ).length;
        const summary = \`\${role}: \${activeUsers} active\`;

        untracked(() => {
          runInAction(() => {
            this.roleSummary = summary;
          });
        });
      }),
    );
  }
}

const Example = observer(function Example() {
  const store = useMemo(() => observable({
    users: [
      { id: "u1", name: "Alice", role: "admin", active: true },
      { id: "u2", name: "Ben", role: "editor", active: true },
    ],
    sessions: observable.map([
      ["u1", { userId: "u1", online: true, lastSeenMinutes: 0 }],
      ["u2", { userId: "u2", online: false, lastSeenMinutes: 12 }],
    ]),
    selectedRole: "admin",
  }), []);
  const vm = useViewModel(UserManagementViewModel, { store });

  return (
    <section>
      <button onClick={vm.inviteUser}>Invite user</button>
      <button onClick={vm.promoteBen}>Promote Ben</button>
      <button onClick={() => vm.selectRole("viewer")}>Audit viewers</button>
      <span>{vm.trackedLabel}</span>
      <span>{vm.onlineLabel}</span>
      <span>{vm.roleSummary}</span>
    </section>
  );
});
`;

//endregion

const meta = {
  title: "Example/App Patterns",
  component: TodoWorkspaceExample,
} satisfies Meta<typeof TodoWorkspaceExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TodoWorkspace: Story = {
  render: () => (
    <StoryExample>
      <TodoWorkspaceExample />
    </StoryExample>
  ),
  parameters: storySource(todoWorkspaceSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("adds a todo, saves it and filters active work", async () => {
      await userEvent.type(canvas.getByLabelText("Todo title"), "Ship examples");
      await userEvent.click(canvas.getByRole("button", { name: "Add todo" }));
      await waitFor(() =>
        expect(canvas.getByTestId("todo-save-status")).toHaveTextContent("Saved 3 todos"),
      );
      await expect(canvas.getByTestId("todo-active-count")).toHaveTextContent("Active todos: 2");
      await userEvent.click(canvas.getByRole("button", { name: "Active" }));
      await expect(canvas.getByTestId("todo-list")).toHaveTextContent("Ship examples");
    });
  },
};

export const UserManagement: Story = {
  render: () => (
    <StoryExample>
      <UserManagementExample />
    </StoryExample>
  ),
  parameters: storySource(userManagementSource),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("tracks added, changed and removed users with MobX cleanup helpers", async () => {
      await waitFor(() =>
        expect(canvas.getByTestId("tracked-users")).toHaveTextContent("Tracked users: 2"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Invite user" }));
      await waitFor(() =>
        expect(canvas.getByTestId("tracked-users")).toHaveTextContent("Tracked users: 3"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Promote Ben" }));
      await userEvent.click(canvas.getByRole("button", { name: "Audit admins" }));
      await waitFor(() =>
        expect(canvas.getByTestId("role-summary")).toHaveTextContent("admin: 2 active"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Toggle Cara online" }));
      await waitFor(() =>
        expect(canvas.getByTestId("online-users")).toHaveTextContent("Online users: 2"),
      );
      await userEvent.click(canvas.getByRole("button", { name: "Deactivate Alice" }));
      await waitFor(() =>
        expect(canvas.getByTestId("tracked-users")).toHaveTextContent("Tracked users: 2"),
      );
    });
  },
};
