export type Disposer = (() => void) | Promise<(() => unknown) | void> | void;
export type DisposerSync = (() => void) | void;

export const EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);

export const EMPTY_OBJECT = {};
Object.freeze(EMPTY_OBJECT);
