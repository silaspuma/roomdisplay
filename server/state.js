export class StateManager {
  constructor() {
    this.state = {
      currentMode: 'dashboard',
      lastMode: null,
      isSleeping: false,
      spotify: {
        playing: false,
        title: '',
        artist: '',
        album: '',
        cover: '',
        progress: 0
      },
      schedule: {
        weekdayWakeTime: '07:00',
        sleepTime: '23:00',
        enabled: false
      }
    };
    this.listeners = [];
  }

  getState() {
    return this.state;
  }

  setState(updates) {
    const changed = JSON.stringify(this.state) !== JSON.stringify({ ...this.state, ...updates });
    if (changed) {
      this.state = { ...this.state, ...updates };
      this.notifyListeners();
    }
  }

  updateSpotify(spotifyData) {
    const changed = JSON.stringify(this.state.spotify) !== JSON.stringify(spotifyData);
    if (changed) {
      this.state.spotify = { ...this.state.spotify, ...spotifyData };
      this.notifyListeners();
    }
  }

  updateSchedule(scheduleData) {
    this.state.schedule = { ...this.state.schedule, ...scheduleData };
    this.notifyListeners();
  }

  setMode(mode) {
    if (this.state.isSleeping) return false;
    if (this.state.currentMode !== mode) {
      this.state.lastMode = this.state.currentMode;
      this.state.currentMode = mode;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  setSleeping(sleeping) {
    this.state.isSleeping = sleeping;
    this.notifyListeners();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.state));
  }
}
