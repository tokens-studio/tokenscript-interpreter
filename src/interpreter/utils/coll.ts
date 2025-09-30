/**
 * Groups elements of a collection by the result of applying a function to each element.
 * Returns a record where keys are the results of the grouping function and values are arrays
 * of the corresponding elements, preserving their original order.
 *
 * @param f - The grouping function to apply to each element
 * @param coll - The collection to group
 * @returns A record mapping grouping keys to arrays of elements
 *
 * @example
 * ```typescript
 * // Group strings by length
 * groupBy((s: string) => s.length, ["a", "as", "asd", "aa", "asdf", "qwer"])
 * // => { "1": ["a"], "2": ["as", "aa"], "3": ["asd"], "4": ["asdf", "qwer"] }
 *
 * // Group numbers by odd/even
 * groupBy((n: number) => n % 2 === 1, [0, 1, 2, 3, 4, 5])
 * // => { "false": [0, 2, 4], "true": [1, 3, 5] }
 *
 * // Group objects by property
 * groupBy((obj: {category: string}) => obj.category,
 *         [{category: "a", id: 1}, {category: "b", id: 2}, {category: "a", id: 3}])
 * // => { "a": [{category: "a", id: 1}, {category: "a", id: 3}], "b": [{category: "b", id: 2}] }
 * ```
 */
export function groupBy<T, K extends PropertyKey>(
  f: (item: T) => K,
  coll: readonly T[],
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;

  for (const item of coll) {
    const key = f(item);
    if (key in result) {
      result[key].push(item);
    } else {
      result[key] = [item];
    }
  }

  return result;
}
