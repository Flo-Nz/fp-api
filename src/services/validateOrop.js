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
    if (!rating || !userId) {
        return false;
    }
    return true;
};
