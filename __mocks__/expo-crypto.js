// Mock for expo-crypto
module.exports = {
  getRandomBytesAsync: jest.fn().mockImplementation(async (size) => {
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }),
  digestStringAsync: jest.fn().mockImplementation(async (algorithm, data) => {
    // Return a mock hash
    return 'mockhash1234567890abcdef';
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
    SHA384: 'SHA-384',
    SHA512: 'SHA-512',
  },
};
