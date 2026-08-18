import { MicrogridLiveTelemetry, MicrogridHistoryPoint } from '../types/microgrid';

type MessageCallback = (data: { event: string; data: MicrogridLiveTelemetry; history?: MicrogridHistoryPoint[] }) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageCallback> = new Set();
  private reconnectInterval = 3000;
  private isExplicitlyClosed = false;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultWsUrl = `${protocol}//${window.location.host}/ws/live-stream`;
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsUrl;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('⚡ Connected to AI-REMS Live WebSocket Stream');
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.listeners.forEach((callback) => callback(parsed));
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          console.log('WebSocket closed. Reconnecting in 3s...');
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('WebSocket stream error:', error);
      };
    } catch (e) {
      console.warn('WebSocket connection failure, retrying:', e);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  subscribe(callback: MessageCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
