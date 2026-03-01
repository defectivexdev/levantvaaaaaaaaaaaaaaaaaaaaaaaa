'use client';

import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

// Suppress noisy Pusher logs in production
Pusher.logToConsole = false;

/**
 * Real-time flight data hook via Pusher Channels.
 * Subscribes to the 'flights' channel and listens for 'flight-updated'
 * events triggered server-side when ACARS sends position updates.
 *
 * Falls back gracefully — if Pusher fails, HTTP polling continues as normal.
 */
export function useFlightSocket(onFlightUpdate?: (data: any) => void, onFlightEnded?: (data: { callsign: string; pilotId: string; arrivalIcao: string }) => void) {
    const pusherRef = useRef<Pusher | null>(null);
    const callbackRef = useRef(onFlightUpdate);
    const endedRef = useRef(onFlightEnded);
    callbackRef.current = onFlightUpdate;
    endedRef.current = onFlightEnded;

    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!key || !cluster) return;

        const pusher = new Pusher(key, {
            cluster,
            forceTLS: true,
        });

        const channel = pusher.subscribe('flights');

        channel.bind('flight-updated', (data: any) => {
            callbackRef.current?.(data);
        });

        channel.bind('flight-ended', (data: any) => {
            endedRef.current?.(data);
        });

        pusherRef.current = pusher;

        return () => {
            try {
                channel.unbind_all();
                pusher.unsubscribe('flights');
                if (pusher.connection.state !== 'disconnected') {
                    pusher.disconnect();
                }
            } catch {}
            pusherRef.current = null;
        };
    }, []);

    return pusherRef;
}
