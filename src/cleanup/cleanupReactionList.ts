import {
  action,
  comparer,
  IReactionDisposer,
  IReactionOptions,
  IReactionPublic,
  reaction,
} from "mobx";

/**
 * Опции для cleanupReactionList.
 * @template T - тип элемента массива (должен быть объектом)
 * @template FireImmediately - флаг немедленного срабатывания реакции
 */
export interface CleanupReactionListOptions<
  T extends object,
  FireImmediately extends boolean = true,
> extends IReactionOptions<T, FireImmediately> {
  /**
   * Функция для получения уникального ключа из элемента.
   * Используется для идентификации объектов при сравнении.
   * @example (item) => item.id
   */
  getKey: (item: T) => string | number | bigint;
}

type IDisposerParams = ((isModified?: boolean) => void) | void;

/**
 * Создает MobX reaction для списков объектов с setup/cleanup pattern:
 * обрабатывает появление, удаление и модификацию элементов, очищая предыдущие эффекты.
 *
 * Для работы с примитивами (string | number | bigint) используйте
 * {@link cleanupReactionPrimitiveList}.
 *
 * @template T - тип элемента массива (должен быть объектом)
 * @template FireImmediately - флаг немедленного срабатывания реакции
 *
 * @param expression - функция, возвращающая массив объектов для отслеживания.
 * @param effect - функция-эффект для каждого нового/измененного элемента (arg, index, list, prev, r),
 *                 возвращает disposer с поддержкой isModified.
 * @param opts - опции реакции MobX + обязательный getKey для идентификации объектов.
 * @returns IReactionDisposer — функцию для отмены реакции и очистки всех эффектов.
 *
 * @example
 * // Работа с объектами и getKey
 * cleanupReactionList(
 *   () => [{id: 1, name: 'A'}, {id: 2, name: 'B'}],
 *   (item) => {
 *     console.log('Added:', item)
 *     return (isModified) => {
 *       if (isModified) return // Объект изменился, не удаляем
 *       console.log('Removed:', item)
 *     }
 *   },
 *   { getKey: (item) => item.id }
 * )
 *
 * @example
 * // Обработка модификации элемента
 * cleanupReactionList(
 *   () => store.users,
 *   (user) => {
 *     const subscription = api.subscribeToUser(user.id)
 *     return (isModified) => {
 *       if (isModified) {
 *         // Элемент изменился, можно обновить ресурс без переподписки
 *         subscription.update(user)
 *         return
 *       }
 *       // Элемент удалён - очищаем подписку
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

  // Создаем кастомный comparer для массивов, который использует пользовательский comparer для элементов
  const arrayComparer = (newArray: T[], oldArray: T[]): boolean => {
    if (newArray.length !== oldArray.length) {
      return false;
    }

    // Если нет кастомного компарера, используем structural для массива
    if (!customEquals) {
      return comparer.structural(newArray, oldArray);
    }

    // Сравниваем каждый элемент с помощью кастомного компарера
    for (const [i, element] of newArray.entries()) {
      if (!equalsComparer(element, oldArray[i])) {
        return false;
      }
    }
    return true;
  };

  const newEffect = action(
    (arg: T[], prev: FireImmediately extends true ? T[] | undefined : T[], r: IReactionPublic) => {
      // Создаём Map для быстрого O(1) поиска предыдущих элементов по ключу
      const prevKeysMap = new Map<string | number | bigint, T>();
      prev?.forEach((v) => {
        prevKeysMap.set(getKey(v), v);
      });

      // Создаём Set для быстрого O(1) поиска текущих ключей
      const currentKeysSet = new Set<string | number | bigint>();
      arg.forEach((v) => {
        currentKeysSet.add(getKey(v));
      });

      // Найти новые элементы - O(n) вместо O(n*m)
      const newArg = arg.filter((v) => {
        const vKey = getKey(v);
        return !prevKeysMap.has(vKey);
      });

      // Найти удаленные элементы - O(m) вместо O(n*m)
      const removeArg = prev?.filter((v) => {
        const vKey = getKey(v);
        return !currentKeysSet.has(vKey);
      });

      // Очистить эффекты для удаленных элементов
      removeArg?.forEach((v) => {
        const key = getKey(v);
        const disposer = localDisposer.get(key);
        if (disposer) {
          disposer(); // isModified не передаем, значит false (удаление)
          localDisposer.delete(key);
        }
      });

      // Обработать изменившиеся элементы
      arg.forEach((v, index) => {
        const key = getKey(v);
        const prevItem = prevKeysMap.get(key); // O(1) вместо O(m)

        // Если элемент существовал и изменился
        if (prevItem && !equalsComparer(v, prevItem)) {
          const disposer = localDisposer.get(key);
          if (disposer) {
            disposer(true); // isModified = true
          }
          // Создаем новый эффект для измененного элемента
          const effectAction = action(effect);
          localDisposer.set(key, effectAction(v, index, arg, prev, r));
        }
      });

      // Добавить эффекты для новых элементов
      // Создаём Map для быстрого O(1) поиска индексов вместо O(n) indexOf
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
      // Получаем массив и создаем его копию для отслеживания изменений
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
