export const sortOropByTitle = (orops) => {
    const sortedOrops = orops?.sort((a, b) => {
        const titleA = a?.title?.[0]?.toLowerCase();
        const titleB = b?.title?.[0]?.toLowerCase();
        if (titleA < titleB) {
            return -1;
        }
        if (titleA > titleB) {
            return 1;
        }
        return 0;
    });
    return sortedOrops;
};
