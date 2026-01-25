// Mock for @react-native-async-storage/async-storage
module.exports = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
};
