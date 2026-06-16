import {
  action,
  comparer,
  IReactionDisposer,
  IReactionOptions,
  IReactionPublic,
  reaction,
} from "mobx";
/**
 * Тип примитива для cleanupReactionPrimitiveList
 */
export type Primitive = string | number | bigint;

/**
 * Извлекает тип элемента из Iterable коллекции
 */
type IterableElement<T> = T extends Iterable<infer E> ? E : never;

export interface CleanupReactionPrimitiveListOptions<
  T extends Primitive,
  FireImmediately extends boolean = true,
> extends IReactionOptions<T, FireImmediately> {}

type IDisposerParams = (() => void) | void;

/**
 * Создает MobX reaction для списков примитивов с setup/cleanup pattern:
 * обрабатывает появление и удаление элементов, очищая предыдущие эффекты.
 *
 * В отличие от cleanupReactionList, эта функция оптимизирована для работы
 * с массивами или Set примитивов (string | number | bigint) и использует Set для
 * эффективного сравнения O(1).
 *
 * **Ключевые особенности:**
 * - Эффект вызывается только для **уникальных** элементов — дубликаты игнорируются
 * - Поддерживает как `T[]`, так и `Set<T>` в качестве входных данных
 * - При удалении элемента автоматически вызывается его disposer
 * - При добавлении дубликата уже существующего элемента эффект НЕ вызывается повторно
 *
 * @param expression - функция, возвращающая массив или Set примитивов для отслеживания.
 * @param effect - функция-эффект для каждого **уникального** нового элемента (arg, prev, r), возвращает disposer.
 * @param opts - опции реакции MobX.
 * @returns IReactionDisposer — функцию для отмены реакции и очистки всех эффектов.
 *
 * @example
 * // Работа с массивом ID (числа)
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
 * // Работа с Set — удобно когда нужно гарантировать уникальность
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

  // Создаем компаратор для массивов примитивов
  const arrayComparer = (newArray: Set<E>, oldArray: Set<E>): boolean => {
    if (newArray.size !== oldArray.size) {
      return false;
    }

    // Для примитивов используем structural comparer
    return comparer.structural(newArray, oldArray);
  };

  const newEffect = action(
    (
      arg: Set<E>,
      prev: FireImmediately extends true ? Set<E> | undefined : Set<E>,
      r: IReactionPublic,
    ) => {
      const prevSet = prev ?? new Set<E>();
      // Найти удаленные элементы (есть в предыдущем, нет в текущем) - O(m)
      const removedItems = prevSet?.difference(arg);

      // Очистить эффекты для удаленных элементов
      for (const item of removedItems) {
        const disposer = localDisposer.get(item);
        if (disposer) {
          disposer();
          localDisposer.delete(item);
        }
      }

      // Добавить эффекты для новых уникальных элементов
      // Используем Set для отслеживания уже обработанных элементов в текущей итерации
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
