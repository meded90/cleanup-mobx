import { observable, runInAction } from "mobx";
import { describe, expect, it, vi } from "vitest";

import { cleanupReactionList } from "./cleanupReactionList";

describe("cleanupReactionList", () => {
  describe("Работа с объектами и getKey", () => {
    it("должен использовать getKey для идентификации объектов", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      // Добавляем новый объект
      runInAction(() => {
        list.push({ id: 3, name: "C" });
      });

      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(
        { id: 3, name: "C" },
        2,
        expect.any(Array),
        expect.any(Array),
        expect.any(Object),
      );

      disposer();
    });

    it("должен вызвать disposer с isModified=true при изменении объекта", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);

      const disposerFn1 = vi.fn();
      const disposerFn2 = vi.fn();

      const effect = vi.fn((item: Item) => {
        if (item.id === 1) {
          return disposerFn1;
        }
        if (item.id === 2) {
          return disposerFn2;
        }
      });

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      // Изменяем объект с id=1
      runInAction(() => {
        list[0] = { id: 1, name: "A Modified" };
      });

      // Должен вызваться disposer с isModified=true
      expect(disposerFn1).toHaveBeenCalledTimes(1);
      expect(disposerFn1).toHaveBeenCalledWith(true);
      expect(disposerFn2).not.toHaveBeenCalled();

      // Должен создаться новый эффект для измененного элемента
      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(
        { id: 1, name: "A Modified" },
        0,
        expect.any(Array),
        expect.any(Array),
        expect.any(Object),
      );

      disposer();
    });

    it("должен вызвать disposer с isModified=false (undefined) при удалении объекта", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ]);

      const disposerFn1 = vi.fn();
      const disposerFn2 = vi.fn();
      const disposerFn3 = vi.fn();

      const effect = vi.fn((item: Item) => {
        if (item.id === 1) {
          return disposerFn1;
        }
        if (item.id === 2) {
          return disposerFn2;
        }
        if (item.id === 3) {
          return disposerFn3;
        }
      });

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(3);

      // Удаляем объект с id=2
      runInAction(() => {
        list.splice(1, 1);
      });

      expect(disposerFn1).not.toHaveBeenCalled();
      expect(disposerFn2).toHaveBeenCalledTimes(1);
      expect(disposerFn2).toHaveBeenCalledWith(); // isModified не передается
      expect(disposerFn3).not.toHaveBeenCalled();

      disposer();
    });

    it("должен правильно обрабатывать множественные изменения", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([{ id: 1, name: "A" }]);

      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(1);
      effect.mockClear();

      runInAction(() => {
        // Добавляем новый элемент
        list.push({ id: 2, name: "B" });
        // Изменяем существующий
        list[0] = { id: 1, name: "A Modified" };
        // Добавляем еще один
        list.push({ id: 3, name: "C" });
      });

      // Должен вызваться disposer для измененного элемента с isModified=true
      expect(disposerFn).toHaveBeenCalledWith(true);

      // Должны создаться эффекты: для id=1 (изменен), id=2 (новый), id=3 (новый)
      expect(effect).toHaveBeenCalledTimes(3);

      disposer();
    });

    it("должен работать с числовыми ключами", () => {
      type Item = { id: number; value: string };
      const list = observable<Item>([
        { id: 1, value: "one" },
        { id: 2, value: "two" },
      ]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(2);

      disposer();
    });

    it("должен работать со строковыми ключами", () => {
      type Item = { uuid: string; value: string };
      const list = observable<Item>([
        { uuid: "abc-123", value: "one" },
        { uuid: "def-456", value: "two" },
      ]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.uuid,
      });

      expect(effect).toHaveBeenCalledTimes(2);

      disposer();
    });

    it("должен работать с bigint ключами", () => {
      type Item = { id: bigint; value: string };
      const list = observable<Item>([
        { id: 1n, value: "one" },
        { id: 2n, value: "two" },
      ]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(2);

      disposer();
    });

    it("не должен вызывать эффект повторно для объекта с тем же ключом", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(2);
      effect.mockClear();

      // Добавляем объект с уже существующим ключом, но без изменения массива
      runInAction(() => {
        list.push({ id: 3, name: "C" });
      });

      expect(effect).toHaveBeenCalledTimes(1);
      expect(effect).toHaveBeenCalledWith(
        { id: 3, name: "C" },
        2,
        expect.any(Array),
        expect.any(Array),
        expect.any(Object),
      );

      disposer();
    });

    it("должен вызвать все disposer при полной очистке списка", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(3);

      runInAction(() => {
        list.clear();
      });

      expect(disposerFn).toHaveBeenCalledTimes(3);

      disposer();
    });

    it("должен вызвать все disposer при вызове главного disposer", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(3);

      disposer();

      expect(disposerFn).toHaveBeenCalledTimes(3);
    });
  });

  describe("Обработка isModified в disposer", () => {
    it("disposer должен различать удаление и модификацию", () => {
      type Item = { id: number; status: string };
      const list = observable<Item>([
        { id: 1, status: "active" },
        { id: 2, status: "active" },
      ]);

      const cleanupLog: Array<{ id: number; isModified: boolean | undefined }> = [];

      const effect = vi.fn((item: Item) => {
        return (isModified?: boolean) => {
          cleanupLog.push({ id: item.id, isModified });
        };
      });

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      // Изменяем элемент
      runInAction(() => {
        list[0] = { id: 1, status: "inactive" };
      });

      expect(cleanupLog).toEqual([{ id: 1, isModified: true }]);
      cleanupLog.length = 0;

      // Удаляем элемент
      runInAction(() => {
        list.splice(1, 1);
      });

      expect(cleanupLog).toEqual([{ id: 2, isModified: undefined }]);

      disposer();
    });

    it("должен позволять избежать очистки при isModified=true", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([{ id: 1, name: "A" }]);

      const resourceMap = new Map<number, string>();

      const effect = vi.fn((item: Item) => {
        resourceMap.set(item.id, `Resource for ${item.name}`);

        return (isModified?: boolean) => {
          if (isModified) {
            // Не очищаем ресурс при модификации
            return;
          }
          // Очищаем только при удалении
          resourceMap.delete(item.id);
        };
      });

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(resourceMap.size).toBe(1);
      expect(resourceMap.get(1)).toBe("Resource for A");

      // Модифицируем элемент
      runInAction(() => {
        list[0] = { id: 1, name: "A Modified" };
      });

      // Ресурс должен остаться (не удален при модификации)
      expect(resourceMap.size).toBe(1);
      expect(resourceMap.get(1)).toBe("Resource for A Modified");

      // Удаляем элемент
      runInAction(() => {
        list.clear();
      });

      // Теперь ресурс должен быть удален
      expect(resourceMap.size).toBe(0);

      disposer();
    });
  });

  describe("Edge cases", () => {
    it("должен работать при быстрых последовательных изменениях", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      effect.mockClear();

      runInAction(() => {
        list.push({ id: 3, name: "C" }, { id: 4, name: "D" });
        list.splice(0, 1); // Удаляем id=1
      });

      expect(effect).toHaveBeenCalledTimes(2); // Только для 3 и 4

      disposer();
    });

    it("должен обрабатывать полную замену массива", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ]);
      const disposerFn = vi.fn();
      const effect = vi.fn(() => disposerFn);

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(3);
      effect.mockClear();

      runInAction(() => {
        list.replace([
          { id: 4, name: "D" },
          { id: 5, name: "E" },
        ]);
      });

      // Должны вызваться disposer для 1, 2, 3
      expect(disposerFn).toHaveBeenCalledTimes(3);
      // Должны создаться эффекты для 4, 5
      expect(effect).toHaveBeenCalledTimes(2);

      disposer();
    });

    it("должен работать с массивом из одного элемента", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([{ id: 1, name: "A" }]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(1);

      disposer();
    });

    it("должен корректно обрабатывать null/undefined в effect", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ]);
      const effect = vi.fn(() => {
        // Не возвращаем disposer
      });

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(2);

      // Не должно быть ошибок при удалении
      runInAction(() => {
        list.clear();
      });

      disposer();
    });

    it("должен работать с пустым массивом", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([]);
      const effect = vi.fn();

      const disposer = cleanupReactionList(() => list, effect, {
        getKey: (item) => item.id,
      });

      expect(effect).not.toHaveBeenCalled();

      runInAction(() => {
        list.push({ id: 1, name: "A" });
      });

      expect(effect).toHaveBeenCalledTimes(1);

      disposer();
    });
  });

  describe("Кастомные comparer", () => {
    it("должен использовать кастомный equals comparer", () => {
      type Item = { id: number; name: string };
      const list = observable<Item>([{ id: 1, name: "A" }]);

      const effect = vi.fn();

      // Кастомный comparer, который сравнивает только по id
      const disposer = cleanupReactionList(() => list, effect, {
        equals: (a, b) => a.id === b.id,
        getKey: (item) => item.id,
      });

      expect(effect).toHaveBeenCalledTimes(1);
      effect.mockClear();

      // Меняем объект, но id тот же
      runInAction(() => {
        list[0] = { id: 1, name: "B" };
      });

      // С кастомным comparer это не должно считаться изменением
      expect(effect).not.toHaveBeenCalled();

      disposer();
    });
  });

  describe("Реальные сценарии использования", () => {
    it("должен корректно управлять подписками на объекты", () => {
      type User = { id: number; name: string; online: boolean };
      const users = observable<User>([]);
      const subscriptions = new Map<number, { user: User; active: boolean }>();

      const disposer = cleanupReactionList(
        () => users,
        (user) => {
          subscriptions.set(user.id, { user, active: true });

          return (isModified) => {
            if (isModified) {
              // Обновляем данные пользователя в подписке
              const sub = subscriptions.get(user.id);
              if (sub) {
                sub.user = user;
              }
              return;
            }
            // Удаляем подписку при удалении пользователя
            subscriptions.delete(user.id);
          };
        },
        { getKey: (user) => user.id },
      );

      // Добавляем пользователей
      runInAction(() => {
        users.push({ id: 1, name: "Alice", online: true }, { id: 2, name: "Bob", online: false });
      });

      expect(subscriptions.size).toBe(2);
      expect(subscriptions.get(1)?.user.name).toBe("Alice");

      // Обновляем пользователя
      runInAction(() => {
        users[0] = { id: 1, name: "Alice Updated", online: true };
      });

      expect(subscriptions.size).toBe(2);
      expect(subscriptions.get(1)?.user.name).toBe("Alice Updated");

      // Удаляем пользователя
      runInAction(() => {
        users.splice(1, 1);
      });

      expect(subscriptions.size).toBe(1);
      expect(subscriptions.has(2)).toBe(false);

      disposer();

      expect(subscriptions.size).toBe(0);
    });
  });
});
