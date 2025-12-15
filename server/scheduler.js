export class Scheduler {
  constructor(stateManager, processManager) {
    this.stateManager = stateManager;
    this.processManager = processManager;
    this.checkInterval = null;
  }

  start() {
    this.checkInterval = setInterval(() => {
      this.checkSchedule();
    }, 60000);
    
    this.checkSchedule();
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkSchedule() {
    const state = this.stateManager.getState();
    
    if (!state.schedule.enabled) {
      return;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;

    if (isWeekday && currentTime === state.schedule.weekdayWakeTime && state.isSleeping) {
      this.wake();
    }

    if (currentTime === state.schedule.sleepTime && !state.isSleeping) {
      this.sleep();
    }
  }

  async wake() {
    this.stateManager.setSleeping(false);
    await this.processManager.wake();
    const state = this.stateManager.getState();
    if (state.lastMode) {
      this.stateManager.setMode(state.lastMode);
      await this.processManager.handleMode(state.lastMode);
    }
  }

  async sleep() {
    this.stateManager.setSleeping(true);
    await this.processManager.suspend();
  }
}
