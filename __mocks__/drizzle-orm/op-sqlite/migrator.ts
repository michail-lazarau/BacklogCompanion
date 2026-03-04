export const useMigrations = jest.fn(() => ({ success: true, error: undefined }));
export const migrate = jest.fn(() => Promise.resolve());
