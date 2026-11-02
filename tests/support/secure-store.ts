export const vault = new Map<string, string>();
export const getItemAsync = jest.fn(async (key: string) => vault.get(key) ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string) => {
  vault.set(key, value);
});
export const deleteItemAsync = jest.fn(async (key: string) => {
  vault.delete(key);
});
