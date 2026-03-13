import 'react-native-get-random-values';
import QuickCrypto from 'react-native-quick-crypto';

// Polyfill crypto.subtle (Web Crypto API) — required by Umbra SDK
if (!globalThis.crypto?.subtle) {
  (globalThis as any).crypto = {
    ...globalThis.crypto,
    subtle: QuickCrypto.subtle,
  };
}

import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;

if (typeof global.TextEncoder === 'undefined') {
  require('text-encoding-polyfill');
}

// Hermes lacks DOMException — SDK code uses `instanceof DOMException` which crashes
if (typeof globalThis.DOMException === 'undefined') {
  (globalThis as any).DOMException = class DOMException extends Error {
    code: number;
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
      this.code = 0;
    }
  };
}

// Hermes lacks AbortSignal.throwIfAborted — required by Umbra SDK
if (typeof AbortSignal !== 'undefined' && !AbortSignal.prototype.throwIfAborted) {
  AbortSignal.prototype.throwIfAborted = function () {
    if (this.aborted) {
      throw new DOMException('The operation was aborted', 'AbortError');
    }
  };
}


const _OrigBlob = globalThis.Blob;
if (_OrigBlob) {
  (globalThis as any).Blob = function PatchedBlob(parts?: any[], options?: any) {
    const safeParts = (parts || []).map((part: any) => {
      if (part instanceof ArrayBuffer || ArrayBuffer.isView(part)) {
        return new TextDecoder().decode(part);
      }
      return part;
    });
    return new _OrigBlob(safeParts, options);
  };
  (globalThis as any).Blob.prototype = _OrigBlob.prototype;
}