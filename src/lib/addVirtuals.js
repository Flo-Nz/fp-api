/**
 * Aggregation stage that computes discordRating as a rounded average.
 * Use this in pipelines instead of computing in JS.
 */
export const discordRatingStage = {
    $addFields: {
        discordRating: {
            $cond: {
                if: {
                    $and: [
                        { $isArray: '$discordOrop.ratings' },
                        { $gt: [{ $size: '$discordOrop.ratings' }, 0] },
                    ],
                },
                then: { $round: [{ $avg: '$discordOrop.ratings.rating' }] },
                else: null,
            },
        },
    },
};

/**
 * Fallback for cases where aggregation isn't used.
 * Computes discordRating in JS on plain objects.
 */
export const addVirtuals = (orops) => {
    return orops.map((doc) => {
        const ratings = doc.discordOrop?.ratings;
        let discordRating = null;
        if (ratings?.length > 0) {
            const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
            discordRating = Math.round(sum / ratings.length);
        }
        return { ...doc, discordRating };
    });
};
