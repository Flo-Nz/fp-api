export const sortOropByTitle = (orops) => {
    const sortedOrops = orops?.sort((a, b) => {
        if (a?.title?.[0] < b?.title?.[0]) {
            return -1;
        }
        if (a?.title?.[0] > b?.title?.[0]) {
            return 1;
        }
        return 0;
    });
    return sortedOrops;
};
