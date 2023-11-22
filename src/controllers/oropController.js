import { isEmpty, omit } from 'lodash-es';
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
            console.warn('No query param in request for FP OROP');
            return res.status(400).json('Missing query param');
        }
        const { title } = query;
        const orop = await Orop.findOne({ title });
        if (orop) {
            console.log('GET ONE OROP : found ', orop.fpOrop);
            return res.status(200).json(orop.fpOrop);
        }
        console.warn('No Orop found with query', query);
        return res.status(404).json(`No OROP found with query ${query.title}`);
    } catch (error) {
        console.warn('OROP Not found', error);
        return res.status(404).json(`No OROP found ${error}`);
    }
};

export const upsertFpOrop = async (req, res) => {
    try {
        const { body } = req;
        // omit the title from the body as we want to apply "$addToSet" to enforce uniqueness
        const bodyWithoutTitle = omit(body, 'title');
        if (!body.title || !isValidFpOrop(body.fpOrop)) {
            console.warn('Bad Request', {
                title: body.title,
                fpOrop: body.fpOrop,
            });
            return res
                .status(400)
                .json(
                    `Missing required field (title, fpOrop youtubeUrl,thumbnail,publishedDate,videoTitle)`
                );
        }

        const orop = await Orop.findOneAndUpdate(
            {
                'fpOrop.youtubeUrl': body.fpOrop?.youtubeUrl,
            },
            {
                ...bodyWithoutTitle,
                $addToSet: { title: body.title?.toLowerCase() },
                $inc: { searchCount: 1 },
            },
            { new: true, upsert: true }
        );
        console.log('UPSERT SUCESS : ', orop.title);
        return res.status(200).json(orop);
    } catch (error) {
        return res.status(400).json(`Impossible to upsert OROP. ${error}`);
    }
};
