type CacheEntry<T> = {
  value?: T;
  updatedAt: number;
  promise?: Promise<T>;
};

const entries = new Map<string, CacheEntry<unknown>>();

export function peekCached<T>(key: string): T | undefined {
  return entries.get(key)?.value as T | undefined;
}

export async function loadCached<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number,
  options: { force?: boolean } = {},
): Promise<T> {
  const existing = entries.get(key) as CacheEntry<T> | undefined;
  const fresh = existing?.value !== undefined && Date.now() - existing.updatedAt < ttlMs;

  if (!options.force && fresh) return existing.value as T;
  if (existing?.promise) return existing.promise;

  const entry: CacheEntry<T> = existing || { updatedAt: 0 };
  const promise = loader()
    .then((value) => {
      entry.value = value;
      entry.updatedAt = Date.now();
      entry.promise = undefined;
      entries.set(key, entry);
      return value;
    })
    .catch((error) => {
      entry.promise = undefined;
      entries.set(key, entry);
      if (entry.value !== undefined) return entry.value;
      throw error;
    });

  entry.promise = promise;
  entries.set(key, entry);
  return promise;
}

export function setCached<T>(key: string, value: T): void {
  entries.set(key, { value, updatedAt: Date.now() });
}

export function invalidateCached(...keys: string[]): void {
  keys.forEach((key) => {
    const entry = entries.get(key);
    if (entry) entry.updatedAt = 0;
  });
}

export function invalidateCachedPrefix(prefix: string): void {
  entries.forEach((entry, key) => {
    if (key.startsWith(prefix)) entry.updatedAt = 0;
  });
}
