import { meanBy, round } from 'lodash-es';

export const addVirtuals = (orops) => {
    const oropsWithVirtuals = orops.map((doc) => {
        const discordRating =
            round(meanBy(doc.discordOrop?.ratings, 'rating')) || null;
        return { ...doc, discordRating };
    });

    return oropsWithVirtuals;
};
