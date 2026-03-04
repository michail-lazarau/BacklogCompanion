const mmkvInstance = {
  set: jest.fn(),
  getString: jest.fn(),
  getNumber: jest.fn(),
  getBoolean: jest.fn(),
  getBuffer: jest.fn(),
  contains: jest.fn(() => false),
  delete: jest.fn(),
  getAllKeys: jest.fn(() => []),
  clearAll: jest.fn(),
  addOnValueChangedListener: jest.fn(() => ({ remove: jest.fn() })),
};

export const createMMKV = jest.fn(() => mmkvInstance);
export const existsMMKV = jest.fn(() => false);
export const deleteMMKV = jest.fn();
export const useMMKV = jest.fn(() => mmkvInstance);
export const useMMKVBoolean = jest.fn(() => [undefined, jest.fn()]);
export const useMMKVBuffer = jest.fn(() => [undefined, jest.fn()]);
export const useMMKVNumber = jest.fn(() => [undefined, jest.fn()]);
export const useMMKVObject = jest.fn(() => [undefined, jest.fn()]);
export const useMMKVString = jest.fn(() => [undefined, jest.fn()]);
export const useMMKVListener = jest.fn();
export const useMMKVKeys = jest.fn(() => []);
