import lodash from "lodash";

import { Disposer } from "../types/disposer";

const { isFunction } = lodash;

/**
 * Setup/cleanup wrapper for requestAnimationFrame.
 * On rerun, the previous frame is cancelled and its cleanup runs.
 * @param cb - function called in the animation frame; may return an optional cleanup function.
 * @returns function for cancelling the requested frame and running cleanup.
 *
 * @example
 * const dispose = cleanupRequestAnimationFrame(() => {
 *   // animation code
 *   return () => {
 *     // optional cleanup
 *   }
 * })
 *
 * // Cancel and clean up:
 * dispose()
 */
export function cleanupRequestAnimationFrame(cb: () => Disposer): () => void {
  let dispose: void | (() => void);
  let isCancelled = false;

  function innerCb() {
    if (isCancelled) {
      return;
    }
    const effect = cb();
    dispose = isFunction(effect) ? effect : undefined;
  }

  const animationFrameId = requestAnimationFrame(innerCb);

  return () => {
    isCancelled = true;
    dispose?.();
    cancelAnimationFrame(animationFrameId);
  };
}
