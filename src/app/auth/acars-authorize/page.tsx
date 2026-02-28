'use client';

import { useState, useEffect, useRef } from 'react';

export default function AcarsAuthorizePage() {
    const [codeInput, setCodeInput] = useState(['', '', '', '', '', '', '', '', '', '']);
    const [status, setStatus] = useState<'input' | 'verifying' | 'authorizing' | 'success' | 'error'>('input');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(5);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // The code format is "LVA-XXXXXX" — we split into prefix "LVA-" (shown as label) and 6 editable chars
    const CODE_LENGTH = 6;

    // Auto-close countdown after success
    useEffect(() => {
        if (status !== 'success') return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.close();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [status]);

    const getFullCode = () => `LVA-${codeInput.slice(0, CODE_LENGTH).join('')}`;

    const handleInputChange = (index: number, value: string) => {
        const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
        const updated = [...codeInput];
        updated[index] = char;
        setCodeInput(updated);
        setError('');

        // Auto-advance to next input
        if (char && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !codeInput[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter') {
            handleVerifyAndAuthorize();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        let pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '');
        // If user pasted full code like "LVA-A3B7K2", strip prefix
        if (pasted.startsWith('LVA')) pasted = pasted.replace(/^LVA-?/, '');
        const chars = pasted.slice(0, CODE_LENGTH).split('');
        const updated = [...codeInput];
        chars.forEach((ch, i) => { updated[i] = ch; });
        setCodeInput(updated);
        // Focus last filled or next empty
        const nextIdx = Math.min(chars.length, CODE_LENGTH - 1);
        inputRefs.current[nextIdx]?.focus();
    };

    const handleVerifyAndAuthorize = async () => {
        const fullCode = getFullCode();
        if (fullCode.length < 10) {
            setError('Please enter the complete 6-character code from your ACARS app.');
            return;
        }

        setStatus('verifying');
        setError('');

        try {
            // 1. Verify the code exists and is pending
            const verifyRes = await fetch(`/api/auth/acars-token?code=${fullCode}`);

            if (verifyRes.status === 404) {
                setError('Invalid code. Please check the code in your ACARS app and try again.');
                setStatus('input');
                return;
            }
            if (verifyRes.status === 410) {
                setError('This code has expired. Please generate a new one from your ACARS app.');
                setStatus('input');
                return;
            }

            const verifyData = await verifyRes.json();
            if (verifyData.status === 'authorized') {
                setStatus('success');
                return;
            }
            if (verifyData.status !== 'pending') {
                setError('Invalid code status. Please try again.');
                setStatus('input');
                return;
            }

            // 2. Code is valid and pending — authorize it
            setStatus('authorizing');
            const authRes = await fetch('/api/auth/acars-token', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device_code: fullCode }),
            });
            const authData = await authRes.json();

            if (!authRes.ok) {
                setError(authData.error || 'Authorization failed. Please log in to the Crew Center first.');
                setStatus('input');
                return;
            }

            setStatus('success');
        } catch {
            setError('Network error. Please check your connection and try again.');
            setStatus('input');
        }
    };

    const isCodeComplete = codeInput.slice(0, CODE_LENGTH).every(c => c.length === 1);

    return (
        <div className="min-h-screen bg-[#060a12] flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent-gold/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <img src="/img/logo.png" alt="Levant Virtual" className="h-16 mx-auto mb-4 opacity-80" />
                    <h1 className="text-xl font-bold text-white tracking-tight">ACARS Authorization</h1>
                    <div className="flex items-center justify-center gap-3 mt-2">
                        <div className="h-px w-10 bg-gradient-to-r from-transparent to-accent-gold/30" />
                        <p className="text-accent-gold/60 text-[9px] tracking-[0.4em] font-mono uppercase">Flight Deck SSO</p>
                        <div className="h-px w-10 bg-gradient-to-l from-transparent to-accent-gold/30" />
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl">

                    {/* INPUT STATE */}
                    {(status === 'input' || status === 'verifying') && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 mx-auto bg-accent-gold/10 rounded-2xl flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-accent-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-bold text-white">Enter Device Code</h2>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Enter the code displayed in your Levant ACARS desktop application.
                                </p>
                            </div>

                            {/* Code Input */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-center gap-2">
                                    {/* LVA- prefix label */}
                                    <span className="text-xl font-black text-gray-500 font-mono tracking-wider mr-1">LVA-</span>
                                    {/* 6 character inputs */}
                                    {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                                        <input
                                            key={i}
                                            ref={el => { inputRefs.current[i] = el; }}
                                            type="text"
                                            maxLength={1}
                                            value={codeInput[i]}
                                            onChange={e => handleInputChange(i, e.target.value)}
                                            onKeyDown={e => handleKeyDown(i, e)}
                                            onPaste={i === 0 ? handlePaste : undefined}
                                            disabled={status === 'verifying'}
                                            className="w-11 h-14 text-center text-2xl font-black font-mono text-accent-gold bg-white/[0.04] border-2 border-white/10 rounded-lg focus:border-accent-gold/60 focus:bg-white/[0.06] outline-none transition-all uppercase disabled:opacity-50"
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>
                                <p className="text-center text-[9px] text-gray-600 font-mono">
                                    Code format: LVA-XXXXXX
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs text-center font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Permissions */}
                            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Permissions Requested</p>
                                <ul className="space-y-2 text-sm text-gray-300">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Read your pilot profile and flight data
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Submit flight reports (PIREPs)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        Stream live position data
                                    </li>
                                </ul>
                            </div>

                            {/* Authorize Button */}
                            <button
                                onClick={handleVerifyAndAuthorize}
                                disabled={!isCodeComplete || status === 'verifying'}
                                className="w-full relative overflow-hidden group bg-accent-gold hover:bg-accent-gold/90 text-black font-bold py-3.5 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,175,55,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                                {status === 'verifying' ? (
                                    <>
                                        <div className="h-5 w-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        <span>Verifying...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                        AUTHORIZE FLIGHT DECK
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* AUTHORIZING STATE */}
                    {status === 'authorizing' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="h-8 w-8 border-2 border-accent-gold/20 border-t-accent-gold rounded-full animate-spin" />
                            <p className="text-sm text-gray-400">Authorizing your session...</p>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {status === 'success' && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-green-400">Authorization Complete</h2>
                            <p className="text-sm text-gray-400">
                                Your ACARS client has been authorized.<br />
                                You can close this tab and return to the application.
                            </p>
                            <p className="text-[10px] text-gray-600 font-mono">
                                Auto-closing in {countdown}s...
                            </p>
                        </div>
                    )}

                    {/* ERROR STATE (only for fatal errors, inline errors shown above) */}
                    {status === 'error' && (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h2 className="text-lg font-bold text-red-400">Authorization Failed</h2>
                            <p className="text-sm text-gray-400">{error}</p>
                            <a href="/portal/dashboard" className="inline-block text-sm text-accent-gold hover:underline mt-2">
                                Go to Crew Center →
                            </a>
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-gray-700 mt-6">
                    Levant Virtual Airlines • Secure ACARS Authorization
                </p>
            </div>
        </div>
    );
}
