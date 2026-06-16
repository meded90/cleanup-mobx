import { action } from "storybook/actions";

export function logAndAction(name: string) {
  const emitAction = action(name);

  return function (...args: unknown[]) {
    console.log(...args);
    emitAction(...args);
  };
}
