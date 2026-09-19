const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateId(): string {
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}

export function toUnix(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor(d.getTime() / 1000);
}

export function fromUnix(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

export function getStorageSize(): { used: number; formatted: string } {
  let total = 0;
  for (const key of Object.keys(localStorage)) {
    total += localStorage.getItem(key)?.length || 0;
  }
  const bytes = total * 2;

  if (bytes < 1024) return { used: bytes, formatted: `${bytes} B` };
  if (bytes < 1048576)
    return { used: bytes, formatted: `${(bytes / 1024).toFixed(1)} KB` };
  return { used: bytes, formatted: `${(bytes / 1048576).toFixed(2)} MB` };
}

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    void 0;
  }
}

export function createStorageRepository<T>(key: string, defaultValue: T) {
  return {
    get: (): T => getStorageItem<T>(key, defaultValue),
    set: (value: T): boolean => setStorageItem(key, value),
    clear: () => removeStorageItem(key),
  };
}

