import { expect, vi } from "vitest";

import { cleanupInterval } from "./cleanupInterval";

/*
Code Analysis

Objective:
The objective of the setIntervalEffect function is to create a setInterval loop that executes a callback function with a specified delay. The callback function can return a cleanup function or a promise that resolves to a cleanup function. The function also returns a dispose function that clears the interval and calls the cleanup function.

Inputs:
- cb: a callback function that returns a cleanup function or a promise that resolves to a cleanup function
- delay: a number or a string value that represents the delay between each execution of the callback function

Flow:
1. Initialize a variable "dispose" to undefined
2. Define an async function "innerCb" that calls the cleanup function returned by the previous execution of the callback function, if it exists, and then calls the callback function and assigns the returned cleanup function to "dispose"
3. Convert the delay to a number if it is a string using the "ms" library
4. Call setInterval with "innerCb" and the delay, and assign the returned interval ID to "id"
5. Return a dispose function that calls the cleanup function returned by the last execution of the callback function, clears the interval, and sets "dispose" to undefined

Outputs:
- A dispose function that clears the interval and calls the cleanup function returned by the last execution of the callback function

Additional aspects:
- The function uses the "ms" library to convert string values to numbers representing milliseconds
- The callback function can return a promise that resolves to a cleanup function, allowing for asynchronous cleanup
- The function uses async/await to handle promises returned by the callback function
*/

describe("cleanupInterval_function", () => {
  it("test_dispose_while_async_callback_is_pending_runs_returned_cleanup", async () => {
    vi.useFakeTimers();

    let resolveCallback: (() => void) | undefined;
    const returnedCleanup = vi.fn();

    const cb = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        resolveCallback = resolve;
      });

      return returnedCleanup;
    });

    const dispose = cleanupInterval(cb, 10);

    await vi.advanceTimersByTimeAsync(10);
    expect(cb).toHaveBeenCalledTimes(1);

    dispose();
    expect(returnedCleanup).not.toHaveBeenCalled();

    resolveCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(returnedCleanup).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it("test_dispose_while_next_async_callback_is_pending_does_not_repeat_previous_cleanup", async () => {
    vi.useFakeTimers();

    let callCount = 0;
    let resolveSecondCallback: (() => void) | undefined;
    const previousCleanup = vi.fn();
    const pendingCleanup = vi.fn();

    const cb = vi.fn(async () => {
      callCount += 1;

      if (callCount === 1) {
        return previousCleanup;
      }

      await new Promise<void>((resolve) => {
        resolveSecondCallback = resolve;
      });

      return pendingCleanup;
    });

    const dispose = cleanupInterval(cb, 10);

    await vi.advanceTimersByTimeAsync(10);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(previousCleanup).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(10);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(previousCleanup).toHaveBeenCalledTimes(1);

    dispose();
    expect(previousCleanup).toHaveBeenCalledTimes(1);
    expect(pendingCleanup).not.toHaveBeenCalled();

    resolveSecondCallback?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(pendingCleanup).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("test_async_callback_does_not_overlap_when_previous_tick_is_pending", async () => {
    vi.useFakeTimers();

    let resolveTick: (() => void) | undefined;
    const cb = vi.fn(async () => {
      await new Promise<void>((resolve) => {
        resolveTick = resolve;
      });
      return () => {};
    });

    const dispose = cleanupInterval(cb, 10);

    await vi.advanceTimersByTimeAsync(10);
    expect(cb).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(cb).toHaveBeenCalledTimes(1);

    resolveTick?.();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(10);
    expect(cb).toHaveBeenCalledTimes(2);

    dispose();
    vi.useRealTimers();
  });

  // Tests that the function returns a dispose function when the callback function returns a function
  it("test_happy_path_callback_returns_function", async () => {
    const dispose = cleanupInterval(() => () => {}, 1000);
    expect(dispose).toBeInstanceOf(Function);
    dispose();
  });

  // Tests that the function returns a dispose function when the callback function returns a promise that resolves to a function
  it("test_happy_path_callback_returns_promise_resolving_to_function", async () => {
    const dispose = cleanupInterval(async () => () => {}, 1000);
    expect(dispose).toBeInstanceOf(Function);
    dispose();
  });

  // Tests that the function does not throw an error when the callback function returns undefined
  it("test_edge_case_callback_returns_undefined", async () => {
    const dispose = cleanupInterval(() => {}, 1000);
    expect(dispose).toBeInstanceOf(Function);
    dispose();
  });

  // Tests that the function does not throw an error when the callback function returns a promise that resolves to undefined
  it("test_edge_case_callback_returns_promise_resolving_to_undefined", async () => {
    const dispose = cleanupInterval(async () => {}, 1000);
    expect(dispose).toBeInstanceOf(Function);
    dispose();
  });

  // Tests that the function does not throw an error when the delay value is 0
  it("test_edge_case_delay_is_zero", async () => {
    const dispose = cleanupInterval(() => () => {}, 0);
    expect(dispose).toBeInstanceOf(Function);
    dispose();
  });

  // Tests that the function does not throw an error when the delay value is negative
  it("test_edge_case_delay_is_negative", async () => {
    const dispose = cleanupInterval(() => () => {}, -1000);
    expect(dispose).toBeInstanceOf(Function);
    dispose();
  });

  // Tests that the function does not throw an error when the delay value is a string with an invalid time unit
  it("test_edge_case_delay_has_invalid_time_unit", () => {
    const cb = vi.fn();
    const delay = "10invalid";
    // @ts-ignore
    expect(() => cleanupInterval(cb, delay)).not.toThrow();
  });

  // Tests that the function does not throw an error when the delay value is a string with a valid time unit but no number
  it("test_edge_case_delay_has_valid_time_unit_but_no_number", () => {
    const cb = vi.fn();
    const delay = "invalid";
    // @ts-ignore
    expect(() => cleanupInterval(cb, delay)).not.toThrow();
  });
});
