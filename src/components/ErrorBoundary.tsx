'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[300px] flex flex-col items-center justify-center gap-4 p-8">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-rose-400" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Something went wrong</h2>
                    <p className="text-sm text-gray-500 max-w-md text-center">
                        {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/[0.08] text-sm font-bold text-gray-300 hover:text-white hover:border-white/20 transition-all"
                    >
                        <RefreshCw size={14} />
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
