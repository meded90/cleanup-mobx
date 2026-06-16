import { isFunction, isString } from "lodash";
import { action } from "mobx";

import ms, { StringValue } from "../ms";

/**
 * Setup/cleanup обертка для setTimeout:
 * при повторном запуске предыдущий таймаут очищается и выполняется его очистка.
 * @param cb - функция-эффект, вызывается после задержки, может вернуть функцию очистки.
 * @param delay - задержка в мс или строка, допустимая для ms().
 * @param dispose - опциональная функция очистки для предыдущего эффекта.
 * @returns функцию для отмены таймаута и выполнения очистки.
 */
export function cleanupTimeout(
  cb: () => void,
  delay: number | StringValue,
  dispose?: void | (() => void),
): () => void {
  function innerCb() {
    const effect = action(cb)();
    dispose = isFunction(effect) ? effect : undefined;
  }

  delay = isString(delay) ? ms(delay) : delay;
  const timeoutId = setTimeout(innerCb, delay);
  return action(() => {
    dispose?.();
    clearTimeout(timeoutId);
  });
}
