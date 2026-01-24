import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;
  private subscribedWallets: Set<string> = new Set();
  private token: string | null = null;
  private isDisconnectingManually: boolean = false;

  connect(jwtToken?: string) {
    if (this.socket?.connected) {
      return;
    }

    this.token = jwtToken || null;

    const socketOptions: any = {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    };

    // Add auth only if token is provided
    if (jwtToken) {
      socketOptions.auth = { token: jwtToken };
    }

    this.socket = io(SOCKET_URL, socketOptions);

    this.socket.on('connect', () => {
      this.subscribedWallets.forEach(walletAddress => {
        this.socket?.emit('subscribe:wallet', walletAddress);
      });
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
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('subscribe:wallet', walletAddress);
    this.subscribedWallets.add(walletAddress);
  }

  unsubscribeFromWallet(walletAddress: string) {
    this.subscribedWallets.delete(walletAddress);
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      return;
    }
    this.socket.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
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
}

export const socketService = new SocketService();