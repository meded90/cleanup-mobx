import lodash from "lodash";

import { Disposer } from "../types/disposer";

const { isFunction } = lodash;

type RefLike<Type> = {
  readonly current: Type | null;
};

/**
 * Adds an event listener to a DOM element or object while cleaning up the previous listener:
 * on each new call, the previous listener is removed and its cleanup runs when needed.
 * @template Type - target element type (Element, Window, Document).
 * @template Key - event type.
 * @param type - event name (for example, 'click').
 * @param func - event handler that can return an optional cleanup function.
 * @param ref - target element or ref-like object pointing to it.
 * @param options - addEventListener options.
 * @returns function for removing the listener and running cleanup.
 */
export function cleanupEventListener<
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
 * Adds a window event listener.
 * @param type - window event.
 * @param func - event handler that can return optional cleanup.
 * @param options - addEventListener options.
 */
export function cleanupWindowEventListener<E extends keyof WindowEventMap>(
  type: E,
  func: (event: WindowEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener(type, func, window, options);
}

/**
 * Adds a document event listener.
 * @param type - document event.
 * @param func - event handler that can return optional cleanup.
 * @param options - addEventListener options.
 */
export function cleanupDocumentEventListener<E extends keyof DocumentEventMap>(
  type: E,
  func: (event: DocumentEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener(type, func, document, options);
}

/**
 * Adds an event listener to document.body.
 * @param type - HTML element event.
 * @param func - event handler that can return optional cleanup.
 * @param options - addEventListener options.
 */
export function cleanupBodyEventListener<E extends keyof HTMLElementEventMap>(
  type: E,
  func: (event: HTMLElementEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener(type, func, document.body, options);
}

/**
 * Adds an event listener to the element found by selector.
 * @param selector - CSS selector used to find the element.
 * @param type - HTML element event.
 * @param func - event handler that can return optional cleanup.
 * @param options - addEventListener options.
 */
export function cleanupSelectorEventListener<E extends keyof HTMLElementEventMap>(
  selector: string,
  type: E,
  func: (event: HTMLElementEventMap[E] | void) => ReturnType,
  options?: boolean | AddEventListenerOptions,
) {
  return cleanupEventListener<Element, E>(type, func, document.querySelector(selector), options);
}

export default cleanupEventListener;
