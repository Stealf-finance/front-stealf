/**
 * Session Handler Service
 * Manages app lock state based on inactivity timeout and background state
 */

const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

class SessionHandler {
  private lastActivityTime: number = Date.now();
  private lockTimeout: ReturnType<typeof setTimeout> | null = null;
  private onLockCallback: (() => void) | null = null;
  private isLocked: boolean = false;

  /**
   * Register callback to be called when app should lock
   */
  setOnLockCallback(callback: () => void) {
    this.onLockCallback = callback;
  }

  /**
   * Record user activity - resets the inactivity timer
   */
  recordActivity() {
    this.lastActivityTime = Date.now();
    this.resetLockTimer();
  }

  /**
   * Start the inactivity lock timer
   */
  startLockTimer() {
    this.resetLockTimer();
  }

  /**
   * Reset the lock timer
   */
  private resetLockTimer() {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
    }

    this.lockTimeout = setTimeout(() => {
      this.lock();
    }, LOCK_TIMEOUT_MS);
  }

  /**
   * Stop the lock timer (e.g., when app goes to background)
   */
  stopLockTimer() {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }

  /**
   * Lock the app
   */
  lock() {
    if (!this.isLocked) {
      this.isLocked = true;
      this.onLockCallback?.();
    }
  }

  /**
   * Unlock the app
   */
  unlock() {
    this.isLocked = false;
    this.lastActivityTime = Date.now();
    this.startLockTimer();
  }

  /**
   * Check if app should be locked based on last activity
   */
  shouldLock(): boolean {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    return timeSinceActivity >= LOCK_TIMEOUT_MS;
  }

  /**
   * Handle app going to background
   */
  handleBackground() {
    this.stopLockTimer();
    // Lock immediately when going to background
    this.lock();
  }

  /**
   * Handle app coming to foreground
   */
  handleForeground() {
    if (this.shouldLock()) {
      this.lock();
    } else {
      this.startLockTimer();
    }
  }

  /**
   * Get lock state
   */
  getLockState(): boolean {
    return this.isLocked;
  }

  /**
   * Reset session handler (e.g., on logout)
   */
  reset() {
    this.stopLockTimer();
    this.isLocked = false;
    this.lastActivityTime = Date.now();
    this.onLockCallback = null;
  }
}

export const sessionHandler = new SessionHandler();
