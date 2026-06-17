import { action, IReactionDisposer, IReactionOptions, IReactionPublic, reaction } from "mobx";

/**
 * Creates a MobX reaction with the setup/cleanup pattern:
 * the previous effect is automatically cleaned up before the next effect runs.
 * @param expression - expression used to track changes.
 * @param effect - effect function that receives current and previous values and returns a disposer.
 * @param opts - MobX reaction options (fireImmediately, equals, and so on).
 * @returns IReactionDisposer for stopping the reaction and cleaning up the reserved effect.
 */
export function cleanupReaction<T, FireImmediately extends boolean = true>(
  expression: (r: IReactionPublic) => T,
  effect: (
    arg: T,
    prev: FireImmediately extends true ? T | undefined : T,
    r: IReactionPublic,
  ) => (() => void) | void,
  opts: IReactionOptions<T, FireImmediately> = {},
): IReactionDisposer {
  let localDisposer: ((isModified?: boolean) => void) | undefined;
  const newEffect = (
    arg: T,
    prev: FireImmediately extends true ? T | undefined : T,
    r: IReactionPublic,
  ) => {
    localDisposer?.(true);
    const effectAction = action(effect);
    localDisposer = effectAction(arg, prev, r) ?? undefined;
  };

  const disposer = reaction(expression, newEffect, {
    fireImmediately: true,
    ...opts,
  } as IReactionOptions<T, FireImmediately>) as IReactionDisposer;

  // @ts-ignore
  const newDisposer: IReactionDisposer = () => {
    localDisposer?.();

    disposer();
  };
  // @ts-ignore
  newDisposer.$mobx = disposer.$mobx;
  return newDisposer;
}
