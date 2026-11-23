import { _getGlobalState, action, autorun, observable, runInAction } from "mobx";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupReaction } from "./cleanupReaction";
import { cleanupReactionList } from "./cleanupReactionList";
import { cleanupReactionPrimitiveList } from "./cleanupReactionPrimitiveList";

vi.mock("mobx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("mobx")>();
  return { ...actual, action: vi.fn(actual.action) };
});

const actionSpy = vi.mocked(action);
const FIRINGS = 100;

// reaction() сам исполняет effect внутри action, поэтому helper не должен создавать собственные обёртки.
describe("cleanup reactions: создание action", () => {
  beforeEach(() => {
    actionSpy.mockClear();
  });

  it("cleanupReaction не создаёт собственный action", () => {
    const box = observable.box(0);
    const effect = vi.fn(() => () => {});
    const dispose = cleanupReaction(() => box.get(), effect);

    for (let i = 1; i <= FIRINGS; i++) {
      runInAction(() => box.set(i));
    }

    expect(effect).toHaveBeenCalledTimes(FIRINGS + 1);
    expect(actionSpy).not.toHaveBeenCalled();
    dispose();
  });

  it("cleanupReactionList не создаёт собственный action, в том числе на изменённый элемент", () => {
    type Item = { id: number; ts: number };
    const createList = (ts: number): Item[] => Array.from({ length: 10 }, (_, id) => ({ id, ts }));
    const box = observable.box<Item[]>(createList(0), { deep: false });
    const effect = vi.fn();
    const dispose = cleanupReactionList(() => box.get(), effect, {
      getKey: (item) => item.id,
      equals: (a: Item, b: Item) => a.ts === b.ts,
    });

    for (let i = 1; i <= FIRINGS; i++) {
      runInAction(() => box.set(createList(i)));
    }

    expect(effect).toHaveBeenCalledTimes(10 + FIRINGS * 10);
    expect(actionSpy).not.toHaveBeenCalled();
    dispose();
  });

  it("cleanupReactionPrimitiveList не создаёт собственный action", () => {
    const box = observable.box<number[]>([1], { deep: false });
    const effect = vi.fn();
    const dispose = cleanupReactionPrimitiveList(() => box.get(), effect);

    for (let i = 0; i < FIRINGS; i++) {
      runInAction(() => box.set(i % 2 === 0 ? [1, 2] : [1]));
    }

    expect(effect).toHaveBeenCalledTimes(1 + FIRINGS / 2);
    expect(actionSpy).not.toHaveBeenCalled();
    dispose();
  });
});

describe("cleanupReaction: контракт эффекта", () => {
  it("очищает предыдущий эффект с isModified=true до нового и без аргумента при dispose", () => {
    const box = observable.box(0);
    const log: string[] = [];
    const dispose = cleanupReaction(
      () => box.get(),
      (value, prev) => {
        log.push(`effect:${value}:${prev}`);
        return (isModified?: boolean) => {
          log.push(`cleanup:${value}:${isModified}`);
        };
      },
    );

    runInAction(() => box.set(1));
    runInAction(() => box.set(2));
    dispose();
    runInAction(() => box.set(3));

    expect(log).toEqual([
      "effect:0:undefined",
      "cleanup:0:true",
      "effect:1:0",
      "cleanup:1:true",
      "effect:2:1",
      "cleanup:2:undefined",
    ]);
  });

  it("выполняет cleanup и эффект одним batch без подписки на прочитанные в эффекте значения", () => {
    const trigger = observable.box(0);
    const fromCleanup = observable.box(0);
    const fromEffect = observable.box(0);
    const untrackedDependency = observable.box(0);
    const effect = vi.fn((value: number) => {
      untrackedDependency.get();
      fromEffect.set(value);
      fromEffect.set(value * 10);
      return () => {
        fromCleanup.set(value);
      };
    });
    const dispose = cleanupReaction(() => trigger.get(), effect);
    const seen: string[] = [];
    const stop = autorun(() => {
      seen.push(`${fromCleanup.get()}/${fromEffect.get()}`);
    });

    runInAction(() => trigger.set(1));
    runInAction(() => trigger.set(2));
    runInAction(() => untrackedDependency.set(1));

    expect(seen).toEqual(["0/0", "0/10", "1/20"]);
    expect(effect).toHaveBeenCalledTimes(3);
    stop();
    dispose();
  });

  it("передаёт ошибку эффекта в onError и продолжает работать", () => {
    const box = observable.box(0);
    const onError = vi.fn();
    const cleanup = vi.fn();
    const dispose = cleanupReaction(
      () => box.get(),
      (value) => {
        if (value === 1) {
          throw new Error("effect failed");
        }
        return cleanup;
      },
      { onError },
    );

    runInAction(() => box.set(1));
    expect(onError).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenLastCalledWith(true);

    runInAction(() => box.set(2));
    dispose();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(3);
    expect(cleanup).toHaveBeenLastCalledWith();
  });
});

/**
 * Effect исполняется на глубине batch 2: batch запуска reaction и её собственный action.
 * Каждая вложенная action-обёртка helper увеличила бы глубину.
 */
const REACTION_EFFECT_BATCH_DEPTH = 2;

describe("cleanup reactions: глубина batch эффекта", () => {
  const sameDepth = (length: number): number[] =>
    Array.from({ length }, () => REACTION_EFFECT_BATCH_DEPTH);

  it("cleanupReaction исполняет effect без вложенного action", () => {
    const box = observable.box(0);
    const depths: number[] = [];
    const dispose = cleanupReaction(
      () => box.get(),
      () => {
        depths.push(_getGlobalState().inBatch);
      },
    );

    for (let i = 1; i <= 20; i++) {
      runInAction(() => box.set(i));
    }

    expect(depths).toEqual(sameDepth(21));
    dispose();
  });

  it("cleanupReactionList исполняет effect элементов без вложенных action", () => {
    type Item = { id: number; ts: number };
    const createList = (ts: number): Item[] => Array.from({ length: 3 }, (_, id) => ({ id, ts }));
    const box = observable.box<Item[]>(createList(0), { deep: false });
    const depths: number[] = [];
    const dispose = cleanupReactionList(
      () => box.get(),
      () => {
        depths.push(_getGlobalState().inBatch);
      },
      { getKey: (item) => item.id, equals: (a: Item, b: Item) => a.ts === b.ts },
    );

    for (let i = 1; i <= 20; i++) {
      runInAction(() => box.set(createList(i)));
    }

    expect(depths).toEqual(sameDepth(3 + 20 * 3));
    dispose();
  });

  it("cleanupReactionPrimitiveList исполняет effect элементов без вложенных action", () => {
    const box = observable.box<number[]>([1], { deep: false });
    const depths: number[] = [];
    const dispose = cleanupReactionPrimitiveList(
      () => box.get(),
      () => {
        depths.push(_getGlobalState().inBatch);
      },
    );

    for (let i = 1; i <= 20; i++) {
      runInAction(() => box.set(i % 2 === 1 ? [1, 2] : [1]));
    }

    expect(depths).toEqual(sameDepth(1 + 20 / 2));
    dispose();
  });
});
