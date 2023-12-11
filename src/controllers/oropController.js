import { get, keys, map, omit } from 'lodash-es';
import { Orop } from '../models/Orop.js';
import { isValidFpOrop } from '../services/validateOrop.js';

export const getAllOrop = async (req, res) => {
    try {
        const allOrop = await Orop.find();
        return res.status(200).json(allOrop);
    } catch (error) {
        return res
            .status(500)
            .json(
                `There was a problem during the query. Please try again later`
            );
    }
};

export const getTopSearchedOrop = async (req, res) => {
    try {
        const { query: params } = req;
        const { limit, withVideo } = params;
        const query =
            withVideo === 'true'
                ? { 'fpOrop.youtubeUrl': { $exists: true } }
                : {};
        const topSearchedOrop = await Orop.find(query, null, {
            sort: { searchCount: -1 },
            limit: limit && limit <= 30 ? limit : 10,
        });
        console.log('[getTopSearchedOrop] returning top with params: ', {
            limit,
            withVideo,
        });
        return res.status(200).json(topSearchedOrop);
    } catch (error) {
        res.status(500).json(
            `Something went wrong during getTopSearchedOrop ${error}`
        );
    }
};

export const getTopRatedOrop = async (req, res) => {
    try {
        const { query: params } = req;
        const { limit, onlyFP } = params;

        if (onlyFP === 'true') {
            const topFpRatedOrop = await Orop.find(
                { 'fpOrop.rating': { $exists: true } },
                null,
                {
                    sort: { 'fpOrop.rating': -1 },
                    limit: limit && limit <= 30 ? limit : 10,
                }
            );
            console.log('[getTopRatedOrop] returning FP TOP');
            return res.status(200).json(topFpRatedOrop);
        }

        const topRatedOrop = await Orop.find(
            { 'discordOrop.ratings.1': { $exists: true } },
            { title: 1, discordOrop: 1, discordRating: 1 }
        );

        const sortedTopRatedOrop = topRatedOrop
            .sort((a, b) => a?.discordRating - b?.discordRating)
            .reverse();

        console.log('[getTopRateOrop] returning DISCORD TOP');
        return res.status(200).json(sortedTopRatedOrop.slice(0, 12));
    } catch (error) {
        res.status(500).json(
            `Something went wrong during getTopRatedOrop ${error}`
        );
    }
};

export const getOneOrop = async (req, res) => {
    try {
        const { query } = req;
        if (!query) {
            console.warn('[getOneOrop] No query param in request for FP OROP');
            return res.status(400).json('Missing query param');
        }
        const { title } = query;
        const orop = await Orop.findOne({ title });
        if (orop) {
            const updatedOrop = await Orop.findOneAndUpdate(
                { _id: orop._id },
                { $inc: { searchCount: 1 } },
                { new: true }
            );
            console.log(
                '[getOneOrop] Search incrementation and found one orop with title: ',
                title
            );
            return res.status(200).json(updatedOrop);
        }
        console.warn('[getOneOrop] No Orop found with query', query);
        return res.status(404).json(`No OROP found with query ${query.title}`);
    } catch (error) {
        console.warn('[getOneOrop] OROP Not found', error);
        return res.status(404).json(`No OROP found ${error}`);
    }
};

export const upsertFpOrop = async (req, res) => {
    try {
        const { body } = req;
        // omit the title from the body as we want to apply "$addToSet" to enforce uniqueness
        const bodyWithoutTitle = omit(body, 'title');
        if (!body?.title || !isValidFpOrop(body?.fpOrop)) {
            console.warn('[upsertFpOrop] Bad Request', {
                title: body?.title,
                fpOrop: body?.fpOrop,
            });
            return res
                .status(400)
                .json(
                    `Missing required field (title, fpOrop youtubeUrl,thumbnail,publishedDate,videoTitle)`
                );
        }
        const { fpOrop } = bodyWithoutTitle;
        // we need to map the keys of fpOrop to set the new fpOrop field without erasing existing fields (like "rating" for ex)
        const fpOropKeys = map(keys(fpOrop), (key) => `fpOrop.${key}`);
        const fpOropMongoSet = {};
        for (const key of fpOropKeys) {
            fpOropMongoSet[key] = get(bodyWithoutTitle, key);
        }
        const orop = await Orop.findOneAndUpdate(
            {
                title: { $elemMatch: { $eq: body.title.toLowerCase() } },
            },
            {
                $set: {
                    ...fpOropMongoSet,
                },
                $addToSet: { title: body.title?.toLowerCase() },
                $inc: { searchCount: 1 },
            },
            { new: true, upsert: true }
        );
        console.log('[upsertFpOrop] Success: ', orop.title);
        console.log('OROP UPDATED ? ', orop);
        return res.status(200).json(orop);
    } catch (error) {
        return res.status(400).json(`Impossible to upsert OROP. ${error}`);
    }
};

