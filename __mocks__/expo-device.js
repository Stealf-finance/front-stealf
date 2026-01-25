// Mock for expo-device
// Use a mutable object to store state that persists across tests
const state = {
  isDevice: true,
};

const mockDevice = {
  isRootedExperimentalAsync: jest.fn().mockResolvedValue(false),
  deviceName: 'iPhone',
  modelName: 'iPhone 14',

  // Getter/setter for isDevice to allow test modification
  get isDevice() {
    return state.isDevice;
  },
  set isDevice(value) {
    state.isDevice = value;
  },

  // Helper to reset the mock state
  __resetMock() {
    state.isDevice = true;
    mockDevice.isRootedExperimentalAsync.mockResolvedValue(false);
  },

  // Direct state access for debugging
  __getState() {
    return state;
  },
};

module.exports = mockDevice;
