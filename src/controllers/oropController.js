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
            await Orop.updateOne(
                { _id: orop._id },
                { $inc: { searchCount: 1 } }
            );
            console.log('[getOneOrop] Search incrementation for OROP:', title);
            return res.status(200).json(orop);
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
        const fpOropKeys = map(keys(fpOrop), (key) => `fpOrop.${key}`);
        const fpOropMongoSet = {};
        for (const key of fpOropKeys) {
            fpOropMongoSet[key] = get(bodyWithoutTitle, key);
        }
        const orop = await Orop.findOneAndUpdate(
            {
                'fpOrop.youtubeUrl': body.fpOrop?.youtubeUrl,
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
        return res.status(200).json(orop);
    } catch (error) {
        return res.status(400).json(`Impossible to upsert OROP. ${error}`);
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
                $set: { 'discordOrop.ratings.$.rating': rating },
                $addToSet: { title: body.title?.toLowerCase() },
            },
            { new: true }
        );
        // Try to insert new rating if existing Orop
        if (!orop) {
            const newRatingOrop = await Orop.findOneAndUpdate(
                { title },
                {
                    $push: { 'discordOrop.ratings': { userId, rating } },
                },
                { new: true }
            );
            // return 404 if no orop found
            if (!newRatingOrop) {
                console.log(
                    '[upsertDiscordOrop] No OROP found, inserting new one',
                    title
                );
                const newDiscordOrop = await Orop.create({
                    title,
                    fpOrop: {},
                    discordOrop: { ratings: [{ userId, rating }] },
                    searchCount: 1,
                });
                return res.status(200).json({
                    orop: newDiscordOrop,
                    updated: false,
                    created: true,
                });
            }
            console.log('[upsertDiscordOrop] New Rating Success', {
                orop: newRatingOrop,
                updated: false,
            });
            return res
                .status(200)
                .json({ orop: newRatingOrop, updated: false });
        }
        console.log('[upsertDiscordOrop] Rating modified', {
            orop,
            updated: true,
        });
        return res.status(200).json({ orop, updated: true });
    } catch (error) {
        return res.status(500).json(error.message);
    }
};
