import { isFunction, isString } from "lodash";
import { action } from "mobx";

import ms, { StringValue } from "../ms";

/**
 * Setup/cleanup wrapper for setTimeout:
 * when rerun, the previous timeout is cleared and its cleanup runs.
 * @param cb - effect function called after the delay; may return a cleanup function.
 * @param delay - delay in milliseconds or a string accepted by ms().
 * @param dispose - optional cleanup function for the previous effect.
 * @returns function for cancelling the timeout and running cleanup.
 */
export function cleanupTimeout(
  cb: () => void,
  delay: number | StringValue,
  dispose?: void | (() => void),
): () => void {
  function innerCb() {
    const effect = action(cb)();
    dispose = isFunction(effect) ? effect : undefined;
  }

  delay = isString(delay) ? ms(delay) : delay;
  const timeoutId = setTimeout(innerCb, delay);
  return action(() => {
    dispose?.();
    clearTimeout(timeoutId);
  });
}
