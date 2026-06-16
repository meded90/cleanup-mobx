import { useEffect, useState } from "react";

import { cleanupInterval, cleanupTimeout } from "../index";

import type { Meta, StoryObj } from "@storybook/react-vite";

function TimerExample() {
  const [ticks, setTicks] = useState(0);
  const [message, setMessage] = useState("waiting for timeout");

  useEffect(() => {
    const disposeInterval = cleanupInterval(() => {
      setTicks((value) => value + 1);
    }, "1s");

    const disposeTimeout = cleanupTimeout(() => {
      setMessage("timeout fired");
    }, "2s");

    return () => {
      disposeInterval();
      disposeTimeout();
    };
  }, []);

  return (
    <section style={{ display: "grid", gap: 8, fontFamily: "system-ui, sans-serif" }}>
      <strong>cleanupInterval + cleanupTimeout</strong>
      <span>Interval ticks: {ticks}</span>
      <span>{message}</span>
    </section>
  );
}

const meta = {
  title: "Cleanup/Timers",
  component: TimerExample,
} satisfies Meta<typeof TimerExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Timers: Story = {};
