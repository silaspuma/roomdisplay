# Room Display Control Panel

A minimal, full-stack control panel for wall-mounted smart displays. Black and white only, built for simplicity and reliability.

## Features

- **Display Mode**: Toggle between control panel and full-screen display view
- **Mode Management**: Switch between dashboard, music, airplay, cast, image, and off modes
- **Spotify Integration**: Real-time now playing information with progress tracking
- **Power Management**: System sleep/wake control
- **Schedule**: Automated wake and sleep times
- **Image Display**: Upload and display custom images
- **WebSocket**: Real-time state synchronization
- **Mobile-Friendly**: Control your display from any device
- **Smart Animations**: Send animations and loading indicators for all actions
- **Connection Tracking**: Visual indication when displays are connected

## Tech Stack

**Backend:**
- Node.js (LTS)
- Express
- WebSocket (ws)
- Spotify Web API

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- No frameworks or dependencies
- Fully responsive

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd roomdisplay
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

4. Edit `.env` with your settings:
   - Set `PORT` (default: 3000)
   - Add Spotify credentials (optional)
   - Configure `CHROMIUM_URL`

## Spotify Setup (Optional)

To enable Spotify integration:

1. Create an app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Get your Client ID and Client Secret
3. Generate a refresh token using Spotify OAuth flow
4. Add credentials to `.env`

## Usage

Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

Access the dashboard at `http://localhost:3000`

## Modes

- **Dashboard**: Main control interface
- **Music**: Spotify display (requires integration)
- **AirPlay**: Apple AirPlay receiver
- **Cast**: Chromecast receiver
- **Image**: Display uploaded image
- **Off**: Turn off display

## System Requirements

- Linux operating system
- Chromium browser (for kiosk mode)
- UXPlay (for AirPlay mode)
- systemctl (for power management)
- X11 (for display control)

## API Endpoints

- `GET /api/state` - Get current state
- `POST /api/mode` - Change mode
- `POST /api/sleep` - Sleep system
- `POST /api/wake` - Wake system
- `POST /api/schedule` - Update schedule
- `POST /api/image` - Upload image

## WebSocket

Connect to `ws://localhost:3000` for real-time state updates.

## Architecture

The backend is the single source of truth. Frontend reflects state and sends commands. All mode switches are mutually exclusive and managed by the process manager to prevent conflicts.

## License

MIT
