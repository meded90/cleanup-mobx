import {
  comparer,
  IReactionDisposer,
  IReactionOptions,
  IReactionPublic,
  ObservableMap,
} from "mobx";

import { cleanupReaction } from "./cleanupReaction";

type MapSnapshot<Key extends string | number | bigint, T, IMap extends Map<Key, T>> = {
  keys: Key[];
  map: IMap | ObservableMap<Key, T>;
};

function hasSameKeys<Key extends string | number | bigint, T, IMap extends Map<Key, T>>(
  prev: MapSnapshot<Key, T, IMap>,
  next: MapSnapshot<Key, T, IMap>,
): boolean {
  return comparer.shallow(prev.keys, next.keys);
}

/**
 * Creates a MobX reaction for Map structures with the setup/cleanup pattern:
 * tracks key additions and removals while cleaning up previous effects.
 * @param expression - function that returns the Map or ObservableMap to observe.
 * @param effect - effect function for each new value (val, key, prev, map, r); returns a disposer.
 * @param opts - MobX reaction options.
 * @returns IReactionDisposer for stopping the reaction and cleaning up all effects.
 */
export function cleanupReactionMap<
  Key extends string | number | bigint = string,
  T = any,
  IMap extends Map<Key, T> = Map<Key, T>,
  FireImmediately extends boolean = true,
>(
  expression: (r: IReactionPublic) => IMap | ObservableMap<Key, T>,
  effect: (
    arg: T,
    key: Key,
    prev: FireImmediately extends true ? T | undefined : T,
    map: IMap,
    r: IReactionPublic,
  ) => ((isModified?: boolean) => void) | void,
  opts: IReactionOptions<T, FireImmediately> = {},
): IReactionDisposer {
  const localDisposer = new Map<Key, ((isModified?: boolean) => void) | void>();
  let isInitialRun = true;

  const disposer = cleanupReaction<MapSnapshot<Key, T, IMap>>(
    (r) => {
      const map = expression(r);
      return {
        keys: [...map.keys()],
        map,
      };
    },
    (arg) => {
      // remove disposer
      for (const key of localDisposer.keys()) {
        if (!arg.map.has(key)) {
          localDisposer.get(key)?.();
          localDisposer.delete(key);
        }
      }

      // add disposer
      for (const key of arg.keys) {
        if (!localDisposer.has(key)) {
          localDisposer.set(
            key,
            cleanupReaction(
              (r) => {
                return expression(r).get(key)!;
              },
              (v, prev, r) => {
                // @ts-ignore
                return effect(v, key, prev, expression(r), r);
              },
              isInitialRun ? opts : ({ ...opts, fireImmediately: true } as typeof opts),
            ),
          );
        }
      }

      isInitialRun = false;
    },
    {
      fireImmediately: true,
      equals: hasSameKeys,
    },
  );

  // @ts-ignore
  const newDisposer: IReactionDisposer = () => {
    disposer();
    localDisposer.forEach((v) => {
      v?.();
    });
  };

  // @ts-ignore
  newDisposer.$mobx = disposer.$mobx;
  return newDisposer;
}
