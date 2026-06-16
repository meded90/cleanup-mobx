import { useEffect, useRef, useState } from "react";

import { cleanupEventListener } from "../index";
import { StoryExample, storySource } from "./storySource";

import type { Meta, StoryObj } from "@storybook/react-vite";

function EventListenerExample() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    return cleanupEventListener(
      "click",
      () => {
        setClicks((value) => value + 1);
      },
      buttonRef,
    );
  }, []);

  return (
    <section
      style={{
        display: "grid",
        gap: 8,
        justifyItems: "start",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <strong>cleanupEventListener</strong>
      <button ref={buttonRef} type="button">
        Click target
      </button>
      <span>Clicks: {clicks}</span>
    </section>
  );
}

const eventListenerExampleSource = `
function EventListenerExample() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    return cleanupEventListener(
      "click",
      () => {
        setClicks((value) => value + 1);
      },
      buttonRef,
    );
  }, []);

  return (
    <section>
      <strong>cleanupEventListener</strong>
      <button ref={buttonRef} type="button">
        Click target
      </button>
      <span>Clicks: {clicks}</span>
    </section>
  );
}
`;

const meta = {
  title: "Cleanup/Event Listener",
  component: EventListenerExample,
} satisfies Meta<typeof EventListenerExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DomEvent: Story = {
  render: () => (
    <StoryExample source={eventListenerExampleSource}>
      <EventListenerExample />
    </StoryExample>
  ),
  parameters: storySource(eventListenerExampleSource),
};
