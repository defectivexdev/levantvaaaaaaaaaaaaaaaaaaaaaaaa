import nodemailer from 'nodemailer';

const SMTP_CONFIG = {
    host: (process.env.SMTP_HOST || "").replace('ssl://', ''),
    port: parseInt(process.env.SMTP_PORT || "0"),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
    },
    from: process.env.SMTP_FROM || "",
};

const BASE_URL = process.env.BASE_URL || 'https://levant-va.com';

let _transporter: any = null;

const getTransporter = () => {
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            host: SMTP_CONFIG.host,
            port: SMTP_CONFIG.port,
            secure: SMTP_CONFIG.secure,
            auth: {
                user: SMTP_CONFIG.auth.user,
                pass: SMTP_CONFIG.auth.pass,
            },
        });
    }
    return _transporter;
};

// Use the lazy transporter in all email functions

// Password Reset Email
export const sendPasswordResetEmail = async (to: string, token: string) => {
    const resetLink = `${BASE_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject: 'Password Reset Request - Levant Virtual Airline',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4af37;">Password Reset Request</h2>
                <p>You have requested to reset your password for your Levant Virtual Airline account.</p>
                <p>Please click the link below to reset your password. This link is valid for 60 minutes.</p>
                <p>
                    <a href="${resetLink}" style="background-color: #d4af37; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
                </p>
                <p style="color: #666; font-size: 12px;">Or copy and paste this link: ${resetLink}</p>
                <p style="color: #666;">If you did not request this, please ignore this email.</p>
            </div>
        `,
    };

    try {
        const transporter = getTransporter();
        console.log('Sending password reset email to:', to);
        console.log('SMTP Config:', { host: SMTP_CONFIG.host, port: SMTP_CONFIG.port, user: SMTP_CONFIG.auth.user });
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        throw error;
    }
};

// Registration Pending Activation Email (legacy alias)
export const sendPendingActivationEmail = sendWelcomeEmail;

// Welcome Aboard Briefing Email — sent immediately after registration
export async function sendWelcomeEmail(to: string, pilotId: string, firstName: string) {
    const dashboardLink = `${BASE_URL}/portal/dashboard`;
    const downloadsLink = `${BASE_URL}/portal/downloads`;

    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject: `Welcome Aboard, Captain ${firstName}! ✈️ — Levant Virtual Airline`,
        html: `
            <div style="background-color: #0f172a; color: #f8fafc; font-family: 'JetBrains Mono', 'Cascadia Mono', 'Consolas', monospace; padding: 40px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="${BASE_URL}/img/logo.png" alt="Levant VA" style="width: 80px; height: 80px; border-radius: 50%; border: 2px solid #00cfd5; object-fit: cover;">
                    <h1 style="color: #00cfd5; margin-top: 15px; font-size: 22px; letter-spacing: 3px;">WELCOME TO LEVANT VA</h1>
                    <p style="font-size: 13px; opacity: 0.7; margin-top: 4px;">Pilot ID: <strong style="color: #d4af37;">${pilotId}</strong></p>
                </div>

                <p style="font-size: 14px; line-height: 1.7;">Hello <strong style="color: #d4af37;">Captain ${firstName}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.7;">Your registration is complete. You are now officially cleared for flight operations with Levant Virtual Airline.</p>

                <hr style="border: 0; border-top: 1px solid #334155; margin: 25px 0;">

                <h3 style="color: #00cfd5; font-size: 14px; letter-spacing: 1px;">⚠️ CRITICAL FLIGHT RULES</h3>
                <ul style="line-height: 2; font-size: 13px; padding-left: 20px;">
                    <li><strong>FLEET BAN:</strong> The <span style="color: #ef4444; font-weight: bold;">A380 / A388</span> is strictly prohibited. Use of this aircraft will result in automatic PIREP rejection.</li>
                    <li><strong>MANUAL PROOF:</strong> Manual flight reports must include a valid <strong>IVAO/VATSIM tracker link</strong> or a <strong>screenshot</strong> of your flight summary.</li>
                    <li><strong>SCORING:</strong> Your landing rate, flight conduct, and exceedances are tracked and scored automatically by the ACARS client.</li>
                </ul>

                <h3 style="color: #00cfd5; font-size: 14px; letter-spacing: 1px;">🏅 AWARDS & TOURS</h3>
                <p style="font-size: 13px; line-height: 1.7;">Earn achievement badges by completing Tours. Awards are automatically granted when you finish the final leg. Check the Tours &amp; Events page to get started!</p>

                <h3 style="color: #00cfd5; font-size: 14px; letter-spacing: 1px;">🚀 GETTING STARTED</h3>
                <ol style="line-height: 2; font-size: 13px; padding-left: 20px;">
                    <li>Download the <strong>Levant ACARS</strong> desktop app</li>
                    <li>Log in with your Levant credentials</li>
                    <li>Book a flight via the <strong>Dispatch Center</strong></li>
                    <li>Connect your flight simulator and fly!</li>
                </ol>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${downloadsLink}" style="background-color: #00cfd5; color: #0f172a; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">DOWNLOAD ACARS APP</a>
                </div>
                <div style="text-align: center; margin-top: 12px;">
                    <a href="${dashboardLink}" style="background-color: #d4af37; color: #0f172a; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">OPEN PILOT DASHBOARD</a>
                </div>

                <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0 15px;">
                <p style="font-size: 11px; text-align: center; opacity: 0.4; line-height: 1.6;">
                    Fly Professional. Fly Levant.<br>
                    &copy; ${new Date().getFullYear()} Levant Virtual Airline Operations
                </p>
            </div>
        `,
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Welcome briefing email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
}

