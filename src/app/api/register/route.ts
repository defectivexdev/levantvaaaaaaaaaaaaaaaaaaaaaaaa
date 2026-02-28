import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/database';
import Pilot from '@/models/Pilot';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        
        const body = await request.json();
        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

        const firstName = capitalize(body.firstName);
        const lastName = capitalize(body.lastName);
        const {
            email,
            password,
            phoneNumber,
            country,
            city,
            timezone,
            desiredCallsign,
            baseAirport,
        } = body;

        // Validate required fields
        if (!firstName || !lastName || !email || !password || !country || !timezone || !baseAirport) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Only allow @gmail.com email addresses
        if (!email.toLowerCase().endsWith('@gmail.com')) {
            return NextResponse.json(
                { error: 'Only Gmail addresses (@gmail.com) are accepted for registration.' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await Pilot.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 400 }
            );
        }

        // Validate callsign format: must be LVT + 1-3 alphanumeric chars (e.g. LVT6AT, LVT11, LVT9A)
        const callsign = desiredCallsign?.trim().toUpperCase();
        if (!callsign) {
            return NextResponse.json(
                { error: 'Callsign is required' },
                { status: 400 }
            );
        }

        if (!/^LVT[A-Z0-9]{1,3}$/.test(callsign)) {
            return NextResponse.json(
                { error: 'Callsign must start with LVT followed by 1-3 characters' },
                { status: 400 }
            );
        }

        const existingCallsign = await Pilot.findOne({ pilot_id: callsign });
        if (existingCallsign) {
            return NextResponse.json(
                { error: 'Callsign already in use' },
                { status: 400 }
            );
        }

        const pilotId = callsign;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new pilot with Active status (Key System removed)
        let finalBase = baseAirport;
        if (baseAirport === 'RANDOM') {
            const options = ['OSDI', 'OJAI', 'ORBI'];
            finalBase = options[Math.floor(Math.random() * options.length)];
        }

        const newPilot = await Pilot.create({
            pilot_id: pilotId,
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone_number: phoneNumber,
            country,
            city,
            timezone,
            desired_callsign: desiredCallsign,
            rank: 'Cadet',
            status: 'Active', 
            role: 'Pilot',
            is_admin: false,
            current_location: finalBase,
            home_base: finalBase,
        });

        // Send Welcome Aboard briefing email
        await sendWelcomeEmail(email, pilotId, firstName);

        return NextResponse.json({
            success: true,
            message: 'Registration successful. Your account is pending activation.',
            pilotId: newPilot.pilot_id,
        });

    } catch (error: any) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
