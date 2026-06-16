import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cleanupRequestAnimationFrame } from "./cleanupRequestAnimationFrame";

describe("cleanupRequestAnimationFrame", () => {
  beforeEach(() => {
    vi.useFakeTimers();

    // Mock requestAnimationFrame and cancelAnimationFrame
    globalThis.requestAnimationFrame = vi.fn((cb) => {
      setTimeout(() => cb(performance.now()), 16);
      return 1;
    });

    globalThis.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should schedule a callback to be executed on next animation frame", async () => {
    const callback = vi.fn();

    cleanupRequestAnimationFrame(callback);

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward time to trigger animation frame
    vi.advanceTimersByTime(16);

    // Need to flush promises since the callback is wrapped in an async function
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should execute cleanup when disposed", async () => {
    const cleanup = vi.fn();
    const callback = vi.fn().mockReturnValue(cleanup);

    const dispose = cleanupRequestAnimationFrame(callback);

    // Fast-forward time to trigger animation frame
    vi.advanceTimersByTime(16);
    await vi.runAllTimersAsync();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    dispose();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it("should cancel animation frame when disposed before execution", () => {
    const callback = vi.fn();

    const dispose = cleanupRequestAnimationFrame(callback);

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();

    dispose();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);

    // Fast-forward time
    vi.advanceTimersByTime(16);

    expect(callback).not.toHaveBeenCalled();
  });
});