// Account Activated Email
export const sendAccountActivatedEmail = async (to: string, pilotId: string, firstName: string) => {
    const loginLink = `${BASE_URL}/login`;

    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject: 'Account Activated - Levant Virtual Airline',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4af37;">Your Account Has Been Activated!</h2>
                <p>Dear ${firstName},</p>
                <p>Great news! Your Levant Virtual Airline account (<strong>${pilotId}</strong>) has been activated.</p>
                <p>You can now log in to the Pilot Portal and start your virtual aviation journey with us!</p>
                <p>
                    <a href="${loginLink}" style="background-color: #d4af37; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Log In Now</a>
                </p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p><strong>Getting Started:</strong></p>
                <ul>
                    <li>Complete your pilot profile</li>
                    <li>Download the ACARS tracker</li>
                    <li>Book your first flight</li>
                </ul>
                <p style="color: #d4af37; font-weight: bold;">Blue Skies and Happy Flying!</p>
                <p style="color: #666;">Levant Virtual Airline Team</p>
            </div>
        `,
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Account activated email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending account activated email:', error);
        return false;
    }
};

// PIREP Approved/Rejected Email
export const sendPirepReviewEmail = async (
    to: string,
    firstName: string,
    flightNumber: string,
    route: string,
    status: 'approved' | 'rejected',
    adminComments?: string
) => {
    const portalLink = `${BASE_URL}/portal/reports`;
    const isApproved = status === 'approved';
    const subject = isApproved
        ? `PIREP Approved — ${flightNumber} — Levant Virtual Airline`
        : `PIREP Rejected — ${flightNumber} — Levant Virtual Airline`;

    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${isApproved ? '#22c55e' : '#ef4444'};">
                    PIREP ${isApproved ? 'Approved ✓' : 'Rejected ✗'}
                </h2>
                <p>Dear ${firstName},</p>
                <p>Your flight report <strong>${flightNumber}</strong> (${route}) has been <strong>${status}</strong> by our review team.</p>
                ${adminComments ? `
                    <div style="background: #f5f5f5; border-left: 4px solid ${isApproved ? '#22c55e' : '#ef4444'}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Admin Comments</p>
                        <p style="margin: 8px 0 0;">${adminComments}</p>
                    </div>
                ` : ''}
                <p>
                    <a href="${portalLink}" style="background-color: #d4af37; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Reports</a>
                </p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #d4af37; font-weight: bold;">Blue Skies!</p>
                <p style="color: #666;">Levant Virtual Airline Team</p>
            </div>
        `,
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log(`PIREP ${status} email sent to ${to}:`, info.messageId);
        return true;
    } catch (error) {
        console.error(`Error sending PIREP ${status} email:`, error);
        return false;
    }
};

