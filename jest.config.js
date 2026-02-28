module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    __DEV__: true,
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transformIgnorePatterns: [
    'node_modules/(?!(bs58|base-x)/)',
  ],
  moduleNameMapper: {
    // Mock native modules that aren't available in Node
    '^@solana-mobile/mobile-wallet-adapter-protocol-web3js$': '<rootDir>/src/__tests__/mocks/mwa.ts',
    '^@turnkey/wallet-stamper$': '<rootDir>/src/__tests__/mocks/walletStamper.ts',
    '^expo-secure-store$': '<rootDir>/src/__tests__/mocks/secureStore.ts',
    '^react-native$': '<rootDir>/src/__tests__/mocks/reactNative.ts',
  },
};
