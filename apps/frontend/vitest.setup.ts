import "@testing-library/jest-dom/vitest";

// The jsdom build in use here ships without Web Storage, so anything that
// touches localStorage silently takes its "storage unavailable" branch and
// can't be tested. Install a minimal in-memory stand-in when it's missing.
if (typeof globalThis.localStorage === "undefined") {
  const createStorage = (): Storage => {
    let store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      key: (index: number) => [...store.keys()][index] ?? null,
      getItem: (key: string) => store.get(String(key)) ?? null,
      setItem: (key: string, value: string) => {
        store.set(String(key), String(value));
      },
      removeItem: (key: string) => {
        store.delete(String(key));
      },
      clear: () => {
        store = new Map();
      },
    } as Storage;
  };

  for (const name of ["localStorage", "sessionStorage"] as const) {
    const storage = createStorage();
    Object.defineProperty(globalThis, name, { value: storage, configurable: true });
    if (typeof window !== "undefined") {
      Object.defineProperty(window, name, { value: storage, configurable: true });
    }
  }
}
