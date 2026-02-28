'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, DollarSign, AlertTriangle, Percent, RotateCcw, Sparkles, Wallet, Zap, Plane, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ConfigValues {
    fuel_tax_percent: number;
    penalty_multiplier: number;
    repair_rate_per_percent: number;
    ticket_price_per_nm: number;
    cargo_price_per_lb_nm: number;
    fuel_price_per_lb: number;
    base_landing_fee: number;
    pilot_pay_rate: number;
    hard_landing_threshold: number;
    severe_damage_threshold: number;
    overspeed_damage_per_10s: number;
    gforce_high_threshold: number;
    gforce_low_threshold: number;
    grounded_health_threshold: number;
    store_to_airline_percent: number;
    salary_enabled: number;
    salary_cadet: number;
    salary_second_officer: number;
    salary_first_officer: number;
    salary_senior_first_officer: number;
    salary_captain: number;
    salary_senior_captain: number;
    salary_check_airman: number;
    // Credit Bonuses
    cr_base_flight: number;
    cr_greaser_bonus: number;
    cr_firm_bonus: number;
    cr_hard_landing_penalty: number;
    cr_on_time_bonus: number;
    cr_fuel_efficiency_bonus: number;
    cr_first_flight_multiplier: number;
    cr_hub_to_hub_bonus: number;
    cr_event_multiplier: number;
    cr_long_haul_4h: number;
    cr_long_haul_8h: number;
    cr_new_route_bonus: number;
    cr_taxi_speed_penalty: number;
    cr_light_violation_penalty: number;
    cr_overspeed_penalty: number;
    cr_taxi_speed_limit: number;
    // Fleet
    repair_hours_per_percent: number;
    location_based_fleet: number;
}

const defaultConfig: ConfigValues = {
    fuel_tax_percent: 10,
    penalty_multiplier: 5,
    repair_rate_per_percent: 100,
    ticket_price_per_nm: 0.8,
    cargo_price_per_lb_nm: 0.002,
    fuel_price_per_lb: 0.65,
    base_landing_fee: 250,
    pilot_pay_rate: 2500,
    hard_landing_threshold: -400,
    severe_damage_threshold: -700,
    overspeed_damage_per_10s: 0.5,
    gforce_high_threshold: 2.5,
    gforce_low_threshold: -1.0,
    grounded_health_threshold: 20,
    store_to_airline_percent: 100,
    salary_enabled: 1,
    salary_cadet: 500,
    salary_second_officer: 1000,
    salary_first_officer: 1500,
    salary_senior_first_officer: 2000,
    salary_captain: 3000,
    salary_senior_captain: 4000,
    salary_check_airman: 5000,
    // Credit Bonuses
    cr_base_flight: 100,
    cr_greaser_bonus: 50,
    cr_firm_bonus: 25,
    cr_hard_landing_penalty: -50,
    cr_on_time_bonus: 20,
    cr_fuel_efficiency_bonus: 30,
    cr_first_flight_multiplier: 1.2,
    cr_hub_to_hub_bonus: 50,
    cr_event_multiplier: 2.0,
    cr_long_haul_4h: 100,
    cr_long_haul_8h: 250,
    cr_new_route_bonus: 50,
    cr_taxi_speed_penalty: -10,
    cr_light_violation_penalty: -15,
    cr_overspeed_penalty: -50,
    cr_taxi_speed_limit: 30,
    // Fleet
    repair_hours_per_percent: 2,
    location_based_fleet: 1,
};

interface FieldDef {
    key: keyof ConfigValues;
    label: string;
    unit: string;
    step?: number;
    min?: number;
    max?: number;
    description: string;
}

