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
 * Создает MobX reaction для Map-структур с setup/cleanup pattern:
 * отслеживает добавление и удаление ключей, очищает предыдущие эффекты.
 * @param expression - функция, возвращающая Map или ObservableMap для отслеживания.
 * @param effect - функция-эффект для каждого нового значения (val, key, prev, map, r), возвращает disposer.
 * @param opts - опции реакции MobX.
 * @returns IReactionDisposer — функцию для отмены реакции и очистки всех эффектов.
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
