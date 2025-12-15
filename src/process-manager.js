import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ProcessManager {
  constructor() {
    this.processes = {
      chromium: null,
      uxplay: null
    };
  }

  async startChromium() {
    await this.stopAll();
    try {
      const url = process.env.CHROMIUM_URL || 'http://localhost:3000';
      exec(`chromium-browser --kiosk --noerrdialogs --disable-infobars --no-first-run --enable-features=OverlayScrollbar --start-fullscreen ${url}`, (err) => {
        if (err) console.error('Chromium error:', err);
      });
      this.processes.chromium = true;
      return true;
    } catch (error) {
      console.error('Failed to start chromium:', error);
      return false;
    }
  }

  async stopChromium() {
    try {
      await execAsync('pkill -f chromium-browser');
      this.processes.chromium = null;
      return true;
    } catch (error) {
      return true;
    }
  }

  async startUxplay() {
    await this.stopAll();
    try {
      exec('uxplay', (err) => {
        if (err) console.error('UXPlay error:', err);
      });
      this.processes.uxplay = true;
      return true;
    } catch (error) {
      console.error('Failed to start uxplay:', error);
      return false;
    }
  }

  async stopUxplay() {
    try {
      await execAsync('pkill -f uxplay');
      this.processes.uxplay = null;
      return true;
    } catch (error) {
      return true;
    }
  }

  async stopAll() {
    await Promise.all([
      this.stopChromium(),
      this.stopUxplay()
    ]);
  }

  async handleMode(mode) {
    switch (mode) {
      case 'dashboard':
        return await this.startChromium();
      case 'music':
        return await this.startChromium();
      case 'airplay':
        return await this.startUxplay();
      case 'cast':
        await this.stopAll();
        return true;
      case 'image':
        return await this.startChromium();
      case 'off':
        await this.stopAll();
        return true;
      default:
        return false;
    }
  }
}