const economyFields: FieldDef[] = [
    { key: 'fuel_tax_percent', label: 'Fuel Tax', unit: '%', step: 1, min: 0, max: 100, description: 'Percentage of gross income taken as fuel tax → Vault' },
    { key: 'penalty_multiplier', label: 'Penalty Multiplier', unit: 'Cr/pt', step: 1, min: 0, max: 100, description: 'penaltyAmount = (100 - flightScore) × this value' },
    { key: 'repair_rate_per_percent', label: 'Maintenance Rate', unit: 'Cr/1%', step: 10, min: 1, max: 10000, description: 'Cost in Cr to repair 1% of airframe health' },
    { key: 'store_to_airline_percent', label: 'Store → Vault', unit: '%', step: 5, min: 0, max: 100, description: 'Percentage of store purchases transferred to Airline Vault' },
];

const revenueFields: FieldDef[] = [
    { key: 'ticket_price_per_nm', label: 'Ticket Price / NM', unit: 'Cr', step: 0.1, min: 0, description: 'Revenue per PAX per nautical mile' },
    { key: 'cargo_price_per_lb_nm', label: 'Cargo Price / lb·NM', unit: 'Cr', step: 0.001, min: 0, description: 'Revenue per pound cargo per nautical mile' },
    { key: 'fuel_price_per_lb', label: 'Fuel Price / lb', unit: 'Cr', step: 0.05, min: 0, description: 'Fuel cost per pound consumed' },
    { key: 'base_landing_fee', label: 'Base Landing Fee', unit: 'Cr', step: 50, min: 0, description: 'Fixed landing fee per flight' },
    { key: 'pilot_pay_rate', label: 'Pilot Pay Rate', unit: 'Cr/hr', step: 100, min: 0, description: 'Pilot salary per flight hour' },
];

const damageFields: FieldDef[] = [
    { key: 'hard_landing_threshold', label: 'Hard Landing (FPM)', unit: 'fpm', step: 50, max: 0, description: 'VS below this triggers damage (negative value)' },
    { key: 'severe_damage_threshold', label: 'Severe Landing (FPM)', unit: 'fpm', step: 50, max: 0, description: 'VS below this auto-rejects PIREP' },
    { key: 'overspeed_damage_per_10s', label: 'Overspeed Dmg / 10s', unit: '%', step: 0.1, min: 0, description: 'Damage percentage per 10 seconds of overspeed' },
    { key: 'gforce_high_threshold', label: 'G-Force High', unit: 'G', step: 0.1, min: 1, description: 'Positive G threshold for damage' },
    { key: 'gforce_low_threshold', label: 'G-Force Low', unit: 'G', step: 0.1, max: 0, description: 'Negative G threshold for damage' },
    { key: 'grounded_health_threshold', label: 'Grounded Below', unit: '%', step: 5, min: 0, max: 100, description: 'Aircraft grounded when condition drops below this' },
];

