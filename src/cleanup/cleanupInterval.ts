import { isFunction, isString } from "lodash";

import ms, { StringValue } from "../ms";
import { Disposer } from "../types/disposer";

/**
 * Runs an async effect on an interval, cleaning up the previous result before the next call.
 * @param cb - function that returns a disposer (or a promise resolving to a disposer).
 * @param delay - delay between calls (milliseconds or an ms-formatted string).
 * @returns function for stopping the interval and cleaning up the latest effect.
 */
export function cleanupInterval(cb: () => Disposer, delay: number | StringValue): () => void {
  let dispose: void | (() => void);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let isDisposed = false;

  const intervalMs = isString(delay) ? ms(delay) : delay;

  async function run(): Promise<void> {
    if (isDisposed) {
      return;
    }

    dispose?.();
    const effect = await cb();
    dispose = isFunction(effect) ? effect : undefined;

    if (isDisposed) {
      return;
    }

    timeoutId = setTimeout(run, intervalMs);
  }

  timeoutId = setTimeout(run, intervalMs);

  return () => {
    isDisposed = true;
    dispose?.();
    dispose = undefined;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };
}