// Account Inactive Warning Email (14 Days)
export const sendInactivityReminderEmail = async (to: string, pilotId: string, firstName: string) => {
    const loginLink = `${BASE_URL}/login`;

    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject: 'We Miss You! - Levant Virtual Airline Inactivity Reminder',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4af37;">It's Been a While...</h2>
                <p>Dear ${firstName},</p>
                <p>We noticed you haven't completed a flight with Levant Virtual Airline in over 14 days.</p>
                <p>According to our policy, accounts with no activity for 30 days are marked as <strong>Inactive</strong>. We'd love to see you back in the skies before that happens!</p>
                <p>Log in now to browse our current tours or book a new flight via the Dispatch Center.</p>
                <p>
                    <a href="${loginLink}" style="background-color: #d4af37; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Return to Portal</a>
                </p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #d4af37; font-weight: bold;">Blue Skies!</p>
                <p style="color: #666;">Levant Virtual Airline Team</p>
            </div>
        `,
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Inactivity reminder email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending inactivity reminder email:', error);
        return false;
    }
};

// Account Blacklisted Email
export const sendBlacklistNotificationEmail = async (to: string, pilotId: string, firstName: string, reason: string) => {
    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject: 'Account Blacklisted - Levant Virtual Airline',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ef4444;">Account Blacklisted</h2>
                <p>Dear ${firstName},</p>
                <p>We regret to inform you that your Levant Virtual Airline account (<strong>${pilotId}</strong>) has been <strong>blacklisted</strong>.</p>
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Reason</p>
                    <p style="margin: 8px 0 0; color: #333;">${reason}</p>
                </div>
                <p>This means you will no longer be able to access the Pilot Portal or submit flights.</p>
                <p>If you believe this is an error or would like to appeal, please contact us via Discord.</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666;">Levant Virtual Airline Team</p>
            </div>
        `,
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Blacklist notification email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending blacklist notification email:', error);
        return false;
    }
};

// Profile Edited by Admin Notification
export const sendProfileEditedEmail = async (to: string, pilotId: string, firstName: string, changes: string[]) => {
    const loginLink = `${BASE_URL}/login`;

    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject: 'Your Profile Has Been Updated - Levant Virtual Airline',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4af37;">Profile Update Notice</h2>
                <p>Dear ${firstName},</p>
                <p>Your Levant Virtual Airline profile (<strong>${pilotId}</strong>) has been updated by an administrator.</p>
                <div style="background: #f5f5f5; border-left: 4px solid #d4af37; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Changes Made</p>
                    <ul style="margin: 8px 0 0; padding-left: 20px;">
                        ${changes.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                </div>
                <p>If you have any questions about these changes, please contact our staff via Discord.</p>
                <p>
                    <a href="${loginLink}" style="background-color: #d4af37; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Your Profile</a>
                </p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #d4af37; font-weight: bold;">Blue Skies!</p>
                <p style="color: #666;">Levant Virtual Airline Team</p>
            </div>
        `,
    };

    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log('Profile edited notification email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending profile edited email:', error);
        return false;
    }
};

// Account Inactive Notice (30 Days)
export const sendAccountInactiveEmail = async (to: string, pilotId: string, firstName: string) => {
    const loginLink = `${BASE_URL}/login`;

    const mailOptions = {
        from: SMTP_CONFIG.from,
        to,
        subject: 'Account Inactive Notice - Levant Virtual Airline',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #e67e22;">Account Inactive Notice</h2>
                <p>Dear ${firstName},</p>
                <p>We noticed that your Levant Virtual Airline account (<strong>${pilotId}</strong>) has been marked as inactive due to no flight activity.</p>
                <p><strong>Inactivity Policy:</strong></p>
                <ul>
                    <li>New pilots: Must complete a flight within 14 days of registration</li>
                    <li>Active pilots: Must complete a flight every 30 days</li>
                </ul>
                <p>To reactivate your account, simply log in and complete a flight. Your account will automatically be reactivated once we receive your flight report.</p>
                <p>
                    <a href="${loginLink}" style="background-color: #d4af37; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Log In and Fly</a>
                </p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #666;">If you believe this is an error or need assistance, please contact us via Discord.</p>
                <p style="color: #666;">Levant Virtual Airline Team</p>
            </div>
        `,
    };

    try {
        const info = await _transporter.sendMail(mailOptions);
        console.log('Account inactive email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending account inactive email:', error);
        return false;
    }
};
