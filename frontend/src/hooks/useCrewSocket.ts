import { useCallback, useEffect, useRef, useState } from "react";
import type { ConnectionStatus, CrewEvent } from "@/types/events";
import { API_BASE } from "@/utils/api";

const WS_URL = window.location.protocol === "file:"
  ? "ws://localhost:8000/ws"
  : `ws://${window.location.host}/ws`;
const MAX_BACKOFF = 30_000;
const HEARTBEAT_TIMEOUT_MS = 45_000;

export function useCrewSocket(onEvent: (event: CrewEvent) => void) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    }, HEARTBEAT_TIMEOUT_MS);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    mountedRef.current = true;
    setConnectionStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("connected");
      backoffRef.current = 1000;
      resetHeartbeatTimer();
    };

    ws.onmessage = (msg) => {
      try {
        const event: CrewEvent = JSON.parse(msg.data);
        if (event.type === "heartbeat") {
          resetHeartbeatTimer();
          return;
        }
        onEvent(event);
        resetHeartbeatTimer();
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnectionStatus("disconnected");
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);

      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onEvent, resetHeartbeatTimer]);

  const disconnect = useCallback(() => {
    mountedRef.current = false;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startRun = useCallback(async (topic: string, model?: string, thinkingLevel?: string) => {
    const res = await fetch(`${API_BASE}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, model: model || undefined, thinking_level: thinkingLevel || "off" }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `Start run failed: ${res.status}`);
    }
    return res.json();
  }, []);

  const cancelRun = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/cancel`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `Cancel failed: ${res.status}`);
    }
    return res.json();
  }, []);

  // useEffect is necessary here: WebSocket, heartbeat timer, and reconnect timer are
  // external browser resources that must be torn down when the component unmounts.
  // No declarative React alternative exists for cleanup-on-unmount of imperative resources.
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { connectionStatus, connect, disconnect, startRun, cancelRun };
}