export default function AdminSettingsPage() {
    const [config, setConfig] = useState<ConfigValues>(defaultConfig);
    const [original, setOriginal] = useState<ConfigValues>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/config');
            const data = await res.json();
            if (res.ok && data.config) {
                const c = data.config;
                const merged = { ...defaultConfig };
                for (const key of Object.keys(defaultConfig) as (keyof ConfigValues)[]) {
                    if (c[key] !== undefined) (merged as any)[key] = c[key];
                }
                setConfig(merged);
                setOriginal(merged);
            }
        } catch {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchConfig(); }, []);

    const handleChange = (key: keyof ConfigValues, value: number) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const hasChanges = JSON.stringify(config) !== JSON.stringify(original);
    const changedCount = Object.keys(defaultConfig).filter(k => config[k as keyof ConfigValues] !== original[k as keyof ConfigValues]).length;

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Settings saved successfully');
                setOriginal(config);
            } else {
                toast.error(data.error || 'Failed to save settings');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    const renderSection = (title: string, icon: React.ReactNode, color: string, fields: FieldDef[]) => (
        <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                {icon}
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
                <span className="ml-auto text-[10px] text-gray-600 font-mono">{fields.length} params</span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map(field => {
                    const changed = config[field.key] !== original[field.key];
                    return (
                        <div key={field.key} className={`p-4 rounded-xl border transition-all ${changed ? 'border-accent-gold/30 bg-accent-gold/[0.03]' : 'border-white/[0.06] bg-white/[0.01] hover:border-white/10'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-gray-300">{field.label}</label>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${changed ? 'bg-accent-gold/10 text-accent-gold' : 'text-gray-600'}`}>{field.unit}</span>
                            </div>
                            <input
                                type="number"
                                value={config[field.key]}
                                onChange={(e) => handleChange(field.key, parseFloat(e.target.value) || 0)}
                                step={field.step}
                                min={field.min}
                                max={field.max}
                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-accent-gold/50 focus:outline-none transition-colors"
                            />
                            <p className="text-[9px] text-gray-600 mt-1.5 leading-relaxed">{field.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-accent-gold" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Airline Settings</h1>
                        <p className="text-gray-500 text-xs">Economy rates, damage thresholds & maintenance</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <span className="text-[10px] text-accent-gold font-mono bg-accent-gold/10 px-2.5 py-1 rounded-lg border border-accent-gold/20">
                            {changedCount} unsaved
                        </span>
                    )}
                    <button
                        onClick={() => setConfig(original)}
                        disabled={!hasChanges}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${hasChanges ? 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/[0.08]' : 'text-gray-700 cursor-not-allowed'}`}
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                            hasChanges ? 'bg-accent-gold hover:bg-amber-400 text-black shadow-lg shadow-accent-gold/20' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save
                    </button>
                </div>
            </div>

            {/* Sections */}
            {renderSection('Economy & Tax', <DollarSign size={16} className="text-accent-gold" />, 'accent-gold', economyFields)}
            {renderSection('Revenue Rates', <Percent size={16} className="text-emerald-400" />, 'emerald', revenueFields)}
            {renderSection('Damage & Maintenance', <AlertTriangle size={16} className="text-rose-400" />, 'rose', damageFields)}

            {/* Pilot Salary Section */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <Wallet size={16} className="text-green-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Weekly Pilot Salary</h2>
                    <span className="ml-auto text-[10px] text-gray-600 font-mono">Paid every Monday</span>
                </div>
                <div className="p-5">
                    <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.01]">
                        <label className="text-xs font-bold text-gray-300">Salary System</label>
                        <button
                            onClick={() => handleChange('salary_enabled', config.salary_enabled ? 0 : 1)}
                            className={`ml-auto relative w-11 h-6 rounded-full transition-colors ${config.salary_enabled ? 'bg-green-500' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${config.salary_enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>
                        <span className={`text-[10px] font-bold ${config.salary_enabled ? 'text-green-400' : 'text-gray-600'}`}>
                            {config.salary_enabled ? 'ENABLED' : 'DISABLED'}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {([
                            { key: 'salary_cadet' as keyof ConfigValues, label: 'Cadet', rank: 'Entry' },
                            { key: 'salary_second_officer' as keyof ConfigValues, label: 'Second Officer', rank: '50h' },
                            { key: 'salary_first_officer' as keyof ConfigValues, label: 'First Officer', rank: '150h' },
                            { key: 'salary_senior_first_officer' as keyof ConfigValues, label: 'Senior First Officer', rank: '300h' },
                            { key: 'salary_captain' as keyof ConfigValues, label: 'Captain', rank: '500h' },
                            { key: 'salary_senior_captain' as keyof ConfigValues, label: 'Senior Captain', rank: '800h' },
                            { key: 'salary_check_airman' as keyof ConfigValues, label: 'Check Airman', rank: '1200h' },
                        ]).map(field => {
                            const changed = config[field.key] !== original[field.key];
                            return (
                                <div key={field.key} className={`p-4 rounded-xl border transition-all ${changed ? 'border-green-500/30 bg-green-500/[0.03]' : 'border-white/[0.06] bg-white/[0.01] hover:border-white/10'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-300">{field.label}</label>
                                        <span className="text-[9px] font-mono text-gray-600">{field.rank}</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={config[field.key]}
                                        onChange={(e) => handleChange(field.key, parseFloat(e.target.value) || 0)}
                                        step={100}
                                        min={0}
                                        className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-green-500/50 focus:outline-none transition-colors"
                                    />
                                    <p className="text-[9px] text-gray-600 mt-1.5">Cr per week</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Credit Bonuses System */}
            {renderSection('Credits — Flight Performance', <Zap size={16} className="text-blue-400" />, 'blue', [
                { key: 'cr_base_flight', label: 'Base Flight CR', unit: 'CR', step: 10, min: 0, description: 'Base credits awarded for completing any flight' },
                { key: 'cr_greaser_bonus', label: 'Greaser Bonus (< 150 fpm)', unit: 'CR', step: 5, min: 0, description: 'Bonus for butter landing (-1 to -150 fpm)' },
                { key: 'cr_firm_bonus', label: 'Firm Landing Bonus', unit: 'CR', step: 5, min: 0, description: 'Bonus for firm but fair (-151 to -350 fpm)' },
                { key: 'cr_hard_landing_penalty', label: 'Hard Landing Penalty', unit: 'CR', step: 5, max: 0, description: 'Credits deducted for hard landing (-400 to -600 fpm)' },
                { key: 'cr_on_time_bonus', label: 'On-Time Bonus', unit: 'CR', step: 5, min: 0, description: '+CR if within 15 min of estimated arrival' },
                { key: 'cr_fuel_efficiency_bonus', label: 'Fuel Efficiency', unit: 'CR', step: 5, min: 0, description: '+CR if fuel used within 5% of planned fuel' },
            ])}

            {renderSection('Credits — Engagement Multipliers', <Sparkles size={16} className="text-purple-400" />, 'purple', [
                { key: 'cr_first_flight_multiplier', label: '1st Flight of Day', unit: 'x', step: 0.1, min: 1, description: 'Credit multiplier for first flight of the day' },
                { key: 'cr_event_multiplier', label: 'Event Flight', unit: 'x', step: 0.1, min: 1, description: 'Credit multiplier during official VA events' },
                { key: 'cr_hub_to_hub_bonus', label: 'Hub-to-Hub', unit: 'CR', step: 10, min: 0, description: 'Bonus for flying between main hub airports' },
                { key: 'cr_long_haul_4h', label: 'Long Haul 4-8h', unit: 'CR', step: 10, min: 0, description: 'Bonus for 4-8 hour flights' },
                { key: 'cr_long_haul_8h', label: 'Long Haul 8h+', unit: 'CR', step: 25, min: 0, description: 'Bonus for 8+ hour flights' },
                { key: 'cr_new_route_bonus', label: 'New Route Discovery', unit: 'CR', step: 5, min: 0, description: 'Bonus for flying a route never flown before' },
            ])}

            {renderSection('Credits — Professionalism Penalties', <ShieldAlert size={16} className="text-orange-400" />, 'orange', [
                { key: 'cr_taxi_speed_penalty', label: 'Taxi Speed Violation', unit: 'CR', step: 5, max: 0, description: 'Penalty for exceeding taxi speed limit on ground' },
                { key: 'cr_light_violation_penalty', label: 'Light Violation', unit: 'CR', step: 5, max: 0, description: 'Penalty for incorrect lights (landing/strobe/beacon)' },
                { key: 'cr_overspeed_penalty', label: 'Overspeed Penalty', unit: 'CR', step: 10, max: 0, description: 'Penalty for exceeding Vmo/Mmo or 250kt below FL100' },
                { key: 'cr_taxi_speed_limit', label: 'Taxi Speed Limit', unit: 'kts', step: 5, min: 10, max: 50, description: 'Max ground speed allowed during taxi (default 30 kts)' },
            ])}

            {/* Fleet Operations */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <Plane size={16} className="text-sky-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Fleet Operations</h2>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.01]">
                        <label className="text-xs font-bold text-gray-300">Location-Based Fleet</label>
                        <button
                            onClick={() => handleChange('location_based_fleet', config.location_based_fleet ? 0 : 1)}
                            className={`ml-auto relative w-11 h-6 rounded-full transition-colors ${config.location_based_fleet ? 'bg-sky-500' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${config.location_based_fleet ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                        </button>
                        <span className={`text-[10px] font-bold ${config.location_based_fleet ? 'text-sky-400' : 'text-gray-600'}`}>
                            {config.location_based_fleet ? 'ENFORCED' : 'DISABLED'}
                        </span>
                    </div>
                    <p className="text-[9px] text-gray-600 px-1">When enabled, pilots must book aircraft from the airport where it last landed. Encourages tours and realistic operations.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {([
                            { key: 'repair_hours_per_percent' as keyof ConfigValues, label: 'Repair Time', desc: 'Real hours per 1% damage to repair an aircraft' },
                            { key: 'repair_rate_per_percent' as keyof ConfigValues, label: 'Repair Cost', desc: 'Credits per 1% damage for manual repair' },
                        ]).map(field => {
                            const changed = config[field.key] !== original[field.key];
                            return (
                                <div key={field.key} className={`p-4 rounded-xl border transition-all ${changed ? 'border-sky-500/30 bg-sky-500/[0.03]' : 'border-white/[0.06] bg-white/[0.01] hover:border-white/10'}`}>
                                    <label className="text-xs font-bold text-gray-300 mb-2 block">{field.label}</label>
                                    <input type="number" value={config[field.key]} onChange={e => handleChange(field.key, parseFloat(e.target.value) || 0)} step={1} min={0}
                                        className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-sky-500/50 focus:outline-none transition-colors" />
                                    <p className="text-[9px] text-gray-600 mt-1.5">{field.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Formula Preview */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
                    <Sparkles size={16} className="text-purple-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Formula Preview</h2>
                </div>
                <div className="p-6 font-mono text-xs space-y-2 text-gray-400">
                    <div><span className="text-accent-gold">fuelTaxAmount</span> = grossIncome × ({config.fuel_tax_percent}% / 100)</div>
                    <div><span className="text-rose-400">penaltyAmount</span> = (100 - flightScore) × <span className="text-white">{config.penalty_multiplier}</span></div>
                    <div><span className="text-emerald-400">netPilotPay</span> = max(0, grossIncome - fuelTaxAmount - penaltyAmount)</div>
                    <div className="pt-3 border-t border-white/[0.06] mt-3">
                        <span className="text-amber-400">repairCost</span> = damagePercent × <span className="text-white">{config.repair_rate_per_percent}</span> Cr
                    </div>
                    <div className="pt-3 border-t border-white/[0.06] mt-3">
                        <span className="text-blue-400">bonusCredits</span> = ({config.cr_base_flight} + landingBonus + bonuses + penalties) × multiplier
                    </div>
                    <div className="pt-3 border-t border-white/[0.06] mt-3">
                        <span className="text-sky-400">repairTime</span> = damagePercent × <span className="text-white">{config.repair_hours_per_percent}</span> hours
                    </div>
                    <div className="bg-white/[0.02] p-3 rounded-lg mt-2 border border-white/[0.06]">
                        <span className="text-gray-500">Example:</span> Greaser landing + new route + first flight = ({config.cr_base_flight} + {config.cr_greaser_bonus} + {config.cr_new_route_bonus}) × {config.cr_first_flight_multiplier} = <span className="text-blue-400 font-bold">{Math.round((config.cr_base_flight + config.cr_greaser_bonus + config.cr_new_route_bonus) * config.cr_first_flight_multiplier)} CR</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
