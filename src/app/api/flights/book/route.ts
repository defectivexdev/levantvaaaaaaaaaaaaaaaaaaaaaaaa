import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import Bid from '@/models/Bid';
import Fleet from '@/models/Fleet';
import { PilotModel } from '@/models';

export async function POST(request: NextRequest) {
    const session = await verifyAuth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await connectDB();
        const data = await request.json();
        const { 
            callsign, 
            departure_icao, 
            arrival_icao, 
            aircraft_type, 
            aircraft_registration,
            // SimBrief optional data
            route,
            estimated_flight_time,
            pax,
            cargo,
            planned_fuel,
            rotation_speed,
            simbrief_ofp_id,
            activity_id
        } = data;

        // 1. Check if pilot already has an active bid
        const existingBid = await Bid.findOne({ 
            pilot_id: session.id, 
            status: { $in: ['Active', 'InProgress'] } 
        });

        if (existingBid) {
            return NextResponse.json({ error: 'You already have an active booking. Please complete or cancel it first.' }, { status: 400 });
        }

        // 1b. Check for duplicate flight plan (same SimBrief OFP or same route+callsign by any pilot)
        if (simbrief_ofp_id) {
            const duplicateOfp = await Bid.findOne({
                simbrief_ofp_id,
                status: 'Active'
            });
            if (duplicateOfp) {
                return NextResponse.json({ error: 'This flight plan is already booked by another pilot. Please generate a new OFP on SimBrief.' }, { status: 409 });
            }
        }

        if (callsign) {
            const duplicateCallsign = await Bid.findOne({
                callsign,
                status: 'Active'
            });
            if (duplicateCallsign) {
                return NextResponse.json({ error: `Callsign ${callsign} is already in use by an active flight. Please use a different callsign.` }, { status: 409 });
            }
        }

        // 2. If specific registration requested, validate availability
        if (aircraft_registration) {
            const aircraft = await Fleet.findOne({ registration: aircraft_registration });
            
            if (!aircraft) {
                return NextResponse.json({ error: 'Aircraft not found.' }, { status: 404 });
            }

            if (aircraft.status === 'Maintenance') {
                return NextResponse.json({ error: `Aircraft ${aircraft_registration} is currently in maintenance.` }, { status: 400 });
            }

            if (aircraft.status === 'InFlight') {
                return NextResponse.json({ error: `Aircraft ${aircraft_registration} is currently in use.` }, { status: 400 });
            }

            if (aircraft.current_location.toUpperCase() !== departure_icao.toUpperCase()) {
                return NextResponse.json({ error: `Aircraft ${aircraft_registration} is at ${aircraft.current_location}, not ${departure_icao.toUpperCase()}.` }, { status: 400 });
            }
        }

        // 3. Block VFR-only aircraft
        const VFR_AIRCRAFT = ['C172', 'C152', 'C150', 'C182', 'P28A', 'PA28', 'DR40', 'C206', 'PA18', 'C208'];
        if (aircraft_type && VFR_AIRCRAFT.includes(aircraft_type.toUpperCase())) {
            return NextResponse.json({
                error: `VFR aircraft (${aircraft_type.toUpperCase()}) are not permitted for airline operations. Please select an IFR-capable aircraft.`,
                category: 'VFR_Restricted'
            }, { status: 403 });
        }

        // 4. Fetch Pilot Name
        const pilot = await PilotModel.findById(session.id);
        if (!pilot) {
             return NextResponse.json({ error: 'Pilot profile not found.' }, { status: 404 });
        }

        const pilotName = `${pilot.first_name} ${pilot.last_name}`;

        // 4. Create Bid
        const newBid = await Bid.create({
            pilot_id: session.id,
            pilot_name: pilotName,
            callsign,
            departure_icao: departure_icao.toUpperCase(),
            arrival_icao: arrival_icao.toUpperCase(),
            aircraft_type,
            aircraft_registration,
            route,
            estimated_flight_time,
            pax,
            cargo,
            planned_fuel,
            rotation_speed,
            simbrief_ofp_id,
            activity_id,
            status: 'Active'
        });

        return NextResponse.json({ success: true, bid: newBid });

    } catch (error: any) {
        console.error('Booking error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
