// Toast is used both as a JSX component (<Toast />) and as a namespace (Toast.show(...))
const ToastMock = Object.assign(
  jest.fn(), // function component — renders nothing
  {
    show: jest.fn(),
    hide: jest.fn(),
  },
);

module.exports = ToastMock;
module.exports.default = ToastMock;
