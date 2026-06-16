import { observable, runInAction } from "mobx";
import { useEffect, useMemo, useState } from "react";

import { cleanupReaction, cleanupReactionList } from "../index";
import { StoryExample, storySource } from "./storySource";

import type { Meta, StoryObj } from "@storybook/react-vite";

type User = {
  id: number;
  name: string;
};

function MobxExample() {
  const store = useMemo(
    () =>
      observable({
        count: 0,
        users: [] as User[],
      }),
    [],
  );
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const disposeCount = cleanupReaction(
      () => store.count,
      (count) => {
        setEvents((value) => [`count changed to ${count}`, ...value].slice(0, 6));
      },
    );

    const disposeUsers = cleanupReactionList(
      () => store.users,
      (user) => {
        setEvents((value) => [`subscribed to ${user.name}`, ...value].slice(0, 6));
        return (isModified) => {
          setEvents((value) =>
            [
              isModified ? `refreshed ${user.name}` : `unsubscribed from ${user.name}`,
              ...value,
            ].slice(0, 6),
          );
        };
      },
      { getKey: (user) => user.id },
    );

    const timer = window.setInterval(() => {
      runInAction(() => {
        store.count += 1;
        store.users = [{ id: store.count % 2, name: `User ${store.count % 2}` }];
      });
    }, 1200);

    return () => {
      window.clearInterval(timer);
      disposeCount();
      disposeUsers();
    };
  }, [store]);

  return (
    <section style={{ display: "grid", gap: 8, fontFamily: "system-ui, sans-serif" }}>
      <strong>cleanupReaction + cleanupReactionList</strong>
      <span>Count: {store.count}</span>
      <ol>
        {events.map((event, index) => (
          <li key={`${event}-${index}`}>{event}</li>
        ))}
      </ol>
    </section>
  );
}

const mobxExampleSource = `
function MobxExample() {
  const store = useMemo(
    () =>
      observable({
        count: 0,
        users: [] as User[],
      }),
    [],
  );
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const disposeCount = cleanupReaction(
      () => store.count,
      (count) => {
        setEvents((value) => [\`count changed to \${count}\`, ...value].slice(0, 6));
      },
    );

    const disposeUsers = cleanupReactionList(
      () => store.users,
      (user) => {
        setEvents((value) => [\`subscribed to \${user.name}\`, ...value].slice(0, 6));
        return (isModified) => {
          setEvents((value) =>
            [
              isModified ? \`refreshed \${user.name}\` : \`unsubscribed from \${user.name}\`,
              ...value,
            ].slice(0, 6),
          );
        };
      },
      { getKey: (user) => user.id },
    );

    return () => {
      disposeCount();
      disposeUsers();
    };
  }, [store]);
}
`;

const meta = {
  title: "Cleanup/MobX",
  component: MobxExample,
} satisfies Meta<typeof MobxExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reactions: Story = {
  render: () => (
    <StoryExample>
      <MobxExample />
    </StoryExample>
  ),
  parameters: storySource(mobxExampleSource),
};
