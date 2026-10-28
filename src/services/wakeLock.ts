// Screen Wake Lock API helper to keep screen awake while cooking
export class WakeLockService {
  private sentinel: any = null;
  private isActive = false;

  async requestWakeLock(): Promise<boolean> {
    if ('wakeLock' in navigator) {
      try {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
        this.isActive = true;

        this.sentinel.addEventListener('release', () => {
          this.isActive = false;
        });

        // Re-acquire if app loses and regains visibility
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        return true;
      } catch (err) {
        console.warn('Wake Lock request failed or was dismissed:', err);
        this.isActive = false;
        return false;
      }
    }
    return false;
  }

  async releaseWakeLock(): Promise<void> {
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {}
      this.sentinel = null;
    }
    this.isActive = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  get active(): boolean {
    return this.isActive;
  }

  private handleVisibilityChange = async () => {
    if (this.isActive && document.visibilityState === 'visible') {
      try {
        this.sentinel = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Could not re-acquire wake lock on visibility change:', err);
      }
    }
  };
}

export const wakeLockService = new WakeLockService();
