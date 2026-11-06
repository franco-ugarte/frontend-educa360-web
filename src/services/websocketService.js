import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  connect(onConnectedCallback) {
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';
    const token = localStorage.getItem('token');

    this.client = new Client({
      // Compatibilidad con Spring Boot SockJS fallback
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        this.connected = true;
        console.log(' Conectado a WebSocket (STOMP)');
        if (onConnectedCallback) onConnectedCallback();
      },
      onDisconnect: () => {
        this.connected = false;
        console.log(' Desconectado de WebSocket');
      },
      onStompError: (frame) => {
        console.error('Error en STOMP:', frame.headers['message']);
      },
    });

    this.client.activate();
  }

  // Suscribirse a un canal/tópico (ej. /topic/comunicados o /user/queue/notificaciones)
  subscribe(topic, callback) {
    if (!this.client || !this.connected) {
      console.warn('STOMP aún no está conectado. Esperando conexión...');
      return null;
    }
    return this.client.subscribe(topic, (message) => {
      try {
        const payload = JSON.parse(message.body);
        callback(payload);
      } catch (e) {
        callback(message.body);
      }
    });
  }

  // Enviar mensaje hacia el backend (ej. /app/asistencia)
  send(destination, body) {
    if (this.client && this.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
    }
  }
}

const websocketService = new WebSocketService();
export default websocketService;