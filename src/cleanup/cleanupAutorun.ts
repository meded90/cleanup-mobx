import { autorun, IReactionPublic } from "mobx";

import { EMPTY_OBJECT } from "../types/disposer";

import type { IAutorunOptions } from "mobx";

/**
 * Создает MobX autorun с cleanup перед повторным запуском:
 * при каждом запуске предыдущий эффект автоматически очищается.
 * @param effect - функция-эффект, возвращающая disposer для очистки.
 * @param opts - опции autorun из MobX.
 * @returns функцию для отмены autorun и внутреннего эффекта.
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
