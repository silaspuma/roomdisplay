import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PowerManager {
  async suspend() {
    try {
      await execAsync('systemctl suspend');
      return true;
    } catch (error) {
      console.error('Failed to suspend:', error);
      return false;
    }
  }

  async wake() {
    return true;
  }

  async turnOffDisplay() {
    try {
      await execAsync('xset dpms force off');
      return true;
    } catch (error) {
      console.error('Failed to turn off display:', error);
      return false;
    }
  }

  async turnOnDisplay() {
    try {
      await execAsync('xset dpms force on');
      return true;
    } catch (error) {
      console.error('Failed to turn on display:', error);
      return false;
    }
  }
}
