/**
 * Return an object containing the given key/value only when the value is not nullish.
 */
export function optionalProp<K extends string, V>(
  key: K,
  value: V | null | undefined
): Partial<Record<K, V>> {
  if (value === null || value === undefined) {
    return {};
  }

  return { [key]: value } as Partial<Record<K, V>>;
}
