import { isFunction, isString } from "lodash";

import ms, { StringValue } from "../ms";
import { Disposer } from "../types/disposer";

/**
 * Запускает асинхронный эффект с интервалом, очищая предыдущий результат перед новым вызовом.
 * @param cb - функция, возвращающая disposer (или промис с disposer).
 * @param delay - задержка между вызовами (ms или строка формата ms-функции).
 * @returns функцию для остановки интервала и очистки последнего эффекта.
 */
export function cleanupInterval(cb: () => Disposer, delay: number | StringValue): () => void {
  let dispose: void | (() => void);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let isDisposed = false;

  const intervalMs = isString(delay) ? ms(delay) : delay;

  async function run(): Promise<void> {
    if (isDisposed) {
      return;
    }

    dispose?.();
    const effect = await cb();
    dispose = isFunction(effect) ? effect : undefined;

    if (isDisposed) {
      return;
    }

    timeoutId = setTimeout(run, intervalMs);
  }

  timeoutId = setTimeout(run, intervalMs);

  return () => {
    isDisposed = true;
    dispose?.();
    dispose = undefined;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };
}
