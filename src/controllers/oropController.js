import { get, keys, map, omit } from 'lodash-es';
import { Orop } from '../models/Orop.js';
import { Account } from '../models/Account.js';
import { isValidFpOrop } from '../services/validateOrop.js';
import { sortOropByTitle } from '../lib/sort.js';
import { escapeRegex } from '../lib/escapeRegex.js';
import {
    addUsernamesToAggregation,
} from '../lib/lookupUsernames.js';

export const getPaginatedOrop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit =
            (parseInt(req.query.limit) > 24 ? 24 : parseInt(req.query.limit)) ||
            24;
        const oropOnly = req.query.oropOnly === 'true';
        const skip = (page - 1) * limit;

        // Rating filters
        const fpRating = parseInt(req.query.fpRating) || null;
        const discordRating = parseInt(req.query.discordRating) || null;

        // Build match conditions
        const matchConditions = [];

        if (oropOnly) {
            matchConditions.push({
                'fpOrop.youtubeUrl': { $exists: true, $ne: '' },
            });
        }

        if (fpRating && fpRating >= 1 && fpRating <= 5) {
            matchConditions.push({ 'fpOrop.rating': fpRating });
        }

        const basePipeline = [
            ...(matchConditions.length > 0
                ? [{ $match: { $and: matchConditions } }]
                : []),
            {
                $addFields: {
                    firstTitleElement: { $arrayElemAt: ['$title', 0] },
                    computedDiscordRating: {
                        $cond: {
                            if: {
                                $and: [
                                    { $isArray: '$discordOrop.ratings' },
                                    {
                                        $gt: [
                                            { $size: '$discordOrop.ratings' },
                                            0,
                                        ],
                                    },
                                ],
                            },
                            then: {
                                $round: [
                                    { $avg: '$discordOrop.ratings.rating' },
                                ],
                            },
                            else: null,
                        },
                    },
                },
            },
            ...(discordRating && discordRating >= 1 && discordRating <= 5
                ? [{ $match: { computedDiscordRating: discordRating } }]
                : []),
            {
                $addFields: {
                    firstTitleElementLower: { $toLower: '$firstTitleElement' },
                },
            },
            { $sort: { firstTitleElementLower: 1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { computedDiscordRating: 0 } },
        ];

        const allOrop = await Orop.aggregate(
            addUsernamesToAggregation(basePipeline)
        );

        // Count with same filters (without skip/limit)
        const countPipeline = [
            ...(matchConditions.length > 0
                ? [{ $match: { $and: matchConditions } }]
                : []),
            ...(discordRating && discordRating >= 1 && discordRating <= 5
                ? [
                      {
                          $addFields: {
                              computedDiscordRating: {
                                  $cond: {
                                      if: {
                                          $and: [
                                              {
                                                  $isArray:
                                                      '$discordOrop.ratings',
                                              },
                                              {
                                                  $gt: [
                                                      {
                                                          $size: '$discordOrop.ratings',
                                                      },
                                                      0,
                                                  ],
                                              },
                                          ],
                                      },
                                      then: {
                                          $round: [
                                              {
                                                  $avg: '$discordOrop.ratings.rating',
                                              },
                                          ],
                                      },
                                      else: null,
                                  },
                              },
                          },
                      },
                      { $match: { computedDiscordRating: discordRating } },
                  ]
                : []),
            { $count: 'total' },
        ];

        const countResult = await Orop.aggregate(countPipeline);
        const totalDocuments = countResult[0]?.total || 0;

        return res.status(200).json({
            data: allOrop,
            currentPage: page,
            totalPages: Math.ceil(totalDocuments / limit),
            totalDocuments: totalDocuments,
        });
    } catch (error) {
        return res.status(500).json({
            message: `There was a problem during the query. Please try again later`,
        });
    }
};
export const searchOrop = async (req, res) => {
    try {
        const { title, oropOnly } = req.query;
        if (!title) {
            return res.status(400).json('You did not provide a title query parameter');
        }

        // Use Atlas Search autocomplete for fuzzy/partial matching
        const searchStage = {
            $search: {
                index: 'title_search',
                autocomplete: {
                    query: title,
                    path: 'title',
                    fuzzy: {
                        maxEdits: 1,
                        prefixLength: 2,
                    },
                },
            },
        };

        const pipeline = [
            searchStage,
            ...(oropOnly === 'true'
                ? [
                      {
                          $match: {
                              'fpOrop.youtubeUrl': { $exists: true, $ne: '' },
                          },
                      },
                  ]
                : []),
            { $limit: 24 },
        ];

        const orops = await Orop.aggregate(
            addUsernamesToAggregation(pipeline)
        );

        res.status(200).json(orops);
    } catch (error) {
        console.log('[searchOrop] Atlas Search error, falling back to regex:', error.message);
        // Fallback to regex search if Atlas Search fails
        try {
            const { title, oropOnly } = req.query;
            const filter = {
                title: { $regex: escapeRegex(title), $options: 'i' },
            };
            if (oropOnly === 'true') {
                filter['fpOrop.youtubeUrl'] = { $exists: true, $ne: '' };
            }
            const orops = await Orop.aggregate(
                addUsernamesToAggregation([{ $match: filter }, { $limit: 24 }])
            );
            const sortedOrops = sortOropByTitle(orops);
            return res.status(200).json(sortedOrops);
        } catch (fallbackError) {
            return res.status(500).json('Something went wrong');
        }
    }
};

