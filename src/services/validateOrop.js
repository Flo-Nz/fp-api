export const isValidFpOrop = (orop) => {
    if (
        !orop.youtubeUrl ||
        !orop.publishedDate ||
        !orop.videoTitle ||
        !orop.thumbnail
    ) {
        return false;
    }
    return true;
};

export const isValidDiscordOrop = (orop) => {
    if (!orop.rating || !orop.userId) {
        return false;
    }
    return true;
};
