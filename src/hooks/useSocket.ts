import { useEffect } from 'react';
import { socketService } from '../services/real-time/socketService';

export function useSocket(event: string, callback: (...args: any[]) => void) {
    useEffect(() => {
        socketService.on(event, callback);

        return () => {
            socketService.off(event, callback);
        };
    }, [event, callback]);
}