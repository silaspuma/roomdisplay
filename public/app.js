class DisplayControl {
  constructor() {
    this.ws = null;
    this.state = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.init();
  }

  init() {
    this.setupWebSocket();
    this.setupEventListeners();
  }

  setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.updateStatus('Connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state') {
        this.handleStateUpdate(message.data);
      }
    };

    this.ws.onclose = () => {
      this.updateStatus('Disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.updateStatus('Connection error');
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.setupWebSocket(), 2000 * this.reconnectAttempts);
    }
  }

  handleStateUpdate(state) {
    this.state = state;
    this.updateUI();
  }

  updateUI() {
    if (!this.state) return;

    document.getElementById('mode-title').textContent = 
      this.state.currentMode.charAt(0).toUpperCase() + this.state.currentMode.slice(1);

    this.updateStatus(this.state.isSleeping ? 'Sleeping' : 'Active');

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === this.state.currentMode);
    });

    const nowPlaying = document.getElementById('now-playing');
    if (this.state.spotify.playing && this.state.spotify.title) {
      nowPlaying.classList.add('active');
      document.getElementById('track-title').textContent = this.state.spotify.title;
      document.getElementById('track-artist').textContent = this.state.spotify.artist;
      
      const albumCover = document.getElementById('album-cover');
      if (this.state.spotify.cover) {
        albumCover.style.backgroundImage = `url(${this.state.spotify.cover})`;
        albumCover.classList.add('loaded');
      } else {
        albumCover.style.backgroundImage = '';
        albumCover.classList.remove('loaded');
      }
    } else {
      nowPlaying.classList.remove('active');
    }
  }

  updateStatus(text) {
    document.getElementById('status').textContent = text;
  }

  setupEventListeners() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMode(btn.dataset.mode);
      });
    });

    document.getElementById('sleep-btn').addEventListener('click', () => {
      this.sendCommand('sleep');
    });

    document.getElementById('upload-btn').addEventListener('click', () => {
      this.showModal('upload-modal');
    });

    document.getElementById('schedule-btn').addEventListener('click', () => {
      this.showScheduleModal();
    });

    document.getElementById('upload-submit').addEventListener('click', () => {
      this.uploadImage();
    });

    document.getElementById('upload-cancel').addEventListener('click', () => {
      this.hideModal('upload-modal');
    });

    document.getElementById('schedule-submit').addEventListener('click', () => {
      this.saveSchedule();
    });

    document.getElementById('schedule-cancel').addEventListener('click', () => {
      this.hideModal('schedule-modal');
    });
  }

  setMode(mode) {
    this.sendCommand('mode', { mode });
  }

  sendCommand(type, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  showModal(id) {
    document.getElementById(id).classList.add('active');
  }

  hideModal(id) {
    document.getElementById(id).classList.remove('active');
  }

  showScheduleModal() {
    if (this.state && this.state.schedule) {
      document.getElementById('wake-time').value = this.state.schedule.weekdayWakeTime;
      document.getElementById('sleep-time').value = this.state.schedule.sleepTime;
      document.getElementById('schedule-enabled').checked = this.state.schedule.enabled;
    }
    this.showModal('schedule-modal');
  }

  async saveSchedule() {
    const weekdayWakeTime = document.getElementById('wake-time').value;
    const sleepTime = document.getElementById('sleep-time').value;
    const enabled = document.getElementById('schedule-enabled').checked;

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekdayWakeTime, sleepTime, enabled })
      });

      if (response.ok) {
        this.hideModal('schedule-modal');
      }
    } catch (error) {
      this.updateStatus('Failed to save schedule');
    }
  }

  async uploadImage() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const response = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: e.target.result })
        });

        if (response.ok) {
          this.hideModal('upload-modal');
          fileInput.value = '';
          this.setMode('image');
        }
      } catch (error) {
        this.updateStatus('Failed to upload image');
      }
    };
    reader.readAsDataURL(file);
  }
}

new DisplayControl();
