import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { team } = useAuth();

  useEffect(() => {
    const s = io('/', { transports: ['websocket', 'polling'] });
    setSocket(s);
    if (team?.id) s.emit('join:team', team.id);
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    if (socket && team?.id) socket.emit('join:team', team.id);
  }, [team?.id]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
