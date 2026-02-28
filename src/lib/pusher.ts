import Pusher from 'pusher';

let pusherInstance: Pusher | null = null;

export function getPusher(): Pusher {
    if (!pusherInstance) {
        const appId = process.env.PUSHER_APP_ID;
        const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const secret = process.env.PUSHER_SECRET;
        const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!appId || !key || !secret || !cluster) {
            throw new Error('[Pusher] Missing env vars: PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER');
        }

        pusherInstance = new Pusher({
            appId,
            key,
            secret,
            cluster,
            useTLS: true,
        });
    }
    return pusherInstance;
}

export async function triggerFlightUpdate(data: Record<string, any>) {
    try {
        const pusher = getPusher();
        await pusher.trigger('flights', 'flight-updated', data);
    } catch (err: any) {
        console.warn('[Pusher] Failed to trigger flight-updated:', err.message);
    }
}
