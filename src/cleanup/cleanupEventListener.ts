import { isFunction } from "lodash";

import { Disposer } from "../types/disposer";

type RefLike<Type> = {
  readonly current: Type | null;
};

/**
 * Добавляет слушатель события к DOM-элементу или объекту, очищая предыдущий слушатель:
 * при новом добавлении предыдущий listener удаляется и по необходимости выполняется очистка.
 * @template Type - тип целевого элемента (Element, Window, Document).
 * @template Key - тип события.
 * @param type - имя события (например, 'click').
 * @param func - функция-обработчик, возвращающая опциональную функцию очистки.
 * @param ref - целевой элемент или ref-like объект к нему.
 * @param options - опции addEventListener.
 * @returns функцию для удаления слушателя и очистки.
 */
export default function cleanupEventListener<
  Type extends Element | HTMLDivElement | Window | Document | null,
  Key extends Type extends Window
    ? keyof WindowEventMap
    : Type extends Document
      ? keyof DocumentEventMap
      : keyof HTMLElementEventMap,
>(
  type: Key,
  func: (event: any | void) => Disposer,
  ref: RefLike<Type> | Type | null,
  options?: boolean | AddEventListenerOptions,
) {
  let current: Type | null = null;
  if (!ref) {
    return () => {};
  }
  if ("current" in ref) {
    current = ref.current;
  } else {
    current = ref;
  }

  let dispose: void | (() => void);

  async function innerCb(e: any) {
    dispose?.();
    const effect = await func(e);
    dispose = isFunction(effect) ? effect : undefined;
  }

  current?.addEventListener(type, innerCb, options);

  return () => {
    dispose?.();
    dispose = undefined;
    current?.removeEventListener(type, innerCb, options as EventListenerOptions);
  };
}

type ReturnType = (() => void) | Promise<(() => unknown) | void> | void;
/**
 * Добавляет слушатель окна (window).
 * @param type - событие окна.
 * @param func - функция-обработчик, возвращающая опциональную очистку.
 * @param options - опции addEventListener.
 */
export function cleanupWindowEventListener<E extends keyof WindowEventMap>(
  type: E,
  func: (event: WindowEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener(type, func, window, options);
}

/**
 * Добавляет слушатель документа (document).
 * @param type - событие документа.
 * @param func - функция-обработчик, возвращающая опциональную очистку.
 * @param options - опции addEventListener.
 */
export function cleanupDocumentEventListener<E extends keyof DocumentEventMap>(
  type: E,
  func: (event: DocumentEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener(type, func, document, options);
}

/**
 * Добавляет слушатель к body документа.
 * @param type - событие HTML-элемента.
 * @param func - функция-обработчик, возвращающая опциональную очистку.
 * @param options - опции addEventListener.
 */
export function cleanupBodyEventListener<E extends keyof HTMLElementEventMap>(
  type: E,
  func: (event: HTMLElementEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener(type, func, document.body, options);
}

/**
 * Добавляет слушатель к элементу, найденному по селектору.
 * @param selector - CSS-селектор для поиска элемента.
 * @param type - событие HTML-элемента.
 * @param func - функция-обработчик, возвращающая опциональную очистку.
 * @param options - опции addEventListener.
 */
export function cleanupSelectorEventListener<E extends keyof HTMLElementEventMap>(
  selector: string,
  type: E,
  func: (event: HTMLElementEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener<Element, E>(type, func, document.querySelector(selector), options);
}
