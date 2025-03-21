import axios from 'axios';

export const youtubeClient = async (options) =>
    axios({
        baseURL: process.env.YOUTUBE_API_URL,
        ...options,
    });
