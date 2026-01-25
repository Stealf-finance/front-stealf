// Jest setup file for cold wallet tests

// Mock Web Crypto API for Node environment
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

// Mock TextEncoder/TextDecoder for Node
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill for crypto.getRandomValues in Node
if (global.crypto && typeof global.crypto.getRandomValues === 'undefined') {
  const { randomFillSync } = require('crypto');
  global.crypto.getRandomValues = (arr) => {
    return randomFillSync(arr);
  };
}

// Mock React Native
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
}));

// Suppress console warnings during tests
const originalConsole = { ...console };
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: originalConsole.log, // Keep log for debugging
};
