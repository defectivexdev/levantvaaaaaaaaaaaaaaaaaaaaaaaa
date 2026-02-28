import Pilot, { IPilot } from '@/models/Pilot';
import Rank, { IRank } from '@/models/Rank';
import { notifyRankPromotion } from './discord';

/**
 * Checks if a pilot is eligible for a rank upgrade and performs it.
 * @param pilotId The database ID of the pilot (String or ObjectId)
 * @returns The new rank name if upgraded, or null if no change.
 */
export async function checkAndUpgradeRank(pilotId: string): Promise<string | null> {
    try {
        const pilot = await Pilot.findById(pilotId);
        if (!pilot) return null;

        const currentRankName = pilot.rank;
        // Total stats for rank = Flown Hours + Transfer Hours
        const currentHours = (pilot.total_hours || 0) + (pilot.transfer_hours || 0);
        const currentFlights = pilot.total_flights;

        // Fetch all ranks sorted by order
        const allRanks = await Rank.find().sort({ order: 1 });
        if (allRanks.length === 0) return null;

        // Find the current rank object to get its order
        const currentRank = allRanks.find(r => r.name === currentRankName);
        const currentOrder = currentRank ? currentRank.order : -1;

        // Find the highest rank the pilot is eligible for (must have auto_promote = true)
        let eligibleRank: IRank | null = null;

        for (const rank of allRanks) {
            // Only consider for auto-promotion if flag is set and pilot meets requirements
            if (rank.auto_promote && currentHours >= rank.requirement_hours && currentFlights >= rank.requirement_flights) {
                // If this rank's order is higher than the current pilot's rank order, it's a potential upgrade
                if (rank.order > currentOrder) {
                    if (!eligibleRank || rank.order > eligibleRank.order) {
                        eligibleRank = rank;
                    }
                }
            }
        }

        // Only upgrade if we found an eligible higher rank
        if (eligibleRank) {
            console.log(`Upgrading Pilot ${pilot.pilot_id} from ${currentRankName} to ${eligibleRank.name}`);
            
            pilot.rank = eligibleRank.name;
            await pilot.save();
            
            // Send Discord notification
            await notifyRankPromotion(
                `${pilot.first_name} ${pilot.last_name}`,
                pilot.pilot_id,
                eligibleRank.name,
                eligibleRank.image_url
            );
            
            return eligibleRank.name;
        }

        return null;
    } catch (error) {
        console.error('Error checking rank upgrade:', error);
        return null;
    }
}
