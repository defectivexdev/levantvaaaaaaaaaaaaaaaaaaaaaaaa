'use client';
import { useState } from 'react';
import { ShoppingBag, Star, Award, Shield, Check } from 'lucide-react';

export default function ShopPage() {
    const [balance, setBalance] = useState(15000); // Mock Balance
    const [inventory, setInventory] = useState<string[]>([]);

    const items = [
        { id: 'cert_777', name: 'Boeing 777 Certification', price: 5000, desc: 'Unlocks Heavy Jet operations.', icon: <PlaneIcon className="w-8 h-8"/>, type: 'Cert' },
        { id: 'badge_ace', name: 'Ace Pilot Badge', price: 2000, desc: 'Display a Gold Ace badge on your profile.', icon: <Star className="w-8 h-8 text-yellow-400"/>, type: 'Badge' },
        { id: 'inv_fuel', name: 'Fuel Subsidy', price: 1000, desc: '10% Discount on fuel for next 5 flights.', icon: <div className="text-2xl">⛽</div>, type: 'Consumable' },
        { id: 'vip_discord', name: 'Discord VIP Role', price: 10000, desc: 'Access to VIP lounge in Discord.', icon: <Shield className="w-8 h-8 text-purple-400"/>, type: 'Perk' },
    ];

    const handleBuy = (item: any) => {
        if (balance >= item.price && !inventory.includes(item.id)) {
            if (confirm(`Purchase ${item.name} for ${item.price} credits?`)) {
                setBalance(prev => prev - item.price);
                setInventory(prev => [...prev, item.id]);
                // Call API here...
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pilot Shop</h1>
                    <p className="text-gray-500 text-xs mt-0.5">Spend your hard-earned flight credits</p>
                </div>
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl px-5 py-3 text-right">
                    <div className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Balance</div>
                    <div className="text-xl font-bold font-mono text-white">{balance.toLocaleString()} <span className="text-xs text-gray-500">cr</span></div>
                </div>
            </div>

            {/* Shop Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {items.map((item) => {
                    const owned = inventory.includes(item.id);
                    const canAfford = balance >= item.price;

                    return (
                        <div key={item.id} className={`bg-[#0a0a0a] border rounded-2xl p-5 flex flex-col group transition-all ${owned ? 'border-emerald-500/20' : 'border-white/[0.06] hover:border-white/[0.1]'}`}>
                             <div className="h-12 flex items-center mb-3">
                                {item.icon}
                             </div>
                             
                             <div className="flex-1">
                                 <h3 className="text-sm font-bold text-white">{item.name}</h3>
                                 <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-1.5">{item.type}</div>
                                 <p className="text-xs text-gray-500 leading-relaxed mb-4">{item.desc}</p>
                             </div>

                             <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-center justify-between">
                                 <div className="font-mono text-lg font-bold text-white">{item.price.toLocaleString()}</div>
                                 <button 
                                     onClick={() => handleBuy(item)}
                                     disabled={owned || !canAfford}
                                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                         owned ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default' : 
                                         canAfford ? 'bg-accent-gold text-[#0a0a0a] hover:brightness-110' : 
                                         'bg-white/[0.04] text-gray-600 cursor-not-allowed'
                                     }`}
                                 >
                                     {owned ? <><Check size={14} /> OWNED</> : <><ShoppingBag size={14} /> BUY</>}
                                 </button>
                             </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

function PlaneIcon({className}: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 12h20"/><path d="M13 2l9 10-9 10"/><path d="M2 12l5-5-5-5"/>
        </svg>
    )
}
