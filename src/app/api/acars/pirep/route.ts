import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import * as crypto from 'crypto';
import Pilot from '@/models/Pilot';
import Flight from '@/models/Flight';
import ActiveFlight from '@/models/ActiveFlight';
import Fleet from '@/models/Fleet';
import Bid from '@/models/Bid';
import Tour from '@/models/Tour';
import TourProgress from '@/models/TourProgress';
import Activity from '@/models/Activity';
import ActivityProgress from '@/models/ActivityProgress';
import EventBooking from '@/models/EventBooking';
import Event from '@/models/Event';
import DestinationOfTheMonth from '@/models/DestinationOfTheMonth';
import AirlineFinance from '@/models/AirlineFinance';
import FinanceLog from '@/models/FinanceLog';
import MaintenanceLog from '@/models/MaintenanceLog';
import PilotAward from '@/models/PilotAward';
import { notifyLanding, notifyModeration } from '@/lib/discord';
import { checkAndUpgradeRank } from '@/lib/ranks';
import { checkAndGrantAwards } from '@/lib/awards';
import { calculateFlightCredits, awardFlightCredits } from '@/lib/xp';
import { findPilot, getConfig, corsHeaders } from '@/lib/acars/helpers';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        const params = await request.json();
        const {
            pilotId, flightNumber, callsign, departureIcao, arrivalIcao, alternateIcao,
            route, aircraftType, aircraftRegistration, flightTimeMinutes, landingRate,
            fuelUsed, distanceNm, pax, cargo, score, telemetry, comfortScore, log,
            airframeDamage, comments, acars_version, acarsVersion, timestamp, signature,
        } = params;

        const resolvedAcarsVersion = acarsVersion || acars_version || '1.0.0';

        // --- SECURITY CHECK: HMAC SIGNATURE ---
        const secret = process.env.APP_KEY || '';
        if (secret) {
            if (timestamp === null || signature === null) {
                console.warn(`Security Violation: Unsigned PIREP by ${pilotId}`);
                return NextResponse.json({ error: 'Security Violation: Unsigned Data' }, { status: 403, headers: corsHeaders() });
            }
            if (signature !== '') {
                const dataString = `${pilotId}:${landingRate}:${timestamp}`;
                const expected = crypto.createHmac('sha256', secret).update(dataString).digest('hex');
                if (signature !== expected) {
                    console.error(`Security Alert: Signature Mismatch for ${pilotId}`);
                    return NextResponse.json({ error: 'Security Violation: Data Integrity Failed' }, { status: 403, headers: corsHeaders() });
                }
            } else {
                console.warn(`[PIREP] ${pilotId} submitted without HMAC signature. Allowing with timestamp check only.`);
            }
            if (timestamp !== null && Date.now() - timestamp > 300000) {
                console.warn(`Security Warning: Stale data from ${pilotId}`);
                return NextResponse.json({ error: 'Data is expired (Replay Protection)' }, { status: 403, headers: corsHeaders() });
            }
        }

        const pilot = await findPilot(pilotId);
        if (!pilot) return NextResponse.json({ error: 'Pilot not found' }, { status: 404, headers: corsHeaders() });
        if (pilot.status === 'Blacklist') return NextResponse.json({ error: 'Account blacklisted' }, { status: 403, headers: corsHeaders() });

        // Hard landing flag
        if (landingRate < -800) {
            notifyModeration('hard_landing', `${pilot.first_name} ${pilot.last_name}`, pilotId,
                `Landing rate: **${landingRate} fpm** on ${callsign} (${departureIcao}→${arrivalIcao})`
            ).catch(() => {});
        }

        const isRejected = landingRate <= parseInt(process.env.AUTO_PIREP_REJECT_LANDING_RATE || '-700');
        if (isRejected) {
            await Flight.create({
                pilot_id: pilot._id,
                pilot_name: `${pilot.first_name} ${pilot.last_name}`,
                flight_number: flightNumber || 'N/A', callsign,
                departure_icao: departureIcao, arrival_icao: arrivalIcao,
                alternate_icao: alternateIcao, route, aircraft_type: aircraftType,
                flight_time: flightTimeMinutes, landing_rate: landingRate,
                fuel_used: fuelUsed, distance: distanceNm,
                pax: pax || 0, cargo: cargo || 0, score: score || 100,
                deductions: log?.deductions || [], log,
                approved_status: 2, comments, acars_version: resolvedAcarsVersion,
                submitted_at: new Date(),
            });
            await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });
            await Bid.deleteMany({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } });
            return NextResponse.json({
                success: true,
                message: `PIREP REJECTED! Landing rate of ${landingRate} fpm exceeds threshold of ${process.env.AUTO_PIREP_REJECT_LANDING_RATE || '-700'} fpm.`
            }, { headers: corsHeaders() });
        }

        // --- ECONOMY ---
        const config = await getConfig();
        const simPax = pax || Math.floor(Math.random() * (150 - 50 + 1) + 50);
        const simCargo = cargo || Math.floor(Math.random() * (5000 - 500 + 1) + 500);
        const revenuePax = Math.round(simPax * distanceNm * config.ticket_price_per_nm);
        const revenueCargo = Math.round(simCargo * distanceNm * config.cargo_price_per_lb_nm);
        const totalRevenue = revenuePax + revenueCargo;
        const costFuel = Math.round(fuelUsed * config.fuel_price_per_lb);
        const costLanding = config.base_landing_fee + Math.round(distanceNm * 0.1);
        const costPilot = Math.round((flightTimeMinutes / 60) * config.pilot_pay_rate);
        const costMaintenance = Math.round(distanceNm * 0.5);
        const totalExpenses = costFuel + costLanding + costPilot + costMaintenance;
        const flightPoints = score || 100;
        const fuelTaxAmount = Math.round(totalRevenue * (config.fuel_tax_percent / 100));
        const penaltyAmount = Math.round((100 - flightPoints) * config.penalty_multiplier);
        const totalDeductions = fuelTaxAmount + penaltyAmount;
        const netPilotPay = Math.max(0, totalRevenue - totalDeductions);
        const netProfit = totalRevenue - totalExpenses;

        // DOTM bonus
        const activeDotm = await DestinationOfTheMonth.findOne({ is_active: true });
        let dotmBonus = 0;
        if (activeDotm) {
            const now = new Date();
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            const isWithinDotmPeriod = activeDotm.month === monthNames[now.getMonth()] && activeDotm.year === now.getFullYear();
            if (isWithinDotmPeriod && (departureIcao === activeDotm.airport_icao || arrivalIcao === activeDotm.airport_icao)) {
                dotmBonus = activeDotm.bonus_points;
            }
            if (!isWithinDotmPeriod) await DestinationOfTheMonth.updateOne({ _id: activeDotm._id }, { is_active: false });
        }

        // Butter bonus
        let butterBonus = 0;
        const landingAnalysis = log?.landingAnalysis;
        if (landingAnalysis && landingAnalysis.butterScore >= 8.0) {
            butterBonus = Math.round(landingAnalysis.butterScore * 50);
        }

        // Checkride logic
        let checkrideStatus = 'N/A';
        if (flightNumber && (flightNumber.startsWith('CHK') || flightNumber.startsWith('EXAM'))) {
            checkrideStatus = 'Passed';
            if (landingRate < -400) checkrideStatus = 'Failed (Hard Landing)';
            if (landingAnalysis?.gForceTouchdown && Math.abs(landingAnalysis.gForceTouchdown) > 1.6) checkrideStatus = 'Failed (High G-Force)';
            if (checkrideStatus.startsWith('Failed')) {
                await Flight.create({
                    pilot_id: pilot._id, pilot_name: `${pilot.first_name} ${pilot.last_name}`,
                    flight_number: flightNumber || 'N/A', callsign,
                    departure_icao: departureIcao, arrival_icao: arrivalIcao,
                    aircraft_type: aircraftType, flight_time: flightTimeMinutes,
                    landing_rate: landingRate, fuel_used: fuelUsed, distance: distanceNm,
                    approved_status: 2, comments: `CHECKRIDE FAILED: ${checkrideStatus}`,
                    acars_version: resolvedAcarsVersion, submitted_at: new Date(),
                });
                await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });
                await Bid.deleteMany({ pilot_id: pilot._id, status: { $in: ['Active', 'InProgress'] } });
                return NextResponse.json({ success: true, message: `Checkride FAILED: ${checkrideStatus}. Please try again.` }, { headers: corsHeaders() });
            }
        }

        const getLandingGrade = (rate: number) => {
            const abs = Math.abs(rate);
            if (abs <= 60) return 'Butter';
            if (abs <= 150) return 'Smooth';
            if (abs <= 300) return 'Acceptable';
            if (abs <= 500) return 'Firm';
            return 'Hard';
        };

        const generatePassengerReview = (rate: number, sc: number) => {
            const reviews = {
                excellent: ["Best flight of my life! The landing was like a kiss.", "Smooth operator! Didn't even feel the touchdown.", "Professional service and a perfect landing. A+", "Luxury in the air. 5 stars all the way."],
                good: ["A solid flight, fairly smooth arrival.", "Everything went well. The crew was very polite.", "On time and safe. Average landing.", "Good value for money. Would fly Levant again."],
                firm: ["A bit of a bump on landing, but we got there safe.", "Decent flight, but the touchdown was a little firm.", "Average experience. Nothing special.", "Work on those landings! Otherwise a good flight."],
                bad: ["I think I need to see a chiropractor! Hard landing.", "Terrifying landing. Why was it so hard?", "Not a great experience. Very rough arrival.", "Please retrain the pilot. That was not smooth at all."]
            };
            if (rate > -150 && sc >= 90) return reviews.excellent[Math.floor(Math.random() * reviews.excellent.length)];
            if (rate > -300 && sc >= 75) return reviews.good[Math.floor(Math.random() * reviews.good.length)];
            if (rate > -500) return reviews.firm[Math.floor(Math.random() * reviews.firm.length)];
            return reviews.bad[Math.floor(Math.random() * reviews.bad.length)];
        };

        // Create flight record
        const newFlight = await Flight.create({
            pilot_id: pilot._id, pilot_name: `${pilot.first_name} ${pilot.last_name}`,
            flight_number: flightNumber || 'N/A', callsign,
            departure_icao: departureIcao, arrival_icao: arrivalIcao,
            alternate_icao: alternateIcao, route, aircraft_type: aircraftType,
            flight_time: flightTimeMinutes, landing_rate: landingRate,
            landing_grade: getLandingGrade(landingRate),
            max_g_force: landingAnalysis?.gForceTouchdown || log?.maxGForce || 1.0,
            fuel_used: fuelUsed, distance: distanceNm,
            pax: simPax, cargo: simCargo, score: score || 100,
            deductions: log?.deductions || [], telemetry: telemetry || [],
            comfort_score: comfortScore || 100, log,
            approved_status: 1, comments,
            acars_version: resolvedAcarsVersion, submitted_at: new Date(),
            revenue_passenger: revenuePax, revenue_cargo: revenueCargo,
            expense_fuel: costFuel, expense_airport: costLanding,
            expense_pilot: costPilot, expense_maintenance: costMaintenance,
            real_profit: netProfit,
            passenger_rating: Math.max(1, Math.min(5, Math.ceil((score || 100) / 20))),
            passenger_review: generatePassengerReview(landingRate, score || 100),
        });

        // Event booking auto-match
        try {
            const booking = await EventBooking.findOne({ pilot_id: pilot._id, status: 'booked' }).sort({ booked_at: -1 });
            if (booking) {
                const event = await Event.findById(booking.event_id);
                if (event?.is_active) {
                    const start = event.start_time || event.start_datetime ? new Date(event.start_time || event.start_datetime) : null;
                    const end = event.end_time || event.end_datetime ? new Date(event.end_time || event.end_datetime) : null;
                    const effectiveEnd = end || (start ? new Date(start.getTime() + 12 * 60 * 60 * 1000) : null);
                    const t = new Date(newFlight.submitted_at);
                    const inWindow = !!(start && effectiveEnd && t >= start && t <= effectiveEnd);
                    const evAirports = ((event as any).airports || []).map((a: string) => a.toUpperCase());
                    const airportsMatch = evAirports.length === 0 || evAirports.includes(departureIcao.toUpperCase()) || evAirports.includes(arrivalIcao.toUpperCase());
                    if (inWindow && airportsMatch) {
                        await EventBooking.updateOne({ _id: booking._id }, { $set: { status: 'attended', flight_id: newFlight._id, attended_at: new Date() } });
                        await Flight.updateOne({ _id: newFlight._id }, { $set: { event_id: (event as any)._id } });
                    }
                }
            }
        } catch (e) {
            console.error('[PIREP] Event booking match failed:', e);
        }

        // Airline finances
        let airlineFinance = await AirlineFinance.findOne();
        if (!airlineFinance) airlineFinance = await AirlineFinance.create({ balance: 1000000 });
        await FinanceLog.insertMany([
            { amount: totalRevenue, type: 'Flight Revenue', description: `Revenue Flight ${callsign} (${departureIcao}-${arrivalIcao})`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costFuel, type: 'Fuel Cost', description: `Fuel for ${callsign}`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costLanding, type: 'Landing Fee', description: `Landing Fees at ${arrivalIcao}`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costPilot, type: 'Pilot Pay', description: `Pilot Salary for ${pilot.first_name} ${pilot.last_name}`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: -costMaintenance, type: 'Maintenance', description: `Wear & Tear for ${aircraftType}`, reference_id: newFlight._id, pilot_id: pilot._id },
            { amount: totalDeductions, type: 'FLIGHT_REVENUE_SPLIT', description: `Vault deposit: FuelTax ${fuelTaxAmount} Cr + Penalties ${penaltyAmount} Cr from ${callsign}`, reference_id: newFlight._id, pilot_id: pilot._id },
        ]);
        airlineFinance.balance += netProfit + totalDeductions;
        airlineFinance.total_revenue += totalRevenue;
        airlineFinance.total_expenses += totalExpenses;
        airlineFinance.last_updated = new Date();
        await airlineFinance.save();

        const flightCredits = netPilotPay + dotmBonus + butterBonus;
        await Pilot.findByIdAndUpdate(pilot.id, {
            $inc: { total_flights: 1, total_hours: flightTimeMinutes / 60, total_credits: totalRevenue, balance: flightCredits },
            current_location: arrivalIcao, last_activity: new Date(), status: 'Active',
        });

        // Fleet tracking & damage
        let closedBid = await Bid.findOne({ pilot_id: pilot._id, callsign, status: { $in: ['Active', 'InProgress'] } });
        if (!closedBid) closedBid = await Bid.findOne({ pilot_id: pilot._id.toString(), callsign, status: { $in: ['Active', 'InProgress'] } });

        let specificAircraft = null;
        if (aircraftRegistration) specificAircraft = await Fleet.findOne({ registration: aircraftRegistration });
        if (!specificAircraft && closedBid?.aircraft_registration) specificAircraft = await Fleet.findOne({ registration: closedBid.aircraft_registration });
        if (!specificAircraft && aircraftType) specificAircraft = await Fleet.findOne({ aircraft_type: aircraftType, current_location: departureIcao });

        if (closedBid) await Bid.deleteOne({ _id: closedBid._id });

        let aircraftHealthAfter = 100;
        if (specificAircraft) {
            const healthBefore = specificAircraft.condition;
            let damage = 0.5;
            if (airframeDamage && airframeDamage.totalDamage > 0) {
                damage = airframeDamage.totalDamage;
            } else {
                if (landingRate < -400) damage += (Math.abs(landingRate) - 400) * 0.1;
                if (landingAnalysis?.gForceTouchdown) {
                    const g = Math.abs(landingAnalysis.gForceTouchdown);
                    if (g > 1.8) damage += (g - 1.8) * 10;
                }
            }
            specificAircraft.current_location = arrivalIcao;
            specificAircraft.condition = Math.max(0, Math.round((specificAircraft.condition - damage) * 100) / 100);
            specificAircraft.total_hours += flightTimeMinutes / 60;
            specificAircraft.flight_count += 1;
            if (damage > 0.5) {
                specificAircraft.damage_log = specificAircraft.damage_log || [];
                specificAircraft.damage_log.push({ type: damage >= 50 ? 'SEVERE' : damage >= 5 ? 'HARD_LANDING' : 'WEAR', amount: parseFloat(damage.toFixed(2)), timestamp: new Date(), flight_id: newFlight._id?.toString() });
                if (specificAircraft.damage_log.length > 50) specificAircraft.damage_log = specificAircraft.damage_log.slice(-50);
            }
            const groundedThreshold = config.grounded_health_threshold;
            if (specificAircraft.condition < groundedThreshold) {
                specificAircraft.status = 'Grounded';
                specificAircraft.grounded_reason = `Health dropped to ${specificAircraft.condition.toFixed(1)}% after flight ${callsign}`;
            } else if (specificAircraft.condition < 40) {
                specificAircraft.status = 'Maintenance';
            } else {
                specificAircraft.status = 'Available';
            }
            await specificAircraft.save();
            aircraftHealthAfter = specificAircraft.condition;
            if (damage > 0.5) {
                await MaintenanceLog.create({
                    aircraft_registration: specificAircraft.registration,
                    type: damage >= 50 ? 'DAMAGE_HARD_LANDING' : 'DAMAGE_FLIGHT',
                    health_before: healthBefore, health_after: specificAircraft.condition,
                    cost_cr: 0, description: `Flight ${callsign}: ${damage.toFixed(1)}% damage (LR: ${landingRate} fpm)`,
                    flight_id: newFlight._id, pilot_id: pilot._id,
                });
            }
        }

        // Repair timer for hard landings
        if (specificAircraft && landingRate < -600) {
            try {
                const damagePercent = Math.abs(landingRate + 400) * 0.05;
                const repairHours = Math.ceil(damagePercent * (config.repair_hours_per_percent || 2));
                const repairUntil = new Date(Date.now() + repairHours * 60 * 60 * 1000);
                specificAircraft.status = 'Maintenance';
                specificAircraft.repair_until = repairUntil;
                specificAircraft.damaged_at = new Date();
                specificAircraft.damaged_by_pilot = pilot.pilot_id;
                specificAircraft.damaged_by_flight = newFlight._id?.toString();
                specificAircraft.grounded_reason = `Hard landing ${landingRate} fpm — Under repair until ${repairUntil.toISOString().slice(0, 16)}Z`;
                await specificAircraft.save();
            } catch (repairErr) {
                console.error('Repair timer error (non-fatal):', repairErr);
            }
        }

        let tourMessage = '';

        // Activity progression
        if (closedBid && closedBid.activity_id) {
            try {
                const activity = await Activity.findById(closedBid.activity_id);
                if (activity && activity.active) {
                    let progress = await ActivityProgress.findOne({ pilot_id: pilot._id, activity_id: closedBid.activity_id });
                    if (!progress) {
                        progress = await ActivityProgress.create({ pilot_id: pilot._id, activity_id: closedBid.activity_id, legsComplete: 0, percentComplete: 0, completedLegIds: [] });
                    }
                    const legs = activity.activityLegs || [];
                    const matches = legs.filter((leg: any) => {
                        const routeMatch = (!leg.departure_icao || leg.departure_icao === departureIcao) && (!leg.arrival_icao || leg.arrival_icao === arrivalIcao);
                        const aircraftMatch = !leg.aircraft_types?.length || leg.aircraft_types.includes(aircraftType);
                        return routeMatch && aircraftMatch;
                    });
                    const legToMark = matches.find((leg: any) => !progress?.completedLegIds.includes(leg.id));
                    if (legToMark?.id) {
                        progress.completedLegIds.push(legToMark.id);
                        progress.legsComplete = progress.completedLegIds.length;
                        progress.percentComplete = Math.round((progress.legsComplete / legs.length) * 100);
                        progress.lastLegFlownDate = new Date();
                        if (progress.legsComplete >= legs.length) {
                            progress.dateComplete = new Date();
                            progress.daysToComplete = Math.ceil((progress.dateComplete.getTime() - progress.startDate.getTime()) / (1000 * 60 * 60 * 24));
                            const rewardPoints = activity.reward_points || 0;
                            if (rewardPoints > 0) {
                                await Pilot.findByIdAndUpdate(pilot.id, { $inc: { balance: rewardPoints, total_credits: rewardPoints } });
                                tourMessage += ` ACTIVITY COMPLETED: ${activity.title}! Bonus ${rewardPoints} credits!`;
                            } else {
                                tourMessage += ` ACTIVITY COMPLETED: ${activity.title}!`;
                            }
                        } else {
                            tourMessage += ` Activity Leg ${progress.legsComplete} of ${legs.length} Completed! (${activity.title})`;
                        }
                        await progress.save();
                    }
                }
            } catch (actErr) {
                console.error('Activity progress error:', actErr);
            }
        }

        // Tour progression (legacy)
        const activeTours = await TourProgress.find({ pilot_id: pilot._id, status: 'In Progress' });
        for (const progress of activeTours) {
            const tour = await Tour.findById(progress.tour_id);
            if (tour && (tour as any).is_active) {
                const legs = tour.legs;
                const nextLegIndex = progress.current_leg_index;
                if (nextLegIndex < legs.length) {
                    const nextLeg = legs[nextLegIndex];
                    const routeMatch = nextLeg.departure_icao === departureIcao && nextLeg.arrival_icao === arrivalIcao;
                    const aircraftMatch = !(nextLeg as any).aircraft_type?.length || (nextLeg as any).aircraft_type.includes(aircraftType);
                    if (routeMatch && aircraftMatch) {
                        progress.completed_legs.push(new Date());
                        progress.current_leg_index += 1;
                        if (progress.current_leg_index >= legs.length) {
                            progress.status = 'Completed';
                            progress.completed_at = new Date();
                            if (tour.reward_credits > 0) {
                                await Pilot.findByIdAndUpdate(pilot.id, { $inc: { balance: tour.reward_credits, total_credits: tour.reward_credits } });
                                tourMessage += ` TOUR COMPLETED: ${tour.name}! Bonus ${tour.reward_credits} credits!`;
                            } else {
                                tourMessage += ` TOUR COMPLETED: ${tour.name}!`;
                            }
                            try {
                                const { default: Award } = await import('@/models/Award');
                                const tourAward = await Award.findOne({ linkedTourId: tour._id, active: true });
                                if (tourAward) {
                                    const normalized = (aircraftType || '').replace(/[\s\-_]/g, '').toUpperCase();
                                    if (normalized.includes('A380') || normalized.includes('A388') || normalized.includes('380')) {
                                        tourMessage += ` Fleet violation (A380) — award not granted.`;
                                    } else {
                                        const existing = await PilotAward.findOne({ pilot_id: pilot._id, award_id: tourAward._id });
                                        if (!existing) {
                                            await PilotAward.create({ pilot_id: pilot._id, award_id: tourAward._id, earned_at: new Date() });
                                            tourMessage += ` AWARD UNLOCKED: ${tourAward.name}!`;
                                        }
                                    }
                                }
                            } catch (awardErr) {
                                console.error('Tour award error:', awardErr);
                            }
                        } else {
                            tourMessage += ` Tour Leg ${nextLegIndex + 1} Completed! (${tour.name})`;
                        }
                        await progress.save();
                    }
                }
            }
        }

        // Remove active flight
        await ActiveFlight.deleteOne({ pilot_id: pilot._id, callsign });

        // Event booking legacy logic
        let eventMessage = '';
        try {
            const eventBooking = await EventBooking.findOne({ pilot_id: pilot._id, status: 'booked' }).populate('event_id');
            if (eventBooking && eventBooking.event_id) {
                const event = eventBooking.event_id as any;
                if (event.airports?.includes(departureIcao) && event.airports?.includes(arrivalIcao)) {
                    eventBooking.status = 'completed';
                    await eventBooking.save();
                    const eventBonus = 500;
                    await Pilot.findByIdAndUpdate(pilot.id, { $inc: { total_credits: eventBonus, balance: eventBonus } });
                    eventMessage = ` EVENT FLIGHT COMPLETED: ${event.title}! Bonus ${eventBonus} credits!`;
                }
            }
        } catch (evErr) {
            console.error('[PIREP] Event legacy match error:', evErr);
        }

        // Discord landing notification
        await notifyLanding(`${pilot.first_name} ${pilot.last_name}`, pilot.pilot_id, arrivalIcao, landingRate, score || 100, callsign);

        // Rank & awards check
        const newRank = await checkAndUpgradeRank(pilot.id.toString());
        const newlyGrantedAwards = await checkAndGrantAwards(pilot.id.toString());

        // Bonus credits
        let creditBreakdown = null;
        try {
            const isEventFlight = !!(eventMessage);
            creditBreakdown = await calculateFlightCredits({
                pilotId: pilot.pilot_id, departureIcao, arrivalIcao, landingRate,
                flightTimeMinutes, fuelUsed, plannedFuel: closedBid?.planned_fuel, log, isEventFlight,
            });
            if (creditBreakdown.total > 0) await awardFlightCredits(pilot.pilot_id, creditBreakdown.total, departureIcao, arrivalIcao);
            await Flight.findByIdAndUpdate(newFlight._id, { credits_earned: creditBreakdown.total, credits_breakdown: creditBreakdown.details });
        } catch (crErr) {
            console.error('Credit calculation error (non-fatal):', crErr);
        }

        let message = `PIREP accepted. Airline Profit: ${netProfit > 0 ? '+' : ''}${netProfit}cr. You earned: ${flightCredits}cr.`;
        if (creditBreakdown) message += ` +${creditBreakdown.total} bonus CR`;
        if (checkrideStatus === 'Passed') message += ` CHECKRIDE PASSED!`;
        if (dotmBonus > 0) message += ` (Includes ${dotmBonus} DOTM Bonus!)`;
        if (butterBonus > 0) message += ` (Includes ${butterBonus} Butter Bonus!)`;
        if (tourMessage) message += tourMessage;
        if (eventMessage) message += eventMessage;
        if (newRank) message += ` PROMOTION: ${newRank}!`;

        return NextResponse.json({
            success: true, message,
            creditsEarned: flightCredits, bonusCredits: creditBreakdown?.total || 0,
            creditsBreakdown: creditBreakdown?.details || [],
            newRank, newlyGrantedAwards, aircraftHealth: aircraftHealthAfter,
            revenueBreakdown: { grossRevenue: totalRevenue, fuelTax: fuelTaxAmount, penaltyFines: penaltyAmount, totalDeductions, netPilotPay, dotmBonus, butterBonus, totalEarned: flightCredits },
        }, { headers: corsHeaders() });

    } catch (error: any) {
        console.error('[ACARS PIREP]', error);
        return NextResponse.json({ error: 'Failed to submit PIREP' }, { status: 500, headers: corsHeaders() });
    }
}
