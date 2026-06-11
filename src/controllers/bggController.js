import { Orop } from '../models/Orop.js';
import { fetchBggCover } from '../services/bggClient.js';

/**
 * Fetch and store the BGG cover for a boardgame.
 * If already cached (coverUrl exists), returns it unless ?force=true.
 */
export const getBggCover = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query;

        const orop = await Orop.findById(id);
        if (!orop) {
            return res.status(404).json({ error: 'Boardgame not found' });
        }

        // Return cached cover if available
        if (!force && orop.coverUrl) {
            return res.status(200).json({
                bggId: orop.bggId,
                coverUrl: orop.coverUrl,
                thumbnailUrl: orop.thumbnailUrl,
                cached: true,
            });
        }

        // Try each title until we find a match on BGG
        let bggData = null;
        for (const title of orop.title) {
            bggData = await fetchBggCover(title);
            if (bggData) break;
        }

        if (!bggData) {
            return res.status(404).json({ error: 'No BGG match found' });
        }

        // Store in DB
        await Orop.findByIdAndUpdate(id, {
            $set: {
                bggId: bggData.bggId,
                coverUrl: bggData.coverUrl,
                thumbnailUrl: bggData.thumbnailUrl,
            },
        });

        console.log(`[BGG] Cover fetched for "${orop.title[0]}": ${bggData.coverUrl}`);
        return res.status(200).json({ ...bggData, cached: false });
    } catch (error) {
        console.error('[getBggCover] Error:', error.message);
        return res.status(500).json({ error: error.message });
    }
};
