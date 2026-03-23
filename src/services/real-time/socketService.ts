import { io, Socket } from 'socket.io-client';

// TODO: Consider adding certificate pinning for production
// Options: react-native-ssl-pinning, or custom fetch with pinned certs
// For now, enforce HTTPS in production
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL;

if (!SOCKET_URL) {
  throw new Error('EXPO_PUBLIC_API_URL environment variable is required');
}

interface PrivacyBalances {
  sol: number;
  usdc: number;
}

class SocketService {
  private socket: Socket | null = null;
  private subscribedWallets: Set<string> = new Set();
  private yieldChannel: string | null = null;
  private pendingListeners: { event: string; callback: (...args: any[]) => void }[] = [];
  private token: string | null = null;
  private isDisconnectingManually: boolean = false;
  private privacyBalances: PrivacyBalances = { sol: 0, usdc: 0 };

  connect(jwtToken?: string) {
    if (this.socket) {
      // Flush pending listeners onto existing socket
      if (this.pendingListeners.length > 0) {
        this.pendingListeners.forEach(({ event, callback }) => {
          this.socket!.on(event, callback);
        });
        this.pendingListeners = [];
      }
      return;
    }

    this.token = jwtToken || null;

    const socketOptions: any = {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    if (jwtToken) {
      socketOptions.auth = { token: jwtToken };
    }

    this.socket = io(SOCKET_URL, socketOptions);

    // Flush any listeners registered before connect()
    this.pendingListeners.forEach(({ event, callback }) => {
      this.socket!.on(event, callback);
    });
    this.pendingListeners = [];

    this.socket.on('connect', () => {
      if (__DEV__) console.log('[Socket] connected:', this.socket?.id);
      this.subscribedWallets.forEach(walletAddress => {
        this.socket?.emit('subscribe:wallet', walletAddress);
      });
      if (this.yieldChannel) {
        this.socket?.emit('subscribe:yield', this.yieldChannel);
      }
    });

    this.socket.on('disconnect', (reason) => {

      if (!this.isDisconnectingManually && reason !== 'io client disconnect') {
        console.error('Socket disconnected:', reason);
      }
      this.isDisconnectingManually = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

  }

  disconnect() {
    if (this.socket) {
      this.isDisconnectingManually = true;
      this.socket.disconnect();
      this.socket = null;
      this.subscribedWallets.clear();
    }
  }

  subscribeToWallet(walletAddress: string) {
    this.subscribedWallets.add(walletAddress);

    if (this.socket?.connected) {
      this.socket.emit('subscribe:wallet', walletAddress);
    }
  }

  unsubscribeFromWallet(walletAddress: string) {
    this.subscribedWallets.delete(walletAddress);
  }

  subscribeToYield(subOrgId: string) {
    const { getUserIdHash } = require('../yield/deposit');
    this.yieldChannel = getUserIdHash(subOrgId).toString('hex');

    if (this.socket?.connected) {
      this.socket.emit('subscribe:yield', this.yieldChannel);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      this.pendingListeners = this.pendingListeners.filter(
        l => !(l.event === event && l.callback === callback)
      );
      this.pendingListeners.push({ event, callback });
      return;
    }
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    // Clean pending listeners too
    this.pendingListeners = callback
      ? this.pendingListeners.filter(l => !(l.event === event && l.callback === callback))
      : this.pendingListeners.filter(l => l.event !== event);

    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  emit(event: string, data?: any) {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit(event, data);
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getPrivacyBalances(): PrivacyBalances {
    return this.privacyBalances;
  }
}

export const socketService = new SocketService();
