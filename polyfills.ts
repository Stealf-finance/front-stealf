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

// Hermes lacks EventTarget / CustomEvent — required by @solana/rpc-subscriptions-channel-websocket
if (typeof globalThis.EventTarget === 'undefined') {
  class EventTargetPolyfill {
    private listeners: Record<string, Set<(ev: any) => void>> = {};
    addEventListener(type: string, listener: (ev: any) => void) {
      if (!this.listeners[type]) this.listeners[type] = new Set();
      this.listeners[type].add(listener);
    }
    removeEventListener(type: string, listener: (ev: any) => void) {
      this.listeners[type]?.delete(listener);
    }
    dispatchEvent(event: any) {
      const type = event?.type;
      if (!type) return true;
      this.listeners[type]?.forEach((l) => l(event));
      return true;
    }
  }
  (globalThis as any).EventTarget = EventTargetPolyfill;
}

if (typeof globalThis.CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, init?: { detail?: any }) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
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