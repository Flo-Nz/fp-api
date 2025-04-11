import { deburr, get, includes, invoke, isEmpty } from 'lodash-es';
import { Orop } from '../models/Orop.js';
import moment from 'moment';
import { youtubeClient } from '../services/youtubeClient.js';

const getPlaylist = async (pageToken) => {
    const response = await youtubeClient({
        method: 'get',
        url: '/playlistItems',
        params: {
            part: 'contentDetails,snippet',
            playlistId: process.env.FP_OROP_PLAYLIST_ID,
            pageToken,
            key: process.env.YOUTUBE_API_KEY,
        },
    });
    const { data } = response;
    return data;
};

const findTimestamp = (title, desc) => {
    // Split when we find the "OO:OO" which is the first chapter
    const firstSplit = desc.toLowerCase().split('00:00');
    // Then split again when we find the title
    const secondSplit = firstSplit[1]?.split(title.toLowerCase());
    const minutesRegex = /[0-9][0-9]:[0-9][0-9]/;
    // get the timestamps
    const result = invoke(secondSplit[1], 'match', minutesRegex);

    // if we got timestamps, the first one should be the one of the title. Transform it in seconds and return it.
    if (!isEmpty(result)) {
        return moment.duration(`00:${result[0]}`).asSeconds();
    }
};

const matchVideoWithTitle = (video, searchTitle) => {
    const title = deburr(video.snippet?.title?.toLowerCase() || '');
    const description = deburr(video.snippet?.description?.toLowerCase() || '');
    const searchTitleLower = deburr(searchTitle.toLowerCase());

    return (
        includes(title, searchTitleLower) ||
        includes(description, searchTitleLower)
    );
};

const buildFpOrop = (video, title) => {
    const timestamp = findTimestamp(title, video.snippet.description);

    return {
        publishedDate: moment(video.snippet.publishedAt).format('L'),
        videoTitle: video.snippet.title,
        thumbnail: video.snippet.thumbnails.medium.url,
        timestamp,
        youtubeUrl: `https://www.youtube.com/watch?v=${
            video.snippet.resourceId.videoId
        }&list=${process.env.FP_OROP_PLAYLIST_ID}${
            timestamp ? `&t=${timestamp}s` : ''
        }`,
    };
};

const getYoutubeOrop = async (title, pageToken) => {
    try {
        const oropPage = await getPlaylist(pageToken);
        const items = get(oropPage, 'items', []);

        // Find matching video in current page
        const matchingVideo = items.find((item) =>
            matchVideoWithTitle(item, title)
        );

        if (matchingVideo) {
            return buildFpOrop(matchingVideo, title);
        }

        // Recursively check next page if exists
        if (oropPage.nextPageToken) {
            return getYoutubeOrop(title, oropPage.nextPageToken);
        }

        return null;
    } catch (error) {
        throw new Error(`Failed to fetch YouTube OROP: ${error.message}`);
    }
};

export const findYoutubeOrop = async (req, res) => {
    try {
        const { id } = req.params;
        const { force } = req.query;
        const orop = await Orop.findById(id);
        const existingYoutubeUrl = orop.fpOrop?.youtubeUrl;
        if (!force && existingYoutubeUrl) {
            return res.status(409).json('OROP already added.');
        }

        // Trying for each title of the OROP document title array to find an OROP on Youtube
        for (const title of orop.title) {
            const fpOrop = await getYoutubeOrop(title);
            if (fpOrop !== null) {
                const updateFields = Object.keys(fpOrop).reduce((acc, key) => {
                    acc[`fpOrop.${key}`] = fpOrop[key];
                    return acc;
                }, {});

                console.log('update fields', updateFields);
                const updatedGame = await Orop.findOneAndUpdate(
                    {
                        _id: id,
                    },
                    {
                        $set: {
                            ...updateFields,
                            lastUpdatedBy: res.locals.userId,
                            lastYoutubeScrapping: new Date(),
                        },
                    },
                    { new: true }
                );
                console.log('Youtube scrapping success !', updatedGame);
                return res.status(200).json(updatedGame);
            }
        }
        const updatedGame = await Orop.findOneAndUpdate(
            {
                _id: id,
            },
            {
                $set: {
                    lastUpdatedBy: res.locals.userId,
                    lastYoutubeScrapping: new Date(),
                },
            },
            { new: true }
        );
        res.status(404).json(updatedGame);
    } catch (error) {
        console.log('[findYoutubeOrop] error', error);
        res.status(500).json(error.message);
    }
};
