export class DeferredTaskQueue {
  private tasks: Array<() => void> = [];

  get pendingCount(): number {
    return this.tasks.length;
  }

  clear(): void {
    this.tasks = [];
  }

  drain(): void {
    const pendingTasks = this.tasks;
    this.tasks = [];
    for (const task of pendingTasks) {
      task();
    }
  }

  enqueue(task: () => void): void {
    this.tasks.push(task);
  }
}
