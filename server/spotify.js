import fetch from 'node-fetch';

export class SpotifyManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.pollInterval = null;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      return null;
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken
        })
      });

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
      return this.accessToken;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  async getCurrentlyPlaying() {
    const token = await this.getAccessToken();
    if (!token) {
      return {
        playing: false,
        title: '',
        artist: '',
        album: '',
        cover: '',
        progress: 0
      };
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (response.status === 204 || response.status === 404) {
        return {
          playing: false,
          title: '',
          artist: '',
          album: '',
          cover: '',
          progress: 0
        };
      }

      const data = await response.json();
      
      if (!data || !data.item) {
        return {
          playing: false,
          title: '',
          artist: '',
          album: '',
          cover: '',
          progress: 0
        };
      }

      return {
        playing: data.is_playing,
        title: data.item.name || '',
        artist: data.item.artists?.[0]?.name || '',
        album: data.item.album?.name || '',
        cover: data.item.album?.images?.[0]?.url || '',
        progress: data.progress_ms || 0
      };
    } catch (error) {
      console.error('Failed to get currently playing:', error);
      return {
        playing: false,
        title: '',
        artist: '',
        album: '',
        cover: '',
        progress: 0
      };
    }
  }

  startPolling(interval = 3000) {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(async () => {
      const spotifyData = await this.getCurrentlyPlaying();
      this.stateManager.updateSpotify(spotifyData);
    }, interval);

    this.getCurrentlyPlaying().then(data => {
      this.stateManager.updateSpotify(data);
    });
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
