import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalConfig extends Document {
    key: string;
    // Economy Rates
    fuel_tax_percent: number;
    penalty_multiplier: number;
    repair_rate_per_percent: number;
    // Revenue Rates
    ticket_price_per_nm: number;
    cargo_price_per_lb_nm: number;
    fuel_price_per_lb: number;
    base_landing_fee: number;
    pilot_pay_rate: number;
    // Damage Thresholds
    hard_landing_threshold: number;
    severe_damage_threshold: number;
    overspeed_damage_per_10s: number;
    gforce_high_threshold: number;
    gforce_low_threshold: number;
    grounded_health_threshold: number;
    // Store → Airline Cr
    store_to_airline_percent: number;
    // Pilot Salary
    salary_enabled: boolean;
    salary_cadet: number;
    salary_second_officer: number;
    salary_first_officer: number;
    salary_senior_first_officer: number;
    salary_captain: number;
    salary_senior_captain: number;
    salary_check_airman: number;
    // Credit Bonuses (Flight Performance)
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
    // Professionalism Penalties
    cr_taxi_speed_penalty: number;
    cr_light_violation_penalty: number;
    cr_overspeed_penalty: number;
    cr_taxi_speed_limit: number;
    // Fleet Repair
    repair_hours_per_percent: number;
    location_based_fleet: boolean;
    // Timestamps
    updated_at: Date;
    updated_by?: string;
}

const GlobalConfigSchema = new Schema<IGlobalConfig>({
    key: { type: String, default: 'LVT_MAIN', unique: true, index: true },
    // Economy Rates
    fuel_tax_percent: { type: Number, default: 10 },
    penalty_multiplier: { type: Number, default: 5 },
    repair_rate_per_percent: { type: Number, default: 100 },
    // Revenue Rates
    ticket_price_per_nm: { type: Number, default: 0.8 },
    cargo_price_per_lb_nm: { type: Number, default: 0.002 },
    fuel_price_per_lb: { type: Number, default: 0.65 },
    base_landing_fee: { type: Number, default: 250 },
    pilot_pay_rate: { type: Number, default: 2500 },
    // Damage Thresholds
    hard_landing_threshold: { type: Number, default: -400 },
    severe_damage_threshold: { type: Number, default: -700 },
    overspeed_damage_per_10s: { type: Number, default: 0.5 },
    gforce_high_threshold: { type: Number, default: 2.5 },
    gforce_low_threshold: { type: Number, default: -1.0 },
    grounded_health_threshold: { type: Number, default: 20 },
    // Store → Airline Cr
    store_to_airline_percent: { type: Number, default: 100 },
    // Pilot Salary (weekly payment in virtual currency)
    salary_enabled: { type: Boolean, default: true },
    salary_cadet: { type: Number, default: 500 },
    salary_second_officer: { type: Number, default: 1000 },
    salary_first_officer: { type: Number, default: 1500 },
    salary_senior_first_officer: { type: Number, default: 2000 },
    salary_captain: { type: Number, default: 3000 },
    salary_senior_captain: { type: Number, default: 4000 },
    salary_check_airman: { type: Number, default: 5000 },
    // Credit Bonuses (Flight Performance)
    cr_base_flight: { type: Number, default: 100 },
    cr_greaser_bonus: { type: Number, default: 50 },
    cr_firm_bonus: { type: Number, default: 25 },
    cr_hard_landing_penalty: { type: Number, default: -50 },
    cr_on_time_bonus: { type: Number, default: 20 },
    cr_fuel_efficiency_bonus: { type: Number, default: 30 },
    cr_first_flight_multiplier: { type: Number, default: 1.2 },
    cr_hub_to_hub_bonus: { type: Number, default: 50 },
    cr_event_multiplier: { type: Number, default: 2.0 },
    cr_long_haul_4h: { type: Number, default: 100 },
    cr_long_haul_8h: { type: Number, default: 250 },
    cr_new_route_bonus: { type: Number, default: 50 },
    // Professionalism Penalties
    cr_taxi_speed_penalty: { type: Number, default: -10 },
    cr_light_violation_penalty: { type: Number, default: -15 },
    cr_overspeed_penalty: { type: Number, default: -50 },
    cr_taxi_speed_limit: { type: Number, default: 30 },
    // Fleet Repair
    repair_hours_per_percent: { type: Number, default: 2 },
    location_based_fleet: { type: Boolean, default: true },
    // Timestamps
    updated_at: { type: Date, default: Date.now },
    updated_by: String,
});

const GlobalConfig = mongoose.models.GlobalConfig || mongoose.model<IGlobalConfig>('GlobalConfig', GlobalConfigSchema);
export default GlobalConfig;
