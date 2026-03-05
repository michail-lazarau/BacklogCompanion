const InAppBrowserMock = {
  open: jest.fn().mockResolvedValue({ type: 'cancel' }),
  openAuth: jest.fn().mockResolvedValue({ type: 'cancel' }),
  close: jest.fn(),
  isAvailable: jest.fn().mockResolvedValue(true),
};
module.exports = InAppBrowserMock;
module.exports.default = InAppBrowserMock;
