import { logger } from './logger';

export class SessionLockManager {
  private static locks = new Set<string>();

  /**
   * Acquire a lock for a specific session ID.
   * Returns true if the lock was successfully acquired, false if it's already locked.
   */
  static acquire(sessionId: string): boolean {
    if (this.locks.has(sessionId)) {
      logger.warn(`[Lock] Failed to acquire lock for session ${sessionId}. A request is already in progress.`);
      return false;
    }
    this.locks.add(sessionId);
    logger.info(`[Lock] Acquired lock for session ${sessionId}`);
    return true;
  }

  /**
   * Release the lock for a specific session ID.
   */
  static release(sessionId: string): void {
    if (this.locks.has(sessionId)) {
      this.locks.delete(sessionId);
      logger.info(`[Lock] Released lock for session ${sessionId}`);
    }
  }
}