export const getTopSearchedOrop = async (req, res) => {
    try {
        const { limit, withVideo } = req.query;
        const query =
            withVideo === 'true'
                ? { 'fpOrop.youtubeUrl': { $exists: true } }
                : {};
        const topSearchedOrop = await Orop.aggregate([
            { $match: query },
            {
                $sort: { searchCount: -1 },
            },
            {
                $limit: limit && limit <= 30 ? limit : 10,
            },
            ...addUsernamesToAggregation([]),
        ]);
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
        const { limit, onlyFP, sliceStart, sliceEnd } = req.query;

        if (onlyFP === 'true') {
            const topFpRatedOrop = await Orop.aggregate(
                addUsernamesToAggregation([
                    { $match: { 'fpOrop.rating': { $exists: true } } },
                    { $sort: { 'fpOrop.rating': -1 } },
                    { $limit: limit && limit <= 30 ? limit : 10 },
                ])
            );
            console.log('[getTopRatedOrop] returning FP TOP');
            return res.status(200).json(topFpRatedOrop);
        }

        const topRatedOrop = await Orop.aggregate(
            addUsernamesToAggregation([
                { $match: { 'discordOrop.ratings.1': { $exists: true } } },
                {
                    $addFields: {
                        ratingsCount: { $size: '$discordOrop.ratings' },
                        computedDiscordRating: {
                            $round: [{ $avg: '$discordOrop.ratings.rating' }],
                        },
                    },
                },
                { $sort: { computedDiscordRating: -1, ratingsCount: -1 } },
                { $skip: parseInt(sliceStart) || 0 },
                { $limit: parseInt(sliceEnd) || 12 },
                { $project: { ratingsCount: 0, computedDiscordRating: 0 } },
            ])
        );

        console.log('[getTopRateOrop] returning DISCORD TOP');
        return res.status(200).json(topRatedOrop);
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
            return res.status(400).json({ error: 'Missing query param' });
        }
        const { title, skipSearchInc } = query;

        const orop = await Orop.findOneAndUpdate(
            { title: { $elemMatch: { $eq: title } } },
            { $inc: { searchCount: skipSearchInc === 'true' ? 0 : 1 } },
            { returnDocument: 'after' }
        );

        if (!orop) {
            console.warn('[getOneOrop] No Orop found with query', query);
            return res.status(404).json({ error: `No OROP found with query ${query.title}` });
        }

        return res.status(200).json(orop);
    } catch (error) {
        console.warn('[getOneOrop] OROP Not found', error);
        return res.status(500).json({ error: error.message });
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
                title: { $elemMatch: { $eq: body.title } },
            },
            {
                $set: {
                    ...fpOropMongoSet,
                },
                $addToSet: { title: body.title },
                $inc: { searchCount: 1 },
            },
            { returnDocument: 'after', upsert: true }
        );
        console.log('[upsertFpOrop] Success: ', orop.title);
        return res.status(200).json(orop);
    } catch (error) {
        return res.status(400).json(`Impossible to upsert OROP. ${error}`);
    }
};

