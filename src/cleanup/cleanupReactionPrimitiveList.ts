import {
  action,
  comparer,
  IReactionDisposer,
  IReactionOptions,
  IReactionPublic,
  reaction,
} from "mobx";
/**
 * Primitive value type supported by cleanupReactionPrimitiveList.
 */
export type Primitive = string | number | bigint;

/**
 * Extracts the item type from an Iterable collection.
 */
type IterableElement<T> = T extends Iterable<infer E> ? E : never;

export interface CleanupReactionPrimitiveListOptions<
  T extends Primitive,
  FireImmediately extends boolean = true,
> extends IReactionOptions<T, FireImmediately> {}

type IDisposerParams = (() => void) | void;

/**
 * Creates a MobX reaction for primitive lists with the setup/cleanup pattern:
 * handles item additions and removals while cleaning up previous effects.
 *
 * Unlike cleanupReactionList, this function is optimized for arrays or Sets
 * of primitive values (string | number | bigint) and uses Set operations for
 * efficient O(1) comparison.
 *
 * **Key behavior:**
 * - The effect runs only for **unique** items; duplicates are ignored
 * - Supports both `T[]` and `Set<T>` inputs
 * - Automatically calls an item's disposer when the item is removed
 * - Adding a duplicate of an existing item does NOT run the effect again
 *
 * @param expression - function that returns the primitive array or Set to observe.
 * @param effect - effect function for each **unique** new item (arg, prev, r); returns a disposer.
 * @param opts - MobX reaction options.
 * @returns IReactionDisposer for stopping the reaction and cleaning up all effects.
 *
 * @example
 * // Working with a numeric ID array
 * let data = observable([1, 2, 3])
 * cleanupReactionPrimitiveList(
 *   () => data,
 *   (id) => {
 *     console.log('Added:', id)
 *     return () => console.log('Removed:', id)
 *   }
 * )
 * data.push(4) // Added: 4
 * data.pop() // Removed: 4
 *
 * @example
 * // Working with a Set when uniqueness must be guaranteed
 * const activeIds = observable(new Set<number>([1, 2, 3]))
 * cleanupReactionPrimitiveList(
 *   () => activeIds,
 *   (id) => {
 *     console.log('Subscribed to:', id)
 *     return () => console.log('Unsubscribed from:', id)
 *   }
 * )
 * runInAction(() => activeIds.add(4)) // Subscribed to: 4
 * runInAction(() => activeIds.delete(4)) // Unsubscribed from: 4
 */
export function cleanupReactionPrimitiveList<
  C extends Iterable<Primitive>,
  T extends Primitive = IterableElement<C> & Primitive,
  FireImmediately extends boolean = true,
>(
  expression: (r: IReactionPublic) => C,
  effect: (
    arg: IterableElement<C> & Primitive,
    prev: FireImmediately extends true
      ? Set<IterableElement<C> & Primitive> | undefined
      : Set<IterableElement<C> & Primitive>,
    r: IReactionPublic,
  ) => IDisposerParams,
  opts: CleanupReactionPrimitiveListOptions<T, FireImmediately> = {},
): IReactionDisposer {
  type E = IterableElement<C> & Primitive;
  const localDisposer = new Map<E, IDisposerParams>();

  // Create a comparer for primitive arrays.
  const arrayComparer = (newArray: Set<E>, oldArray: Set<E>): boolean => {
    if (newArray.size !== oldArray.size) {
      return false;
    }

    // Use structural comparison for primitive values.
    return comparer.structural(newArray, oldArray);
  };

  const newEffect = action(
    (
      arg: Set<E>,
      prev: FireImmediately extends true ? Set<E> | undefined : Set<E>,
      r: IReactionPublic,
    ) => {
      const prevSet = prev ?? new Set<E>();
      // Find removed items (present previously, absent currently) in O(m).
      const removedItems = prevSet?.difference(arg);

      // Clean up effects for removed items.
      for (const item of removedItems) {
        const disposer = localDisposer.get(item);
        if (disposer) {
          disposer();
          localDisposer.delete(item);
        }
      }

      // Add effects for new unique items.
      // Use a Set to track items already handled in this iteration.
      const effectAction = action(effect);
      const newItems = arg.difference(prevSet);
      for (const item of newItems) {
        localDisposer.set(item, effectAction(item, prev, r));
      }
    },
  );

  const disposer = reaction<Set<E>, FireImmediately>(
    (r) => {
      return new Set<E>(expression(r) as Iterable<E>);
    },
    newEffect,
    {
      fireImmediately: true,
      ...opts,
      equals: arrayComparer,
    } as IReactionOptions<Set<E>, FireImmediately>,
  );

  // @ts-ignore
  const newDisposer: IReactionDisposer = () => {
    localDisposer.forEach((v) => v?.());

    disposer();
  };

  // @ts-ignore
  newDisposer.$mobx = disposer.$mobx;
  return newDisposer;
}
