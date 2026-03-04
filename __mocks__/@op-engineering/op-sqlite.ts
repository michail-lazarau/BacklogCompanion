export const open = jest.fn(() => ({
  execute: jest.fn(),
  executeAsync: jest.fn(),
  close: jest.fn(),
  transaction: jest.fn(),
}));
