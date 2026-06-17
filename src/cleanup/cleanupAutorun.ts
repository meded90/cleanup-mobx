import { autorun, IReactionPublic } from "mobx";

import { EMPTY_OBJECT } from "../types/disposer";

import type { IAutorunOptions } from "mobx";

/**
 * Creates a MobX autorun with cleanup before each rerun:
 * the previous effect is automatically cleaned up on every run.
 * @param effect - effect function that returns a cleanup disposer.
 * @param opts - MobX autorun options.
 * @returns function for stopping the autorun and cleaning up the inner effect.
 */
export function cleanupAutorun(
  effect: (r: IReactionPublic) => (() => void) | void,
  opts: IAutorunOptions = EMPTY_OBJECT,
) {
  let localDisposer: (() => void) | undefined;

  const newEffect = (r: IReactionPublic) => {
    localDisposer?.();
    localDisposer = effect(r) ?? undefined;
  };

  const disposer = autorun(newEffect, opts);

  const newDisposer = () => {
    localDisposer?.();
    disposer();
  };

  return newDisposer;
}
