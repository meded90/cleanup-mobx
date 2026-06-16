import { isFunction } from "lodash";

import { Disposer } from "../types/disposer";

/**
 * Setup/cleanup обертка для requestAnimationFrame.
 * При повторном вызове предыдущий кадр отменяется и выполняется его очистка.
 * @param cb - функция, вызываемая в анимационном кадре, возвращает опциональную функцию очистки.
 * @returns функцию для отмены запрошенного кадра и выполнения очистки.
 *
 * @example
 * const dispose = cleanupRequestAnimationFrame(() => {
 *   // код анимации
 *   return () => {
 *     // опциональная очистка
 *   }
 * })
 *
 * // Отмена и очистка:
 * dispose()
 */
export function cleanupRequestAnimationFrame(cb: () => Disposer): () => void {
  let dispose: void | (() => void);
  let isCancelled = false;

  function innerCb() {
    if (isCancelled) {
      return;
    }
    const effect = cb();
    dispose = isFunction(effect) ? effect : undefined;
  }

  const animationFrameId = requestAnimationFrame(innerCb);

  return () => {
    isCancelled = true;
    dispose?.();
    cancelAnimationFrame(animationFrameId);
  };
}
