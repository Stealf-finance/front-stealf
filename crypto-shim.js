/**
 * Minimal Node.js `crypto` shim for React Native.
 *
 * Only provides `randomBytes` (used by @umbra-privacy/sdk for AES IV generation).
 * Relies on `react-native-get-random-values` having polyfilled
 * `globalThis.crypto.getRandomValues` before this module is loaded.
 */

module.exports = {
  randomBytes(size) {
    const buf = new Uint8Array(size);
    globalThis.crypto.getRandomValues(buf);
    return Buffer.from(buf);
  },
};
