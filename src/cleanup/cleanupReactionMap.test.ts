import { observable, runInAction } from "mobx";
import { describe, expect, it, vi } from "vitest";

import { cleanupReactionMap } from "./cleanupReactionMap";

describe("cleanupReactionMap", () => {
  // Correctly maps keys to values in the reaction map
  it("should correctly map keys to values in the reaction map", () => {
    const expression = vi.fn(
      () =>
        new Map([
          ["key1", "value1"],
          ["key2", "value2"],
        ]),
    );
    const effect = vi.fn();
    const opts = {};

    const disposer = cleanupReactionMap(expression, effect, opts);

    expect(expression).toHaveBeenCalled();
    disposer();
  });

  // Executes the effect function for new entries
  it("should execute the effect function for new entries", () => {
    const expression = vi.fn(() => new Map([["key1", "value1"]]));
    const effect = vi.fn();
    const opts = {};

    const disposer = cleanupReactionMap(expression, effect, opts);

    expect(effect).toHaveBeenCalledWith(
      "value1",
      "key1",
      undefined,
      expect.any(Map),
      expect.any(Object),
    );
    disposer();
  });

  // Handles empty maps without errors
  it("should handle empty maps without errors", () => {
    const expression = vi.fn(() => new Map());
    const effect = vi.fn();
    const opts = {};

    const disposer = cleanupReactionMap(expression, effect, opts);

    expect(effect).not.toHaveBeenCalled();
    disposer();
  });

  // Manages maps with only one entry
  it("should manage maps with only one entry", () => {
    const expression = vi.fn(() => new Map([["key1", "value1"]]));
    const effect = vi.fn();
    const opts = {};

    const disposer = cleanupReactionMap(expression, effect, opts);

    expect(effect).toHaveBeenCalledWith(
      "value1",
      "key1",
      undefined,
      expect.any(Map),
      expect.any(Object),
    );
    disposer();
  });

  // Handles maps with non-string keys
  it("should handle maps with non-string keys", () => {
    const expression = vi.fn(
      () =>
        new Map<any, string>([
          [1, "value1"],
          [2n, "value2"],
        ]),
    );
    const effect = vi.fn();
    const opts = {};

    const disposer = cleanupReactionMap(expression, effect, opts);

    expect(effect).toHaveBeenCalledWith(
      "value1",
      1,
      undefined,
      expect.any(Map),
      expect.any(Object),
    );
    expect(effect).toHaveBeenCalledWith(
      "value2",
      2n,
      undefined,
      expect.any(Map),
      expect.any(Object),
    );
    disposer();
  });

  it("should recreate child reactions when keys change without size change", () => {
    const map = observable.map([["key1", "value1"]]);
    const disposeKey1 = vi.fn();
    const effect = vi.fn((value: string, key: string) => {
      if (key === "key1") {
        return disposeKey1;
      }
    });

    const disposer = cleanupReactionMap(() => map, effect);

    runInAction(() => {
      map.delete("key1");
      map.set("key2", "value2");
    });

    expect(disposeKey1).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledWith("value2", "key2", undefined, map, expect.any(Object));
    disposer();
  });

  it("should fire for entries added after initialization when fireImmediately is false", () => {
    const map = observable.map<string, string>();
    const effect = vi.fn();

    const disposer = cleanupReactionMap(() => map, effect, { fireImmediately: false });

    expect(effect).not.toHaveBeenCalled();

    runInAction(() => {
      map.set("key1", "value1");
    });

    expect(effect).toHaveBeenCalledWith("value1", "key1", undefined, map, expect.any(Object));
    disposer();
  });
});
