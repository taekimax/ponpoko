import { describe, expect, it, vi } from "vitest";
import { DeferredTaskQueue } from "../src/deferred-task-queue";

describe("deferred task queue", () => {
  it("holds startup-expensive work until an explicit drain", () => {
    const queue = new DeferredTaskQueue();
    const task = vi.fn();

    queue.enqueue(task);

    expect(queue.pendingCount).toBe(1);
    expect(task).not.toHaveBeenCalled();

    queue.drain();

    expect(queue.pendingCount).toBe(0);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("drops queued work when a launch is abandoned", () => {
    const queue = new DeferredTaskQueue();
    const task = vi.fn();

    queue.enqueue(task);
    queue.clear();
    queue.drain();

    expect(queue.pendingCount).toBe(0);
    expect(task).not.toHaveBeenCalled();
  });
});
