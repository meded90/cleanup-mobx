import { isFunction } from "lodash";
import { action } from "mobx";

type IdleHandle = number | ReturnType<typeof setTimeout>;

function requestIdleCallbackSafe(
  cb: IdleRequestCallback,
  options?: IdleRequestOptions,
): IdleHandle {
  if (globalThis.requestIdleCallback) {
    return globalThis.requestIdleCallback(cb, options);
  }

  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => 0,
    });
  }, 0);
}

function cancelIdleCallbackSafe(handle: IdleHandle): void {
  if (globalThis.cancelIdleCallback) {
    globalThis.cancelIdleCallback(handle as number);
    return;
  }

  clearTimeout(handle);
}

/**
 * Setup/cleanup wrapper for requestIdleCallback:
 * when cancelled, clears the scheduled idle callback and runs cleanup for the previous effect.
 */
export function cleanupIdleCallback(
  cb: (deadline: IdleDeadline) => void | (() => void),
  options?: IdleRequestOptions,
  dispose?: void | (() => void),
): () => void {
  const innerCb: IdleRequestCallback = (deadline) => {
    const effect = action(() => cb(deadline))();
    dispose = isFunction(effect) ? effect : undefined;
  };

  const idleId = requestIdleCallbackSafe(innerCb, options);

  return action(() => {
    dispose?.();
    cancelIdleCallbackSafe(idleId);
  });
}
