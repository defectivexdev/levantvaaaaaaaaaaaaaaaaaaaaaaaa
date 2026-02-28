import Pilot from '@/models/Pilot';
import Award, { IAward } from '@/models/Award';
import PilotAward from '@/models/PilotAward';
import { sendDiscordNotification } from './discord';

/**
 * Checks and grants automated awards based on pilot statistics.
 * @param pilotInternalId The MongoDB _id of the pilot
 */
export async function checkAndGrantAwards(pilotInternalId: string) {
    const newlyGranted: IAward[] = [];
    try {
        const pilot = await Pilot.findById(pilotInternalId);
        if (!pilot) return [];

        // Fetch all active automated awards
        const automatedAwards = await Award.find({ 
            active: true, 
            category: { $in: ['Flight Hours', 'Flights', 'Landings'] } 
        });

        for (const award of automatedAwards) {
            let pilotValue = 0;
            
            switch (award.category) {
                case 'Flight Hours':
                    pilotValue = pilot.total_hours;
                    break;
                case 'Flights':
                    pilotValue = pilot.total_flights;
                    break;
                case 'Landings':
                    // Assuming total_flights is total landings for now, or track landings separately
                    pilotValue = pilot.total_flights;
                    break;
            }

            if (award.requiredValue && pilotValue >= award.requiredValue) {
                // Check if pilot already has this award
                const existing = await PilotAward.findOne({ 
                    pilot_id: pilot._id, 
                    award_id: award._id 
                });

                if (!existing) {
                    // Grant the award!
                    await PilotAward.create({
                        pilot_id: pilot._id,
                        award_id: award._id,
                        earned_at: new Date()
                    });

                    newlyGranted.push(award);
                    console.log(`Award Granted: Pilot ${pilot.pilot_id} earned "${award.name}"`);

                    // Discord Notification for Award
                    await sendDiscordNotification(`🏆 **ACHIEVEMENT UNLOCKED!**`, [
                        {
                            title: 'New Award Earned!',
                            description: `**${pilot.first_name} ${pilot.last_name} | ${pilot.pilot_id}** has earned the **${award.name}** award!`,
                            color: 0x3498DB, // Blue
                            thumbnail: {
                                url: award.imageUrl || 'https://levant-va.com/img/awards/default.png'
                            },
                            fields: [
                                { name: 'Category', value: award.category || 'Special', inline: true },
                                { name: 'Requirement', value: `${award.requiredValue} ${award.category}`, inline: true }
                            ],
                            footer: { text: 'Levant Virtual Airline • Excellence in Operations' },
                            timestamp: new Date().toISOString()
                        }
                    ], 'award');
                }
            }
        }
    } catch (error) {
        console.error('Error checking automated awards:', error);
    }
    return newlyGranted;
}
