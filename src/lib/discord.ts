const LOGO = 'https://levant-va.com/img/logo.png';
const FOOTER_MAIN = 'Levant Virtual Airlines';
const BANNER = 'https://levant-va.com/img/discord-banner.png';

const DISCORD_WEBHOOKS: Record<DiscordEvent, string> = {
    takeoff:      process.env.DISCORD_WEBHOOK_TAKEOFF       || '',
    landing:      process.env.DISCORD_WEBHOOK_LANDING       || '',
    rankPromote:  process.env.DISCORD_WEBHOOK_RANK_PROMOTE  || '',
    award:        process.env.DISCORD_WEBHOOK_AWARD         || process.env.DISCORD_WEBHOOK_RANK_PROMOTE || '',
    errorLog:     process.env.DISCORD_WEBHOOK_ERROR_LOG     || '',
    moderation:   process.env.DISCORD_MOD_WEBHOOK           || '',
    finance:      process.env.DISCORD_FINANCE_WEBHOOK       || '',
};

type DiscordEvent = 'takeoff' | 'landing' | 'rankPromote' | 'award' | 'errorLog' | 'moderation' | 'finance';

interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    thumbnail?: { url: string };
    footer?: { text: string; icon_url?: string };
    timestamp?: string;
    image?: { url: string };
    author?: { name: string; icon_url?: string; url?: string };
}

export async function sendDiscordNotification(content: string, embeds?: DiscordEmbed[], event: DiscordEvent = 'errorLog') {
    const webhookUrl = DISCORD_WEBHOOKS[event];
    if (!webhookUrl) return;

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, embeds, username: 'Levant Operations', avatar_url: LOGO }),
        });
        if (!res.ok) console.error(`Discord [${event}] failed:`, res.status, await res.text());
    } catch (err) {
        console.error(`Discord [${event}] error:`, err);
    }
}

// Landing quality label
function getLandingGrade(rate: number): string {
    const abs = Math.abs(rate);
    if (abs <= 60) return '\u{1F9C8} Butter!';
    if (abs <= 150) return '\u2705 Smooth';
    if (abs <= 300) return '\u{1F44D} Acceptable';
    if (abs <= 500) return '\u26A0\uFE0F Firm';
    return '\u{1F4A5} Hard Landing';
}

export async function notifyRankPromotion(pilotName: string, pilotId: string, rankName: string, rankImageUrl?: string) {
    await sendDiscordNotification('', [{
        author: { name: 'RANK PROMOTION', icon_url: LOGO },
        title: `\u{1F396}\uFE0F ${pilotName} has been promoted!`,
        description: [
            `> **${pilotName}** (\`${pilotId}\`) has earned a new rank.`,
            '',
            `\u{1F451} **New Rank:** ${rankName}`,
            `\u{1F4CB} **Status:** Active Duty`,
            '',
            '*Congratulations on this achievement!*',
        ].join('\n'),
        color: 0xD4AF37,
        thumbnail: { url: rankImageUrl || 'https://i.pinimg.com/originals/f4/b3/aa/f4b3aaa7400915aa71fd58a2e3ed3bd7.gif' },
        footer: { text: FOOTER_MAIN, icon_url: LOGO },
        timestamp: new Date().toISOString(),
    }], 'rankPromote');
}

export async function notifyTakeoff(pilotName: string, pilotId: string, origin: string, destination: string, aircraft: string, callsign: string) {
    await sendDiscordNotification('', [{
        author: { name: 'FLIGHT DEPARTED', icon_url: LOGO },
        title: `\u{1F6EB} ${callsign} \u2014 Airborne from ${origin}`,
        description: [
            `> **${pilotName}** (\`${pilotId}\`) has departed.`,
            '',
            `\u{1F4CD} **Route:** \`${origin}\` \u2708\uFE0F \`${destination}\``,
            `\u{2708}\uFE0F **Aircraft:** ${aircraft}`,
            `\u{1F4E1} **Callsign:** ${callsign}`,
        ].join('\n'),
        color: 0x3498DB,
        thumbnail: { url: LOGO },
        footer: { text: `${FOOTER_MAIN} \u2022 Live Operations`, icon_url: LOGO },
        timestamp: new Date().toISOString(),
    }], 'takeoff');
}

export async function notifyLanding(pilotName: string, pilotId: string, destination: string, landingRate: number, score: number, callsign: string) {
    const grade = getLandingGrade(landingRate);
    const color = Math.abs(landingRate) <= 150 ? 0x2ECC71 : Math.abs(landingRate) <= 300 ? 0xF1C40F : Math.abs(landingRate) <= 500 ? 0xE67E22 : 0xE74C3C;

    await sendDiscordNotification('', [{
        author: { name: 'FLIGHT ARRIVED', icon_url: LOGO },
        title: `\u{1F6EC} ${callsign} \u2014 Landed at ${destination}`,
        description: [
            `> **${pilotName}** (\`${pilotId}\`) has completed their flight.`,
            '',
            `\u{1F4C9} **Landing Rate:** ${landingRate} fpm`,
            `\u{1F3AF} **Grade:** ${grade}`,
            `\u{2B50} **Flight Score:** ${score}/100`,
        ].join('\n'),
        color,
        thumbnail: { url: LOGO },
        footer: { text: FOOTER_MAIN, icon_url: LOGO },
        timestamp: new Date().toISOString(),
    }], 'landing');
}

const MOD_COLORS = { blacklist: 0xE74C3C, slew_detect: 0xFF6B35, hard_landing: 0xF39C12, cheat_flag: 0xE74C3C } as const;
const MOD_TITLES = { 
    blacklist: '\u{1F6AB} Pilot Blacklisted', 
    slew_detect: '\u26A0\uFE0F Slew / Teleport Detected', 
    hard_landing: '\u{1F4A5} Hard Landing Flagged', 
    cheat_flag: '\u{1F534} Cheat Flag Raised' 
} as const;

export type ModerationEvent = keyof typeof MOD_COLORS;

export async function notifyModeration(type: ModerationEvent, pilotName: string, pilotId: string, details: string) {
    await sendDiscordNotification('', [{
        author: { name: 'MODERATION ALERT', icon_url: LOGO },
        title: MOD_TITLES[type],
        description: [
            `> **Pilot:** ${pilotName} (\`${pilotId}\`)`,
            '',
            details,
        ].join('\n'),
        color: MOD_COLORS[type],
        footer: { text: `${FOOTER_MAIN} \u2022 Moderation System`, icon_url: LOGO },
        timestamp: new Date().toISOString(),
    }], 'moderation');
}

export async function notifyBlacklist(pilotName: string, pilotId: string, reason: string, adminId: string) {
    await notifyModeration('blacklist', pilotName, pilotId, `\u{1F4DD} **Reason:** ${reason}\n\u{1F6E1}\uFE0F **Blacklisted by:** ${adminId}`);
}

export async function notifyError(errorTitle: string, errorMessage: string, context?: string) {
    await sendDiscordNotification('', [{
        author: { name: 'SYSTEM ALERT', icon_url: LOGO },
        title: `\u{1F6A8} ${errorTitle}`,
        description: `\`\`\`\n${errorMessage}\n\`\`\``,
        color: 0xE74C3C,
        fields: context ? [{ name: '\u{1F4CB} Context', value: context, inline: false }] : [],
        footer: { text: `${FOOTER_MAIN} \u2022 System Monitor`, icon_url: LOGO },
        timestamp: new Date().toISOString(),
    }], 'errorLog');
}
