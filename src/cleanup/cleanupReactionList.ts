import {
  action,
  comparer,
  IReactionDisposer,
  IReactionOptions,
  IReactionPublic,
  reaction,
} from "mobx";

/**
 * Options for cleanupReactionList.
 * @template T - array item type (must be an object)
 * @template FireImmediately - whether the reaction fires immediately
 */
export interface CleanupReactionListOptions<
  T extends object,
  FireImmediately extends boolean = true,
> extends IReactionOptions<T, FireImmediately> {
  /**
   * Returns a unique key for an item.
   * Used to identify objects while comparing list changes.
   * @example (item) => item.id
   */
  getKey: (item: T) => string | number | bigint;
}

type IDisposerParams = ((isModified?: boolean) => void) | void;

/**
 * Creates a MobX reaction for object lists with the setup/cleanup pattern:
 * handles item additions, removals, and modifications while cleaning up previous effects.
 *
 * Use {@link cleanupReactionPrimitiveList} for primitive values
 * (string | number | bigint).
 *
 * @template T - array item type (must be an object)
 * @template FireImmediately - whether the reaction fires immediately
 *
 * @param expression - function that returns the object array to observe.
 * @param effect - effect function for each new or changed item (arg, index, list, prev, r);
 *                 returns a disposer that supports isModified.
 * @param opts - MobX reaction options plus the required getKey object identifier.
 * @returns IReactionDisposer for stopping the reaction and cleaning up all effects.
 *
 * @example
 * // Object list with getKey
 * cleanupReactionList(
 *   () => [{id: 1, name: 'A'}, {id: 2, name: 'B'}],
 *   (item) => {
 *     console.log('Added:', item)
 *     return (isModified) => {
 *       if (isModified) return // The object changed; do not remove it
 *       console.log('Removed:', item)
 *     }
 *   },
 *   { getKey: (item) => item.id }
 * )
 *
 * @example
 * // Handling item modifications
 * cleanupReactionList(
 *   () => store.users,
 *   (user) => {
 *     const subscription = api.subscribeToUser(user.id)
 *     return (isModified) => {
 *       if (isModified) {
 *         // The item changed, so the resource can be updated without resubscribing
 *         subscription.update(user)
 *         return
 *       }
 *       // The item was removed, so clean up the subscription
 *       subscription.unsubscribe()
 *     }
 *   },
 *   { getKey: (user) => user.id }
 * )
 */
export function cleanupReactionList<T extends object, FireImmediately extends boolean = true>(
  expression: (r: IReactionPublic) => T[],
  effect: (
    arg: T,
    index: number,
    list: T[],
    prev: FireImmediately extends true ? T[] | undefined : T[],
    r: IReactionPublic,
  ) => IDisposerParams,
  opts: CleanupReactionListOptions<T, FireImmediately>,
): IReactionDisposer {
  const { getKey, equals: customEquals, ...reactionOpts } = opts;
  const localDisposer = new Map<string | number | bigint, IDisposerParams>();
  const equalsComparer: (a: any, b: any) => boolean = customEquals ?? comparer.default;

  // Create an array comparer that delegates item comparisons to the custom comparer.
  const arrayComparer = (newArray: T[], oldArray: T[]): boolean => {
    if (newArray.length !== oldArray.length) {
      return false;
    }

    // Use MobX structural comparison for the array when no custom comparer is provided.
    if (!customEquals) {
      return comparer.structural(newArray, oldArray);
    }

    // Compare each item with the custom comparer.
    for (const [i, element] of newArray.entries()) {
      if (!equalsComparer(element, oldArray[i])) {
        return false;
      }
    }
    return true;
  };

  const newEffect = action(
    (arg: T[], prev: FireImmediately extends true ? T[] | undefined : T[], r: IReactionPublic) => {
      // Build a Map for O(1) lookup of previous items by key.
      const prevKeysMap = new Map<string | number | bigint, T>();
      prev?.forEach((v) => {
        prevKeysMap.set(getKey(v), v);
      });

      // Build a Set for O(1) lookup of current keys.
      const currentKeysSet = new Set<string | number | bigint>();
      arg.forEach((v) => {
        currentKeysSet.add(getKey(v));
      });

      // Find new items in O(n) instead of O(n*m).
      const newArg = arg.filter((v) => {
        const vKey = getKey(v);
        return !prevKeysMap.has(vKey);
      });

      // Find removed items in O(m) instead of O(n*m).
      const removeArg = prev?.filter((v) => {
        const vKey = getKey(v);
        return !currentKeysSet.has(vKey);
      });

      // Clean up effects for removed items.
      removeArg?.forEach((v) => {
        const key = getKey(v);
        const disposer = localDisposer.get(key);
        if (disposer) {
          disposer(); // Omit isModified, which means false/removal.
          localDisposer.delete(key);
        }
      });

      // Handle changed items.
      arg.forEach((v, index) => {
        const key = getKey(v);
        const prevItem = prevKeysMap.get(key); // O(1) instead of O(m).

        // The item existed before and has changed.
        if (prevItem && !equalsComparer(v, prevItem)) {
          const disposer = localDisposer.get(key);
          if (disposer) {
            disposer(true); // isModified = true
          }
          // Create a new effect for the changed item.
          const effectAction = action(effect);
          localDisposer.set(key, effectAction(v, index, arg, prev, r));
        }
      });

      // Add effects for new items.
      // Build a Map for O(1) index lookup instead of O(n) indexOf.
      const indexMap = new Map<T, number>();
      arg.forEach((v, index) => {
        indexMap.set(v, index);
      });

      const effectAction = action(effect);
      newArg.forEach((v) => {
        const key = getKey(v);
        const index = indexMap.get(v) ?? 0;
        localDisposer.set(key, effectAction(v, index, arg, prev, r));
      });
    },
  );

  const disposer = reaction(
    (r) => {
      // Read the array and clone it so changes can be tracked.
      const arr = expression(r);
      return [...arr];
    },
    newEffect,
    {
      fireImmediately: true,
      ...reactionOpts,
      equals: arrayComparer,
    } as IReactionOptions<T[], FireImmediately>,
  );

  // @ts-ignore
  const newDisposer: IReactionDisposer = () => {
    localDisposer.forEach((v) => {
      v?.();
    });

    disposer();
  };

  // @ts-ignore
  newDisposer.$mobx = disposer.$mobx;
  return newDisposer;
}
