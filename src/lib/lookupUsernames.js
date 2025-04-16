import { Orop } from '../models/Orop.js';
import { Account } from '../models/Account.js';

export const lookupOropWithUsernames = async (query, options = {}) => {
    const { limit, skip, sort } = options;

    // First get the orops
    const orops = await Orop.find(query).sort(sort).skip(skip).limit(limit);

    // Get unique userIds from all ratings
    const userIds = [
        ...new Set(
            orops.flatMap(
                (orop) => orop.discordOrop?.ratings?.map((r) => r.userId) || []
            )
        ),
    ];

    // Fetch all needed users in one query
    const users = await Account.find(
        { userId: { $in: userIds } },
        { userId: 1, username: 1, avatar: 1 }
    );

    // Create a fast lookup map
    const userMap = new Map(
        users.map((user) => [
            user.userId,
            {
                username: user.username,
                avatar: user.avatar,
            },
        ])
    );

    // Map the results
    const oropsWithUserDetails = orops.map((orop) => {
        const oropObj = orop.toObject({ virtuals: true });
        if (oropObj.discordOrop?.ratings) {
            oropObj.discordOrop.ratings = oropObj.discordOrop.ratings.map(
                (rating) => ({
                    rating: rating.rating,
                    userId: rating.userId,
                    review: rating.review,
                    lastEditedAt: rating.lastEditedAt,
                    username: userMap.get(rating.userId)?.username || null,
                    avatar: userMap.get(rating.userId)?.avatar || null,
                })
            );
        }
        return oropObj;
    });

    return oropsWithUserDetails;
};

export const addUsernamesToAggregation = (pipeline = []) => {
    return [
        ...pipeline,
        {
            $lookup: {
                from: 'accounts',
                localField: 'discordOrop.ratings.userId',
                foreignField: 'userId',
                as: 'userDetails',
            },
        },
        {
            $addFields: {
                'discordOrop.ratings': {
                    $map: {
                        input: '$discordOrop.ratings',
                        as: 'rating',
                        in: {
                            rating: '$$rating.rating',
                            userId: '$$rating.userId',
                            review: '$$rating.review',
                            lastEditedAt: '$$rating.lastEditedAt',
                            username: {
                                $let: {
                                    vars: {
                                        user: {
                                            $first: {
                                                $filter: {
                                                    input: '$userDetails',
                                                    cond: {
                                                        $eq: [
                                                            '$$this.userId',
                                                            '$$rating.userId',
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    in: '$$user.username',
                                },
                            },
                            avatar: {
                                $let: {
                                    vars: {
                                        user: {
                                            $first: {
                                                $filter: {
                                                    input: '$userDetails',
                                                    cond: {
                                                        $eq: [
                                                            '$$this.userId',
                                                            '$$rating.userId',
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    in: '$$user.avatar',
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            $project: { userDetails: 0 },
        },
    ];
};
