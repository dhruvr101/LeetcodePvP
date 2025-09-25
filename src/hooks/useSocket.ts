import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io("http://127.0.0.1:8000", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from WebSocket");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
};
