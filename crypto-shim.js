/**
 * Minimal Node.js `crypto` shim for React Native.
 *
 * Only provides `randomBytes` (used by @umbra-privacy/sdk for AES IV generation).
 * Relies on `react-native-get-random-values` having polyfilled
 * `globalThis.crypto.getRandomValues` before this module is loaded.
 */

const { sha256 } = require("@noble/hashes/sha256");

module.exports = {
  randomBytes(size) {
    const buf = new Uint8Array(size);
    globalThis.crypto.getRandomValues(buf);
    return Buffer.from(buf);
  },
  createHash(algorithm) {
    if (algorithm === "sha256") {
      let data = Buffer.alloc(0);
      return {
        update(input) {
          data = Buffer.concat([data, Buffer.from(input)]);
          return this;
        },
        digest(encoding) {
          const hash = Buffer.from(sha256(data));
          if (encoding === "hex") return hash.toString("hex");
          return hash;
        },
      };
    }
    throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  },
};
