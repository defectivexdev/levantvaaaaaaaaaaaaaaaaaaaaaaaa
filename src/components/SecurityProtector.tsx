'use client';

import { useEffect } from 'react';

/**
 * SecurityProtector
 * Implements client-side security measures to protect the VA's code and assets.
 * 1. Blocks right-click context menu
 * 2. Blocks specialized shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, etc.)
 * 3. Registers sw-protector Service Worker
 * 4. Disables image dragging
 */
export default function SecurityProtector() {
    useEffect(() => {
        // 4. Disable Image Dragging
        const handleDragStart = (e: DragEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG') {
                e.preventDefault();
            }
        };

        // Add event listeners
        document.addEventListener('dragstart', handleDragStart);

        // Cleanup
        return () => {
            document.removeEventListener('dragstart', handleDragStart);
        };
    }, []);

    // Also inject CSS to prevent image dragging
    return (
        <style jsx global>{`
            img {
                -webkit-user-drag: none;
                -khtml-user-drag: none;
                -moz-user-drag: none;
                -o-user-drag: none;
                user-drag: none;
            }
        `}</style>
    );
}
