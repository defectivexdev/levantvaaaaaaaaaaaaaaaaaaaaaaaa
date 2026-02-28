'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.replace('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#070707] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-accent-gold animate-spin" />
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Loading</span>
                </div>
            </div>
        );
    }

    // If not authenticated, show nothing (redirect is happening)
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#070707] flex text-white font-sans animate-fade-in">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-y-auto relative">
                <ErrorBoundary>
                    {children}
                </ErrorBoundary>
            </main>
        </div>
    );
}
