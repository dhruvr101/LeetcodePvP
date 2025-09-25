import { createContext, useContext, useState } from "react";

interface Player {
  id: string;
  name: string;
  score: number;
}

interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  started: boolean;
  timeLeft?: number;
}

const RoomContext = createContext<{
  room: Room | null;
  setRoom: (room: Room | null) => void;
}>({
  room: null,
  setRoom: () => {},
});

export const RoomProvider = ({ children }: { children: React.ReactNode }) => {
  const [room, setRoom] = useState<Room | null>(null);
  return (
    <RoomContext.Provider value={{ room, setRoom }}>
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => useContext(RoomContext);
