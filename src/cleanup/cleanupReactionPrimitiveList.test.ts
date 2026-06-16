import { observable, runInAction } from "mobx";
import { describe, expect, it, vi } from "vitest";

import { cleanupReactionPrimitiveList } from "./cleanupReactionPrimitiveList";

describe("cleanupReactionPrimitiveList", () => {
  describe("Работа с числами", () => {
    it("должен вызвать эффект для каждого элемента при инициализации", () => {
      const list = observable([1, 2, 3]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      expect(effect).toHaveBeenCalledWith(1, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(2, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(3, undefined, expect.any(Object));

      disposer();
    });

    it("должен вызвать эффект только для новых элементов при добавлении", () => {
      const list = observable([1, 2]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      runInAction(() => {
        list.push(3);
      });

      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(3, expect.any(Set), expect.any(Object));

      disposer();
    });

    it("должен вызвать disposer при удалении элемента", () => {
      const list = observable([1, 2, 3]);
      const disposerFn1 = vi.fn();
      const disposerFn2 = vi.fn();
      const disposerFn3 = vi.fn();

      const effect = vi.fn((id) => {
        if (id === 1) {
          return disposerFn1;
        }
        if (id === 2) {
          return disposerFn2;
        }
        if (id === 3) {
          return disposerFn3;
        }
      });

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(3);

      runInAction(() => {
        list.splice(1, 1); // Удаляем элемент 2
      });

      expect(disposerFn1).not.toHaveBeenCalled();
      expect(disposerFn2).toHaveBeenCalledTimes(1);
      expect(disposerFn3).not.toHaveBeenCalled();

      disposer();
    });

    it("должен вызвать все disposer при полной очистке списка", () => {
      const list = observable([1, 2, 3]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(3);

      runInAction(() => {
        list.clear();
      });

      expect(disposerFn).toHaveBeenCalledTimes(3);

      disposer();
    });

    it("должен вызвать все disposer при вызове главного disposer", () => {
      const list = observable([1, 2, 3]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(3);

      disposer();

      expect(disposerFn).toHaveBeenCalledTimes(3);
    });

    it("не должен вызывать эффект повторно для существующих элементов", () => {
      const list = observable([1, 2]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      runInAction(() => {
        list.push(3, 1); // Добавляем 3 (новый) и 1 (уже был)
      });

      // Должен вызваться только для 3, не для 1
      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(3, expect.any(Set), expect.any(Object));

      disposer();
    });

    it("должен работать с пустым массивом", () => {
      const list = observable<number>([]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).not.toHaveBeenCalled();

      runInAction(() => {
        list.push(1);
      });

      expect(effect).toHaveBeenCalledTimes(1);

      disposer();
    });
  });

  describe("Работа со строками", () => {
    it("должен вызвать эффект для каждой строки при инициализации", () => {
      const list = observable(["a", "b", "c"]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      expect(effect).toHaveBeenCalledWith("a", undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith("b", undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith("c", undefined, expect.any(Object));

      disposer();
    });

    it("должен корректно обрабатывать добавление и удаление строк", () => {
      const list = observable(["hello", "world"]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      runInAction(() => {
        list.push("foo");
        list.splice(0, 1); // Удаляем 'hello'
      });

      // Должен вызваться disposer для 'hello'
      expect(disposerFn).toHaveBeenCalledTimes(1);
      // Должен вызваться effect для 'foo'
      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith("foo", expect.any(Set), expect.any(Object));

      disposer();
    });

    it("должен работать с пустыми строками", () => {
      const list = observable(["", "a", ""]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      // Пустая строка считается одним элементом, дубликаты не создают новых эффектов
      expect(effect).toHaveBeenCalledTimes(2);

      disposer();
    });
  });

  describe("Работа с bigint", () => {
    it("должен вызвать эффект для каждого bigint при инициализации", () => {
      const list = observable([1n, 2n, 3n]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      expect(effect).toHaveBeenCalledWith(1n, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(2n, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(3n, undefined, expect.any(Object));

      disposer();
    });

    it("должен корректно обрабатывать добавление и удаление bigint", () => {
      const list = observable([100n, 200n]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      effect.mockClear();

      runInAction(() => {
        list.push(300n);
        list.splice(0, 1); // Удаляем 100n
      });

      expect(disposerFn).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(300n, expect.any(Set), expect.any(Object));

      disposer();
    });
  });

  describe("Edge cases", () => {
    it("должен работать при быстрых последовательных изменениях", () => {
      const list = observable([1, 2]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      effect.mockClear();

      runInAction(() => {
        list.push(3, 4);
        list.splice(0, 1); // Удаляем 1
      });

      expect(effect).toHaveBeenCalledTimes(2); // Только для 3 и 4

      disposer();
    });

    it("должен обрабатывать полную замену массива", () => {
      const list = observable([1, 2, 3]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      effect.mockClear();

      runInAction(() => {
        list.replace([4, 5]);
      });

      // Должны вызваться disposer для 1, 2, 3
      expect(disposerFn).toHaveBeenCalledTimes(3);
      // Должны создаться эффекты для 4, 5
      expect(effect).toHaveBeenCalledTimes(2);

      disposer();
    });

    it("должен работать с массивом из одного элемента", () => {
      const list = observable([1]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(1);

      disposer();
    });

    it("должен корректно обрабатывать null/undefined в effect", () => {
      const list = observable([1, 2]);
      const effect = vi.fn(() => {
        // Не возвращаем disposer
      });

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      expect(effect).toHaveBeenCalledTimes(2);

      // Не должно быть ошибок при удалении
      runInAction(() => {
        list.clear();
      });

      disposer();
    });

    it("должен вызываться только для уникальных элементов при наличии дубликатов", () => {
      const list = observable([1, 2, 1, 3]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      // Должен вызваться только для уникальных: 1, 2, 3
      expect(effect).toHaveBeenCalledTimes(3);
      expect(effect).toHaveBeenCalledWith(1, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(2, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(3, undefined, expect.any(Object));

      disposer();
    });

    it("должен корректно обрабатывать дубликаты при добавлении", () => {
      const list = observable([1, 2]);
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => list, effect);

      effect.mockClear();

      runInAction(() => {
        list.push(1); // Дубликат, не должен вызвать эффект
      });

      expect(effect).not.toHaveBeenCalled();

      disposer();
    });
  });

  describe("Работа с Set", () => {
    it("должен вызвать эффект для каждого элемента Set при инициализации", () => {
      const set = observable(new Set([1, 2, 3]));
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      expect(effect).toHaveBeenCalledWith(1, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(2, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(3, undefined, expect.any(Object));

      disposer();
    });

    it("должен вызвать эффект только для новых элементов при добавлении в Set", () => {
      const set = observable(new Set([1, 2]));
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      runInAction(() => {
        set.add(3);
      });

      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(3, expect.any(Object), expect.any(Object));

      disposer();
    });

    it("должен вызвать disposer при удалении элемента из Set", () => {
      const set = observable(new Set([1, 2, 3]));
      const disposerFn1 = vi.fn();
      const disposerFn2 = vi.fn();
      const disposerFn3 = vi.fn();

      const effect = vi.fn((id: number) => {
        if (id === 1) {
          return disposerFn1;
        }
        if (id === 2) {
          return disposerFn2;
        }
        if (id === 3) {
          return disposerFn3;
        }
      });

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(3);

      runInAction(() => {
        set.delete(2);
      });

      expect(disposerFn1).not.toHaveBeenCalled();
      expect(disposerFn2).toHaveBeenCalledTimes(1);
      expect(disposerFn3).not.toHaveBeenCalled();

      disposer();
    });

    it("должен вызвать все disposer при очистке Set", () => {
      const set = observable(new Set([1, 2, 3]));
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(3);

      runInAction(() => {
        set.clear();
      });

      expect(disposerFn).toHaveBeenCalledTimes(3);

      disposer();
    });

    it("не должен вызывать эффект при добавлении существующего элемента в Set", () => {
      const set = observable(new Set([1, 2]));
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      runInAction(() => {
        set.add(1); // Элемент уже существует - Set его проигнорирует
      });

      expect(effect).not.toHaveBeenCalled();

      disposer();
    });

    it("должен корректно обрабатывать замену Set", () => {
      const set = observable(new Set([1, 2, 3]));
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      effect.mockClear();

      runInAction(() => {
        set.clear();
        set.add(4);
        set.add(5);
      });

      // Должны вызваться disposer для 1, 2, 3
      expect(disposerFn).toHaveBeenCalledTimes(3);
      // Должны создаться эффекты для 4, 5
      expect(effect).toHaveBeenCalledTimes(2);

      disposer();
    });

    it("должен работать со строковым Set", () => {
      const set = observable(new Set(["a", "b", "c"]));
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      expect(effect).toHaveBeenCalledWith("a", undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith("b", undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith("c", undefined, expect.any(Object));

      disposer();
    });

    it("должен работать с bigint Set", () => {
      const set = observable(new Set([1n, 2n, 3n]));
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).toHaveBeenCalledTimes(3);
      expect(effect).toHaveBeenCalledWith(1n, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(2n, undefined, expect.any(Object));
      expect(effect).toHaveBeenCalledWith(3n, undefined, expect.any(Object));

      disposer();
    });

    it("должен работать с пустым Set", () => {
      const set = observable(new Set<number>());
      const effect = vi.fn();

      const disposer = cleanupReactionPrimitiveList(() => set, effect);

      expect(effect).not.toHaveBeenCalled();

      runInAction(() => {
        set.add(1);
      });

      expect(effect).toHaveBeenCalledTimes(1);

      disposer();
    });

    it("должен работать со Set ID из API", () => {
      const activeIds = observable(new Set<number>());
      const subscriptions = new Map<number, string>();

      const disposer = cleanupReactionPrimitiveList(
        () => activeIds,
        (id) => {
          subscriptions.set(id, `subscription-${id}`);
          return () => {
            subscriptions.delete(id);
          };
        },
      );

      expect(subscriptions.size).toBe(0);

      runInAction(() => {
        activeIds.add(1);
        activeIds.add(2);
        activeIds.add(3);
      });

      expect(subscriptions.size).toBe(3);
      expect(subscriptions.get(1)).toBe("subscription-1");
      expect(subscriptions.get(2)).toBe("subscription-2");
      expect(subscriptions.get(3)).toBe("subscription-3");

      runInAction(() => {
        activeIds.delete(2);
      });

      expect(subscriptions.size).toBe(2);
      expect(subscriptions.has(2)).toBe(false);

      disposer();

      expect(subscriptions.size).toBe(0);
    });
  });

  describe("Смешанные типы в разных вызовах", () => {
    it("должен работать с числовыми ID из API", () => {
      const activeIds = observable<number>([]);
      const subscriptions = new Map<number, string>();

      const disposer = cleanupReactionPrimitiveList(
        () => activeIds,
        (id) => {
          subscriptions.set(id, `subscription-${id}`);
          return () => {
            subscriptions.delete(id);
          };
        },
      );

      expect(subscriptions.size).toBe(0);

      runInAction(() => {
        activeIds.push(1, 2, 3);
      });

      expect(subscriptions.size).toBe(3);
      expect(subscriptions.get(1)).toBe("subscription-1");
      expect(subscriptions.get(2)).toBe("subscription-2");
      expect(subscriptions.get(3)).toBe("subscription-3");

      runInAction(() => {
        activeIds.splice(1, 1); // Удаляем ID 2
      });

      expect(subscriptions.size).toBe(2);
      expect(subscriptions.has(2)).toBe(false);

      disposer();

      expect(subscriptions.size).toBe(0);
    });

    it("должен работать со строковыми UUID", () => {
      const activeUuids = observable<string>([]);
      const connections = new Map<string, boolean>();

      const disposer = cleanupReactionPrimitiveList(
        () => activeUuids,
        (uuid) => {
          connections.set(uuid, true);
          return () => {
            connections.delete(uuid);
          };
        },
      );

      runInAction(() => {
        activeUuids.push("uuid-1", "uuid-2");
      });

      expect(connections.size).toBe(2);

      runInAction(() => {
        activeUuids.replace(["uuid-2", "uuid-3"]);
      });

      expect(connections.size).toBe(2);
      expect(connections.has("uuid-1")).toBe(false);
      expect(connections.has("uuid-2")).toBe(true);
      expect(connections.has("uuid-3")).toBe(true);

      disposer();
    });
  });
});
