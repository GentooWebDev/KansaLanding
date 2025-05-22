export class PromiseCollection<T = void> {
  private readonly promises: Array<() => PromiseLike<T>> = [];

  constructor(
    private readonly mode: "consecutive" | "parallel",
  ) {}

  public add(cb: () => PromiseLike<T>) {
    this.promises.push(cb);
  }

  public async execute(): Promise<T[]> {
    switch (this.mode) {
      case "parallel":
        return Promise.all(this.promises.map((p) => p()));

      case "consecutive": {
        const results: T[] = [];

        for (const promiseFn of this.promises) {
          try {
            const result = await promiseFn();
            results.push(result);
          } catch (error) {
            return Promise.reject(error);
          }
        }

        return results;
      }

      default:
        throw new Error(
          `PromiseCollection#mode must be either 'parallel' or 'consecutive'. Instead, it was '${this.mode}'.`,
        );
    }
  }
}