export const upsertFpOropRating = async (req, res) => {
    try {
        const { body } = req;
        const { title, rating } = body;
        if (!title || !rating) {
            return res.status(400).json(`Missing title or rating`);
        }
        const orop = await Orop.findOneAndUpdate(
            { title: { $elemMatch: { $eq: title } } },
            {
                $set: { 'fpOrop.rating': parseInt(rating) },
                $addToSet: { title: title.toLowerCase() },
            },
            { new: true, upsert: true }
        );
        return res.status(200).json(orop);
    } catch (error) {
        return res.status(500).json(`Something went wrong. ${error}`);
    }
};

export const upsertDiscordOrop = async (req, res) => {
    try {
        const { body } = req;
        const { title, userId, rating } = body;
        if (!title || !userId || !rating) {
            console.warn('[upsertDiscordOrop] Bad request', {
                title,
                userId,
                rating,
            });
            return res
                .status(400)
                .json(`Missing required field (title, userId, rating)`);
        }

        // Replace rating if already rated
        const orop = await Orop.findOneAndUpdate(
            { title, 'discordOrop.ratings.userId': userId },
            {
                $set: {
                    'discordOrop.ratings.$[elem].rating': rating,
                },
                $inc: { searchCount: 1 },
            },
            {
                arrayFilters: [{ 'elem.userId': { $eq: userId } }],
                new: true,
            }
        );
        if (orop) {
            console.log('[upsertDiscordOrop] Rating modified', {
                orop,
                updated: true,
            });
            return res.status(200).json({ orop, updated: true });
        }
        // Try to insert new rating if existing Orop
        const newRatingOrop = await Orop.findOneAndUpdate(
            { title },
            {
                $push: { 'discordOrop.ratings': { userId, rating } },
                $inc: { searchCount: 1 },
            },
            { new: true }
        );
        if (newRatingOrop) {
            console.log('[upsertDiscordOrop] New Rating Success', {
                orop: newRatingOrop,
                updated: false,
            });
            return res
                .status(200)
                .json({ orop: newRatingOrop, updated: false });
        }

        // If no OROP found, insert new one with the user's rating
        const newDiscordOrop = await Orop.create({
            title,
            fpOrop: {},
            discordOrop: { ratings: [{ userId, rating }] },
            searchCount: 1,
        });
        if (newDiscordOrop) {
            console.log(
                '[upsertDiscordOrop] No OROP found, inserting new one',
                title
            );
            return res.status(200).json({
                orop: newDiscordOrop,
                updated: false,
                created: true,
            });
        }
        return;
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

export const getAllUserRatings = async (req, res) => {
    try {
        const { query } = req;
        const { userId, skip } = query;
        if (!userId) {
            console.warn('[getAllUserRatings] Bad request', {
                userId,
            });
            return res
                .status(400)
                .json(`Missing required query parameter (userId)`);
        }

        // Replace rating if already rated
        const userOrops = await Orop.find(
            { 'discordOrop.ratings.userId': userId },
            { title: 1, 'discordOrop.ratings.$': 1 },
            { sort: { title: 1 }, skip, limit: 12 }
        );
        console.log(
            userOrops.length > 0
                ? '[GetAllUserRatings] Returning ratings for'
                : '[GetAllUserRatings] No more ratings',
            userId
        );
        return res.status(200).json(userOrops);
    } catch (error) {
        return res.status(500).json(error.message);
    }
};
