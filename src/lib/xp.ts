import GlobalConfig from '@/models/GlobalConfig';
import { PilotModel } from '@/models';
import Flight from '@/models/Flight';

export interface CreditBreakdown {
    base: number;
    landing: number;
    onTime: number;
    fuelEfficiency: number;
    longHaul: number;
    hubToHub: number;
    newRoute: number;
    firstFlight: number;
    taxiSpeed: number;
    lightViolation: number;
    overspeed: number;
    multiplier: number;
    total: number;
    details: string[];
}

// Hub airports for hub-to-hub bonus
const HUBS = ['OJAI', 'ORBI', 'OSDI', 'OERK', 'OMDB', 'OTHH'];

export async function calculateFlightCredits(params: {
    pilotId: string;
    departureIcao: string;
    arrivalIcao: string;
    landingRate: number;
    flightTimeMinutes: number;
    fuelUsed?: number;
    plannedFuel?: number;
    log?: any;
    isEventFlight?: boolean;
}): Promise<CreditBreakdown> {
    const { pilotId, departureIcao, arrivalIcao, landingRate, flightTimeMinutes, fuelUsed, plannedFuel, log, isEventFlight } = params;

    const config = await GlobalConfig.findOne({ key: 'LVT_MAIN' }).lean() as any;
    if (!config) {
        return { base: 100, landing: 0, onTime: 0, fuelEfficiency: 0, longHaul: 0, hubToHub: 0, newRoute: 0, firstFlight: 0, taxiSpeed: 0, lightViolation: 0, overspeed: 0, multiplier: 1, total: 100, details: ['Base: +100 CR'] };
    }

    const details: string[] = [];
    let multiplier = 1.0;

    // --- Base XP ---
    const base = config.cr_base_flight || 100;
    details.push(`Base flight: +${base} CR`);

    // --- Landing Rate Bonus/Penalty ---
    let landing = 0;
    const absRate = Math.abs(landingRate);
    if (absRate <= 150) {
        landing = config.cr_greaser_bonus || 50;
        details.push(`Greaser landing (${landingRate} fpm): +${landing} CR`);
    } else if (absRate <= 350) {
        landing = config.cr_firm_bonus || 25;
        details.push(`Firm but fair (${landingRate} fpm): +${landing} CR`);
    } else if (absRate >= 400 && absRate <= 600) {
        landing = config.cr_hard_landing_penalty || -50;
        details.push(`Hard landing (${landingRate} fpm): ${landing} CR`);
    } else if (absRate > 600) {
        landing = (config.cr_hard_landing_penalty || -50) * 2;
        details.push(`Very hard landing (${landingRate} fpm): ${landing} CR`);
    }

    // --- Fuel Efficiency ---
    let fuelEfficiency = 0;
    if (fuelUsed && plannedFuel && plannedFuel > 0) {
        const fuelDiffPercent = Math.abs(fuelUsed - plannedFuel) / plannedFuel * 100;
        if (fuelDiffPercent <= 5) {
            fuelEfficiency = config.cr_fuel_efficiency_bonus || 30;
            details.push(`Fuel efficiency (within 5%): +${fuelEfficiency} CR`);
        }
    }

    // --- Long Haul ---
    let longHaul = 0;
    const flightHours = flightTimeMinutes / 60;
    if (flightHours >= 8) {
        longHaul = config.cr_long_haul_8h || 250;
        details.push(`Long haul 8h+: +${longHaul} CR`);
    } else if (flightHours >= 4) {
        longHaul = config.cr_long_haul_4h || 100;
        details.push(`Long haul 4h+: +${longHaul} CR`);
    }

    // --- Hub-to-Hub ---
    let hubToHub = 0;
    if (HUBS.includes(departureIcao) && HUBS.includes(arrivalIcao) && departureIcao !== arrivalIcao) {
        hubToHub = config.cr_hub_to_hub_bonus || 50;
        details.push(`Hub-to-hub flight: +${hubToHub} CR`);
    }

    // --- New Route Discovery ---
    let newRoute = 0;
    const pilot = await PilotModel.findOne({ pilot_id: pilotId }).select('routes_flown last_flight_date').lean() as any;
    const routeKey = `${departureIcao}-${arrivalIcao}`;
    if (pilot && !pilot.routes_flown?.includes(routeKey)) {
        newRoute = config.cr_new_route_bonus || 50;
        details.push(`New route discovery: +${newRoute} CR`);
    }

    // --- First Flight of the Day ---
    let firstFlight = 0;
    if (pilot?.last_flight_date) {
        const lastDate = new Date(pilot.last_flight_date);
        const today = new Date();
        if (lastDate.toDateString() !== today.toDateString()) {
            firstFlight = 1; // flag for multiplier
            multiplier *= config.cr_first_flight_multiplier || 1.2;
            details.push(`First flight of the day: ${config.cr_first_flight_multiplier || 1.2}x multiplier`);
        }
    } else {
        firstFlight = 1;
        multiplier *= config.cr_first_flight_multiplier || 1.2;
        details.push(`First flight ever: ${config.cr_first_flight_multiplier || 1.2}x multiplier`);
    }

    // --- Event Multiplier ---
    if (isEventFlight) {
        multiplier *= config.cr_event_multiplier || 2.0;
        details.push(`Event flight: ${config.cr_event_multiplier || 2.0}x multiplier`);
    }

    // --- Professionalism Penalties from ACARS log ---
    let taxiSpeed = 0;
    let lightViolation = 0;
    let overspeed = 0;

    if (log?.deductions && Array.isArray(log.deductions)) {
        for (const d of log.deductions) {
            const reason = (d.reason || '').toLowerCase();
            if (reason.includes('taxi') && reason.includes('speed')) {
                taxiSpeed += config.cr_taxi_speed_penalty || -10;
            }
            if (reason.includes('light') || reason.includes('strobe') || reason.includes('landing light')) {
                lightViolation += config.cr_light_violation_penalty || -15;
            }
            if (reason.includes('overspeed') || reason.includes('over speed') || reason.includes('vmo')) {
                overspeed += config.cr_overspeed_penalty || -50;
            }
        }
        if (taxiSpeed) details.push(`Taxi speed violation: ${taxiSpeed} CR`);
        if (lightViolation) details.push(`Light violation: ${lightViolation} CR`);
        if (overspeed) details.push(`Overspeed penalty: ${overspeed} CR`);
    }

    // --- On-Time Bonus (placeholder — needs estimated vs actual comparison) ---
    const onTime = 0;

    // --- Calculate Total ---
    const rawTotal = base + landing + onTime + fuelEfficiency + longHaul + hubToHub + newRoute + taxiSpeed + lightViolation + overspeed;
    const total = Math.max(0, Math.round(rawTotal * multiplier));

    details.push(`---`);
    details.push(`Multiplier: ${multiplier.toFixed(2)}x`);
    details.push(`Total: ${total} CR`);

    return {
        base, landing, onTime, fuelEfficiency, longHaul, hubToHub, newRoute,
        firstFlight, taxiSpeed, lightViolation, overspeed, multiplier, total, details,
    };
}

/**
 * Award flight credits to a pilot's balance and update routes_flown and last_flight_date
 */
export async function awardFlightCredits(pilotId: string, credits: number, departureIcao: string, arrivalIcao: string): Promise<void> {
    const routeKey = `${departureIcao}-${arrivalIcao}`;
    await PilotModel.findOneAndUpdate(
        { pilot_id: pilotId },
        {
            $inc: { balance: credits },
            $addToSet: { routes_flown: routeKey },
            $set: { last_flight_date: new Date() },
        }
    );
}
