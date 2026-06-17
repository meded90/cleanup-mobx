import { useEffect, useRef, useState } from "react";

import { cleanupEventListener } from "../index";
import {
  StoryCard,
  StoryExample,
  storyButtonStyle,
  storyMetricStyle,
  storySource,
} from "./storySource";

import type { Meta, StoryObj } from "@storybook/react-vite";

//region Event listener

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
    <StoryCard title="cleanupEventListener">
      <button ref={buttonRef} style={storyButtonStyle} type="button">
        Click target
      </button>
      <span style={storyMetricStyle}>Clicks: {clicks}</span>
    </StoryCard>
  );
}

const eventListenerExampleSource = `
import { StoryCard } from "./storySource";

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
    <StoryCard title="cleanupEventListener">
      <button ref={buttonRef} type="button">
        Click target
      </button>
      <span>Clicks: {clicks}</span>
    </StoryCard>
  );
}
`;

const meta = {
  title: "Example/Event Listener",
  component: EventListenerExample,
} satisfies Meta<typeof EventListenerExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DomEvent: Story = {
  render: () => (
    <StoryExample>
      <EventListenerExample />
    </StoryExample>
  ),
  parameters: storySource(eventListenerExampleSource),
};

//endregion
