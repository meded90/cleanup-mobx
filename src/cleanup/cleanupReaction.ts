import { action, IReactionDisposer, IReactionOptions, IReactionPublic, reaction } from "mobx";

/**
 * Создает MobX реакцию reaction с setup/cleanup pattern:
 * перед выполнением нового эффекта предыдущий автоматически очищается.
 * @param expression - выражение для отслеживания изменений.
 * @param effect - функция-эффект, принимающая текущее и предыдущее значение, возвращающая disposer.
 * @param opts - опции реакции MobX (fireImmediately, equals и пр.).
 * @returns IReactionDisposer — функцию для отмены реакции и очистки зарезервированного эффекта.
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
