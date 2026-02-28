'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, AlertCircle, Package, ArrowRight, Sparkles, Zap, Star } from 'lucide-react';

interface StoreItem {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: 'Badge' | 'Perk' | 'Other';
    image?: string;
    download_url?: string;
    active: boolean;
}

export default function StorePage() {
    const [items, setItems] = useState<StoreItem[]>([]);
    const [balance, setBalance] = useState(0);
    const [ownedItems, setOwnedItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<'all'>('all');

    const fetchStoreData = async () => {
        try {
            const [storeRes, authRes] = await Promise.all([
                fetch('/api/portal/store/fetch'),
                fetch('/api/auth/me')
            ]);
            
            const storeData = await storeRes.json();
            const authData = await authRes.json();

            if (storeRes.ok) {
                setItems(storeData.items || []);
            }
            if (authRes.ok) {
                setBalance(authData.user?.balance || 0);
                setOwnedItems(authData.user?.inventory || []);
            }
        } catch (error) {
            console.error('Failed to fetch store data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStoreData();
    }, []);

    const handlePurchase = async (itemId: string) => {
        setPurchasing(itemId);
        setMessage(null);
        try {
            const res = await fetch('/api/portal/store/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: data.message, type: 'success' });
                setBalance(data.newBalance);
                setOwnedItems([...ownedItems, itemId]);
            } else {
                setMessage({ text: data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to process purchase', type: 'error' });
        } finally {
            setPurchasing(null);
        }
    };

    const getCategoryStyles = (category: string) => {
        switch (category) {
            case 'Badge': return 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30';
            case 'Perk': return 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30';
            default: return 'from-gray-500/20 to-slate-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const filteredItems = items.filter(item => {
        if ((item.category as string) === 'Skin') return false;
        if ((item.category as string) === 'Type Rating') return false;
        return true;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-[#0a0a0a] border border-white/[0.06] p-8 md:p-12 shadow-2xl">
                {/* Background Decoration */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-gold/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-500/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold uppercase tracking-widest mb-4">
                            <Sparkles className="w-3 h-3" />
                            Premium Boutique
                        </div>
                        <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 tracking-tight">
                            Elevate Your <span className="text-glow text-accent-gold">Experience</span>
                        </h1>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-xl flex flex-col items-center min-w-[240px]">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Current Balance</p>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl font-display font-bold text-white tracking-widest leading-none">
                                    {balance.toLocaleString()}
                                </span>
                                <div className="w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                                    <Zap className="w-4 h-4 text-dark-900 fill-current" />
                                </div>
                            </div>
                            <div className="mt-3 text-[10px] text-gray-500 font-mono">Spendable Credits</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            <div className="flex flex-wrap items-center justify-end gap-4">
                {message && (
                    <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300 ${
                        message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    }`}>
                        {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span className="text-sm font-bold">{message.text}</span>
                    </div>
                )}
            </div>

            {/* Store Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-80 rounded-3xl bg-[#0a0a0a] border border-white/[0.06] animate-pulse" />
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="h-64 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-gray-500">
                    <Package className="w-12 h-12 opacity-20" />
                    <p className="font-medium">No items found in this collection</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredItems.map((item) => (
                        <div key={item._id} className="relative group flex flex-col h-full rounded-[2rem] bg-[#0a0a0a] border border-white/[0.06] hover:border-white/10 transition-all duration-500 hover:-translate-y-2 overflow-hidden shadow-xl">
                            {/* Card Glow Effect */}
                            <div className={`absolute -inset-0.5 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none ${getCategoryStyles(item.category)}`} />

                            {/* Item Media Container */}
                            <div className="h-48 relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-dark-700/50 to-dark-900/50">
                                <span className="text-7xl group-hover:scale-110 transition-transform duration-700 drop-shadow-2xl">🎖️</span>

                                <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest border backdrop-blur-md ${getCategoryStyles(item.category)}`}>
                                    {item.category}
                                </div>
                                
                            </div>

                            {/* Item Content */}
                            <div className="p-8 flex-1 flex flex-col relative z-10">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent-gold transition-colors">{item.name}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-1">{item.description}</p>
                                
                                <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/[0.06]">
                                    <div className="flex flex-col">
                                        <span className="text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">Exchange Price</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-display font-bold text-white font-mono group-hover:text-accent-gold transition-colors">{item.price.toLocaleString()}</span>
                                            <div className="w-4 h-4 rounded-full bg-accent-gold/20 flex items-center justify-center">
                                                <Star className="w-2.5 h-2.5 text-accent-gold fill-current" />
                                            </div>
                                        </div>
                                    </div>

                                    {ownedItems.includes(item._id) ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-6 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                                                <CheckCircle className="w-4 h-4 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                Acquired
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handlePurchase(item._id)}
                                            disabled={purchasing === item._id || balance < item.price}
                                            className="relative overflow-hidden group/btn px-8 py-3 rounded-2xl bg-white text-dark-950 font-black text-xs uppercase tracking-[0.2em] hover:bg-accent-gold hover:text-dark-900 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(255,255,255,0.05)]"
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                {purchasing === item._id ? 'Processing...' : 'Redeem Now'}
                                                {!purchasing && <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