export const upsertFpOropRating = async (req, res) => {
    try {
        const { body } = req;
        const { title, rating, review } = body;
        if (!title || !rating) {
            return res.status(400).json(`Missing title or rating`);
        }

        const updateFields = {
            'fpOrop.rating': parseInt(rating),
        };

        if (review) {
            updateFields['fpOrop.review'] = review;
        }

        const orop = await Orop.findOneAndUpdate(
            { title: { $elemMatch: { $eq: title } } },
            {
                $set: updateFields,
                $addToSet: { title: title },
            },
            { returnDocument: 'after', upsert: true }
        );
        return res.status(200).json(orop);
    } catch (error) {
        return res.status(500).json(`Something went wrong. ${error}`);
    }
};

export const upsertDiscordOrop = async (req, res) => {
    try {
        const { userId } = res.locals;
        const { body } = req;
        const { title, rating, review, skipSearchInc } = body;

        if (!title || !userId) {
            console.warn('[upsertDiscordOrop] Bad request', {
                title,
                userId,
                rating,
                review,
            });
            return res
                .status(400)
                .json('Missing required field (title, userId)');
        }

        // Require rating to be present
        if (!rating) {
            return res.status(400).json('Rating is required.');
        }

        // Build the update object dynamically and try to find an existing rating
        const updateFields = {
            'discordOrop.ratings.$[elem].rating': rating,
        };
        if (review) {
            updateFields['discordOrop.ratings.$[elem].review'] = review;
        }

        const orop = await Orop.findOneAndUpdate(
            {
                title: { $elemMatch: { $eq: title } },
                'discordOrop.ratings.userId': userId,
            },
            {
                $set: updateFields,
                $inc: { searchCount: skipSearchInc ? 0 : 1 },
            },
            {
                arrayFilters: [{ 'elem.userId': { $eq: userId } }],
                returnDocument: 'after',
            }
        );

        if (orop) {
            console.log('[upsertDiscordOrop] Rating modified', {
                orop,
                updated: true,
            });
            return res.status(200).json({ orop, updated: true });
        }

        // If no existing rating, create new rating object with required rating
        const pushFields = {
            userId,
            rating,
        };
        if (review) {
            pushFields.review = review;
        }

        const newRatingOrop = await Orop.findOneAndUpdate(
            { title: { $elemMatch: { $eq: title } } },
            {
                $push: { 'discordOrop.ratings': pushFields },
                $inc: { searchCount: 1 },
                $addToSet: { title: title },
            },
            { returnDocument: 'after' }
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
            title: [title], // Change to store as lowercase array
            fpOrop: {},
            discordOrop: { ratings: [pushFields] },
            searchCount: 1,
            status: 'pending',
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
        const { userId } = res.locals;
        const { skip, noLimit } = query;
        if (!userId) {
            console.warn('[getAllUserRatings] Bad request', { userId });
            return res
                .status(400)
                .json(`Missing required query parameter (userId)`);
        }
        console.log('[GetAllUserRatings] Getting ratings for', userId);
        console.log('[GetAllUserRatings] With params', { skip, noLimit });

        const userOrops = await Orop.aggregate(
            addUsernamesToAggregation([
                { $match: { 'discordOrop.ratings.userId': userId } },
                {
                    $addFields: {
                        firstTitleElement: { $arrayElemAt: ['$title', 0] },
                    },
                },
                {
                    $addFields: {
                        firstTitleElementLower: {
                            $toLower: '$firstTitleElement',
                        },
                    },
                },
                { $sort: { firstTitleElementLower: 1 } },
                { $skip: parseInt(skip) || 0 },
                { $limit: noLimit ? Number.MAX_SAFE_INTEGER : 12 },
            ])
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

export const removeUserRating = async (req, res) => {
    try {
        const { userId } = res.locals;
        const { title } = req.query;

        const rating = req.query.rating === 'true' ? true : false;
        const review = req.query.review === 'true' ? true : false;

        if (!title || !userId) {
            return res.status(400).json('Missing title or userId');
        }

        if (!rating && !review) {
            return res.status(400).json('No review or rating');
        }

        // Find the user's rating
        const orop = await Orop.findOne({
            title: { $elemMatch: { $eq: title } },
            'discordOrop.ratings.userId': userId,
        });

        if (!orop) {
            return res.status(404).json('Rating not found');
        }

        const userRating = orop.discordOrop.ratings.find(
            (elem) => elem.userId === userId
        );

        // Determine if we need to remove the entire rating object
        const removeEntireObject =
            (rating && review) ||
            (rating && !userRating.review) ||
            (review && !userRating.rating);

        if (removeEntireObject) {
            await Orop.updateOne(
                { title: { $elemMatch: { $eq: title } } },
                { $pull: { 'discordOrop.ratings': { userId } } }
            );
            console.log(
                `[RemoveUserRating] Removed entire rating object for ${title} and userId ${userId}`
            );
            return res.status(200).json('Rating removed successfully');
        }

        // Build the update object
        const updateFields = {};
        if (rating) {
            updateFields['discordOrop.ratings.$[elem].rating'] = '';
        }
        if (review) {
            updateFields['discordOrop.ratings.$[elem].review'] = '';
        }

        await Orop.updateOne(
            {
                title: { $elemMatch: { $eq: title } },
                'discordOrop.ratings.userId': userId,
            },
            { $unset: updateFields },
            { arrayFilters: [{ 'elem.userId': userId }] }
        );

        console.log(
            `[RemoveUserRating] Updated rating of ${title} for userId ${userId}`
        );
        return res.status(200).json('Rating updated successfully');
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

export const askForOrop = async (req, res) => {
    try {
        const { userId } = res.locals;
        const { title } = req.query;

        if (!userId || !title) {
            return res.status(400).json('Missing title or userId');
        }
        const orop = await Orop.findOneAndUpdate(
            { title: { $elemMatch: { $eq: title } } },
            {
                $addToSet: {
                    askedBy: userId,
                },
            },
            { returnDocument: 'after' }
        );
        console.log(`[AskForOrop] by ${userId} for ${title}`);
        return res.status(200).json(orop);
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

export const getTopAskedOrop = async (req, res) => {
    try {
        const topAskedOrop = await Orop.aggregate(
            addUsernamesToAggregation([
                {
                    $match: {
                        'fpOrop.youtubeUrl': { $exists: false },
                        'askedBy.0': { $exists: true },
                    },
                },
                {
                    $addFields: { askedByCount: { $size: '$askedBy' } },
                },
                { $sort: { askedByCount: -1 } },
                { $limit: 20 },
            ])
        );
        return res.status(200).json(topAskedOrop);
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

export const getOneDayOneGame = async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const docs = await Orop.aggregate([
            {
                $match: {
                    $or: [
                        { lastOneDayOneGame: { $lt: sixMonthsAgo } },
                        { lastOneDayOneGame: { $exists: false } },
                        { lastOneDayOneGame: null },
                    ],
                },
            },
            { $sample: { size: 1 } },
        ]);

        if (docs.length > 0) {
            const boardgame = docs[0];
            await Orop.findByIdAndUpdate(boardgame._id, {
                lastOneDayOneGame: new Date(),
            });

            return res.status(200).json(boardgame);
        }

        return res.status(404).json('No boardgame for today');
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

export const removeReview = async (req, res) => {
    try {
        const { title, userId } = req.query;

        if (!title || !userId) {
            return res.status(400).json('Missing title or userId');
        }

        const orop = await Orop.findOneAndUpdate(
            {
                title: { $elemMatch: { $eq: title } },
                'discordOrop.ratings.userId': userId,
            },
            {
                $unset: { 'discordOrop.ratings.$[elem].review': '' },
            },
            {
                arrayFilters: [{ 'elem.userId': userId }],
                returnDocument: 'after',
            }
        );

        if (!orop) {
            return res.status(404).json('Rating not found');
        }

        console.log(
            `[RemoveReview] Removed review from ${title} for userId ${userId}`
        );
        return res.status(200).json('Review removed successfully');
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

/**
 * Unified rating endpoint — the API decides whether this is a FP rating
 * or a Discord community rating based on the authenticated account's apikey.
 * This removes the need for the frontend to know about YOEL_API_KEY.
 */
export const postUnifiedRating = async (req, res) => {
    try {
        const { apikey } = req.headers;
        const { title, rating, review } = req.body;

        if (!title || !rating) {
            return res.status(400).json('Missing title or rating');
        }

        const account = await Account.findOne({ apikey });
        if (!account) {
            return res.status(401).json('Account not found');
        }

        const isFpAccount = account.apikey === process.env.FP_OWNER_API_KEY;

        if (isFpAccount) {
            // FirstPlayer official rating
            const updateFields = {
                'fpOrop.rating': parseInt(rating),
            };
            if (review) {
                updateFields['fpOrop.review'] = review;
            }

            const orop = await Orop.findOneAndUpdate(
                { title: { $elemMatch: { $eq: title } } },
                {
                    $set: updateFields,
                    $addToSet: { title: title },
                },
                { returnDocument: 'after', upsert: true }
            );
            return res.status(200).json(orop);
        }

        // Discord community rating
        const userId =
            account.type === 'discord'
                ? account.discord?.id
                : account.google?.id;

        // Try to update existing rating
        const updateFields = {
            'discordOrop.ratings.$[elem].rating': rating,
        };
        if (review) {
            updateFields['discordOrop.ratings.$[elem].review'] = review;
        }

        const orop = await Orop.findOneAndUpdate(
            {
                title: { $elemMatch: { $eq: title } },
                'discordOrop.ratings.userId': userId,
            },
            {
                $set: updateFields,
            },
            {
                arrayFilters: [{ 'elem.userId': { $eq: userId } }],
                returnDocument: 'after',
            }
        );

        if (orop) {
            return res.status(200).json({ orop, updated: true });
        }

        // Create new rating
        const pushFields = { userId, rating };
        if (review) {
            pushFields.review = review;
        }

        const newRatingOrop = await Orop.findOneAndUpdate(
            { title: { $elemMatch: { $eq: title } } },
            {
                $push: { 'discordOrop.ratings': pushFields },
                $addToSet: { title: title },
            },
            { returnDocument: 'after' }
        );

        if (newRatingOrop) {
            return res.status(200).json({ orop: newRatingOrop, updated: false });
        }

        // Create new OROP with rating
        const newOrop = await Orop.create({
            title: [title],
            fpOrop: {},
            discordOrop: { ratings: [pushFields] },
            searchCount: 0,
            status: 'pending',
        });

        return res.status(200).json({ orop: newOrop, updated: false, created: true });
    } catch (error) {
        console.error('[postUnifiedRating] Error:', error.message);
        return res.status(500).json(error.message);
    }
};
