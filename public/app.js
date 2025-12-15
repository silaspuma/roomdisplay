class DisplayControl {
  constructor() {
    this.ws = null;
    this.state = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.displayMode = false;
    this.displayPower = true;
    this.currentMode = 'ready';
    this.uploadedImage = null;
    // controller mode by default
    const app = document.querySelector('.app');
    if (app && !app.classList.contains('controller-mode')) {
      app.classList.add('controller-mode');
    }
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
      this.updateConnectionStatus(true);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state') {
        this.handleStateUpdate(message.data);
      }
    };

    this.ws.onclose = () => {
      this.updateConnectionStatus(false);
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.updateConnectionStatus(false);
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.setupWebSocket(), 2000 * this.reconnectAttempts);
    }
  }

  updateConnectionStatus(connected) {
    const badge = document.getElementById('connection-status');
    
    if (!connected) {
      badge.textContent = 'Disconnected';
      badge.classList.add('disconnected');
      return;
    }
    
    if (this.displayMode) {
      badge.textContent = 'Display Mode';
      badge.classList.remove('disconnected');
      badge.style.background = 'rgba(100, 180, 255, 0.2)';
      badge.style.color = '#64b4ff';
    } else if (this.state?.displayDeviceConnected) {
      badge.textContent = 'Display Connected';
      badge.classList.remove('disconnected');
      badge.style.background = 'rgba(52, 199, 89, 0.15)';
      badge.style.color = '#34c759';
    } else {
      badge.textContent = 'No Display';
      badge.classList.remove('disconnected');
      badge.style.background = 'rgba(255, 180, 100, 0.15)';
      badge.style.color = '#ff6b4a';
    }
  }

  handleStateUpdate(state) {
    this.state = state;
    this.updateUI();
    this.updateConnectionStatus(this.ws?.readyState === WebSocket.OPEN);
    
    // If in display mode, update display content when state changes
    if (this.displayMode) {
      this.updateDisplayContent();
    }
  }

  updateUI() {
    if (!this.state) return;
    this.updateSystemInfo();
  }

  updateSystemInfo() {
    if (document.getElementById('info-mode')) {
      document.getElementById('info-mode').textContent = this.currentMode.toUpperCase();
      document.getElementById('info-power').textContent = this.displayPower ? 'On' : 'Off';
      document.getElementById('info-connection').textContent = this.ws?.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected';
    }
  }

  updateDisplayContent() {
    // Update display based on server state
    const mode = this.state?.currentMode || 'ready';
    
    if (!this.displayPower) {
      const content = document.getElementById('display-content');
      content.innerHTML = '<div class="display-off"><div class="display-off-icon">●</div><div class="display-off-text">Display Off</div></div>';
      return;
    }
    
    switch (mode) {
      case 'music':
        this.showMusicMode();
        break;
      case 'airplay':
        this.showAirPlayMode();
        break;
      case 'image':
        this.showImageMode();
        break;
      default:
        const content = document.getElementById('display-content');
        content.textContent = 'Display Ready';
        break;
    }
  }

  setupEventListeners() {
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (btn.classList.contains('power-btn')) {
          this.togglePower();
        } else {
          const action = btn.dataset.action;
          this.handleModeClick(action);
        }
      });
    });

    // Display mode button
    document.getElementById('display-mode-btn').addEventListener('click', () => {
      this.toggleDisplayMode();
    });

    // Info button
    document.getElementById('info-btn').addEventListener('click', () => {
      this.showModal('info-modal');
    });

    // Sliders
    document.getElementById('volume-slider').addEventListener('change', (e) => {
      this.showLoading(`Volume: ${e.target.value}%`);
    });

    document.getElementById('brightness-slider').addEventListener('change', (e) => {
      this.showLoading(`Brightness: ${e.target.value}%`);
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.getAttribute('data-modal');
        this.hideModal(modal);
      });
    });

    // Modal overlays
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        const modal = e.target.getAttribute('data-modal');
        if (modal) this.hideModal(modal);
      });
    });

    // Modal buttons
    document.querySelectorAll('.modal-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.getAttribute('data-modal');
        if (modal) {
          this.hideModal(modal);
        }
      });
    });

    // File input for image upload (controller modal)
    const fileInput = document.getElementById('image-file-input');
    const fileText = document.getElementById('file-selected-text');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        fileText.textContent = e.target.files[0]?.name || 'Choose Image';
      });
    }

    // Upload button in control panel (only visible for image mode)
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        this.showModal('image-modal');
      });
    }

    // Send button in modal
    const sendBtn = document.getElementById('image-send-btn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        this.uploadImage();
      });
    }
  }

  handleModeClick(mode) {
    this.currentMode = mode;
    
    // Send command to server (which will broadcast to all clients)
    this.sendCommand('mode', { mode });
    
    // Only show loading indicator on controller
    this.showLoading(`Switching to ${mode.charAt(0).toUpperCase() + mode.slice(1)}...`);

    this.updateActiveModeUI();
    this.updateUploadButtonVisibility();

    if (mode === 'image') {
      this.showModal('image-modal');
    }
  }

  showMusicMode() {
    const content = document.getElementById('display-content');
    content.innerHTML = `
      <div class="display-music">
        <div class="music-player">
          <div class="album-art">♪</div>
          <div class="music-info">
            <div class="music-title">Waiting for music...</div>
            <div class="music-artist">Connect Spotify</div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      </div>
    `;
  }

  showAirPlayMode() {
    const content = document.getElementById('display-content');
    content.innerHTML = `
      <div class="airplay-display">
        <div class="tv-logo-container">
          <div class="tv-logo">
            <img src="/tvlogo.png" alt="Apple TV">
          </div>
        </div>
        <div class="airplay-header">
          <h1 class="airplay-title">AirPlay and HomeKit</h1>
          <p class="airplay-subtitle">With AirPlay, you can stream what's on your iOS device or computer to this Apple TV</p>
        </div>
        <div class="airplay-settings">
          <div class="settings-group">
            <div class="settings-group-label">AIRPLAY</div>
            <div class="settings-item">
              <span class="settings-item-label">AirPlay</span>
              <span class="settings-item-value">On</span>
            </div>
            <div class="settings-item">
              <span class="settings-item-label">Allow Access</span>
              <span class="settings-item-value">Same Network</span>
            </div>
            <div class="settings-item">
              <span class="settings-item-label">AirPlay Display Underscan</span>
              <span class="settings-item-value">Auto</span>
            </div>
          </div>
          <div class="settings-group">
            <div class="settings-group-label">HOMEKIT</div>
            <div class="settings-item">
              <span class="settings-item-label">Room</span>
              <span class="settings-item-value">Living Room</span>
            </div>
            <div class="settings-item">
              <span class="settings-item-label">Name</span>
              <span class="settings-item-value">Living Room Apple TV</span>
            </div>
          </div>
          <div class="settings-group">
            <div class="settings-group-label">HOME HUB</div>
            <div class="settings-item">
              <span class="settings-item-label">My Home</span>
              <span class="settings-item-value">Connected</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  showCastError() {
    const content = document.getElementById('display-content');
    content.innerHTML = `
      <div style="text-align: center; color: rgba(0,0,0,0.5);">
        <div style="font-size: 2rem; margin-bottom: 1rem;">📺</div>
        <div>Cast not available</div>
      </div>
    `;
  }

  showImageMode() {
    const content = document.getElementById('display-content');
    const url = this.state?.imageUrl || this.uploadedImage;
    
    if (url) {
      content.innerHTML = `<img src="${url}" class="displayed-image" alt="Display Image">`;
    } else {
      content.innerHTML = `
        <div class="image-display">
          <div class="image-upload-prompt">
            <div style="font-size: 0.95rem; color: rgba(0,0,0,0.6); margin-bottom: 1rem;">Waiting for image...</div>
          </div>
        </div>
      `;
    }
  }

  togglePower() {
    this.displayPower = !this.displayPower;
    const powerSwitch = document.querySelector('.power-switch');
    
    if (this.displayPower) {
      powerSwitch.classList.add('on');
      document.getElementById('power-status').textContent = 'On';
      this.showDisplayContent();
    } else {
      powerSwitch.classList.remove('on');
      document.getElementById('power-status').textContent = 'Off';
      const content = document.getElementById('display-content');
      content.innerHTML = '<div class="display-off"><div class="display-off-icon">●</div><div class="display-off-text">Display Off</div></div>';
    }

    this.showLoading(this.displayPower ? 'Turning On...' : 'Turning Off...');
  }

  showDisplayContent() {
    // Use server state to determine what to display
    const mode = this.state?.currentMode || 'ready';
    
    if (!this.displayPower) {
      const content = document.getElementById('display-content');
      content.innerHTML = '<div class="display-off"><div class="display-off-icon">●</div><div class="display-off-text">Display Off</div></div>';
      return;
    }
    
    switch (mode) {
      case 'music':
        this.showMusicMode();
        break;
      case 'airplay':
        this.showAirPlayMode();
        break;
      case 'image':
        this.showImageMode();
        break;
      default:
        const content = document.getElementById('display-content');
        content.textContent = '';
        break;
    }
  }

  toggleDisplayMode() {
    this.displayMode = !this.displayMode;
    const btn = document.getElementById('display-mode-btn');
    const app = document.querySelector('.app');
    
    if (this.displayMode) {
      btn.textContent = 'Exit Display';
      btn.style.background = 'linear-gradient(135deg, #ff3b30 0%, #ff2d55 100%)';
      app.classList.remove('controller-mode');
      app.classList.add('display-mode');
      document.body.requestFullscreen?.() || document.body.webkitRequestFullscreen?.();
      this.showDisplayContent();
    } else {
      btn.textContent = 'Display Mode';
      btn.style.background = '';
      app.classList.remove('display-mode');
      app.classList.add('controller-mode');
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
    
    this.sendCommand('setDisplayMode', { enabled: this.displayMode });
    this.updateConnectionStatus(this.ws?.readyState === WebSocket.OPEN);
  }

  async uploadImage() {
    const fileInput = document.getElementById('image-file-input');
    const file = fileInput.files[0];
    
    if (!file) return;

    this.showLoading('Uploading image...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        this.uploadedImage = e.target.result;
        
        const response = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: e.target.result })
        });

        if (response.ok) {
          await response.json();
          setTimeout(() => {
            fileInput.value = '';
            document.getElementById('file-selected-text').textContent = 'Choose Image';
            this.currentMode = 'image';
            // display update will come from server broadcast with imageUrl
            this.sendCommand('mode', { mode: 'image' });
            this.hideModal('image-modal');
          }, 500);
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    };
    reader.readAsDataURL(file);
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

  updateActiveModeUI() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
      if (btn.dataset.action === this.currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  updateUploadButtonVisibility() {
    const uploadBtn = document.getElementById('upload-btn');
    if (!uploadBtn) return;
    uploadBtn.style.display = this.currentMode === 'image' ? 'block' : 'none';
  }

  showLoading(text = 'Sending...') {
    // Loading overlay disabled for instant updates
    return;
  }
}

new DisplayControl();
