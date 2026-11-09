import { Client } from "@stomp/stompjs";
import { TOKEN_KEY } from "./api";

const rawWs = import.meta.env.VITE_WS_URL || "http://localhost:8080/ws";

function toBrokerUrl(url) {
  return url
    .replace(/^http:\/\//i, "ws://")
    .replace(/^https:\/\//i, "wss://")
    .replace(/\/+$/, "");
}

/**
 * Conecta el panel al broker STOMP del backend.
 * El JWT viaja en el header Authorization del frame CONNECT.
 * Devuelve una función para cerrar la conexión.
 */
export function connectNotifications(onNotification) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return () => {};

  const client = new Client({
    brokerURL: toBrokerUrl(rawWs),
    reconnectDelay: 8000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    connectHeaders: { Authorization: `Bearer ${token}` },
    debug: () => {},
  });

  client.onConnect = () => {
    client.subscribe("/user/queue/notificaciones", (message) => {
      try {
        onNotification(JSON.parse(message.body));
      } catch {
        /* payload no JSON: se ignora */
      }
    });
  };

  client.onStompError = () => {};
  client.onWebSocketError = () => {};
  client.activate();

  return () => {
    try {
      client.deactivate();
    } catch {
      /* noop */
    }
  };
}
