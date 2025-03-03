// deno-lint-ignore-file no-explicit-any

interface ObjectConstructor {
  /**
   * Returns an object created by key-value entries for properties and methods
   * @param entries An iterable object that contains key-value entries for properties and methods.
   */
  fromEntries<T = any, K extends PropertyKey = PropertyKey>(
    entries: Iterable<readonly [K, T]>,
  ): { [k in K]: T };
}
