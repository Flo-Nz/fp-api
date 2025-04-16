import { meanBy, round } from 'lodash-es';
import mongoose from 'mongoose';

const FpOropSchema = new mongoose.Schema(
    {
        youtubeUrl: { type: String },
        publishedDate: { type: String },
        rating: { type: Number },
        videoTitle: { type: String },
        thumbnail: { type: String },
        review: { type: String },
        lastEditedAt: { type: Date },
    },
    { _id: false }
);

const DiscordOropSchema = new mongoose.Schema(
    {
        ratings: [
            {
                rating: Number,
                userId: { type: String, ref: 'Account' },
                review: String,
                lastEditedAt: Date,
                reported: { type: Boolean, default: false },
            },
        ],
    },
    {
        _id: false,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

const OropSchema = new mongoose.Schema(
    {
        title: [{ type: String, required: true }],
        fpOrop: {
            type: FpOropSchema,
            description: "FirstPlayer's orop and rating",
        },
        discordOrop: {
            type: DiscordOropSchema,
            description: 'Discord community rating',
            default: {
                ratings: [],
            },
        },
        searchCount: { type: Number, default: 0 },
        askedBy: [{ type: String }],
        lastOneDayOneGame: { type: Date },
        lastUpdatedBy: { type: String },
        lastYoutubeScrapping: { type: Date },
        status: { type: String },
    },
    {
        virtuals: {
            discordRating: {
                get() {
                    return (
                        round(meanBy(this.discordOrop?.ratings, 'rating')) ||
                        null
                    );
                },
            },
        },
        toObject: {
            virtuals: true,
            getters: true,
        },
        toJSON: {
            virtuals: true,
            getters: true,
        },
        timestamps: true,
    }
);

OropSchema.pre('save', function (next) {
    // Set lastEditedAt for new ratings
    if (this.fpOrop?.rating) {
        this.fpOrop.lastEditedAt = new Date();
    }
    if (this.discordOrop?.ratings?.length > 0) {
        this.discordOrop.ratings = this.discordOrop.ratings.map((rating) => ({
            ...rating,
            lastEditedAt: new Date(),
        }));
    }

    // Existing logic
    if (this.discordOrop && this.discordOrop.ratings) {
        this.discordRating =
            round(meanBy(this.discordOrop.ratings, 'rating')) || null;
    }
    if (this.title) {
        this.title = this.title.map((t) =>
            typeof t === 'string' ? t.toLowerCase() : t
        );
    }
    next();
});

OropSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();

    // Set lastEditedAt when updating ratings
    if (update.$set?.['fpOrop.rating']) {
        update.$set['fpOrop.lastEditedAt'] = new Date();
    }

    if (update.$push?.['discordOrop.ratings']) {
        update.$push['discordOrop.ratings'].lastEditedAt = new Date();
    }

    if (update.$set?.['discordOrop.ratings.$[elem].rating']) {
        update.$set['discordOrop.ratings.$[elem].lastEditedAt'] = new Date();
    }

    // Existing logic
    if (update.discordOrop && update.discordOrop.ratings) {
        update.discordRating =
            round(meanBy(update.discordOrop.ratings, 'rating')) || null;
    }
    if (update.$set?.title) {
        update.$set.title = update.$set.title.map((t) =>
            typeof t === 'string' ? t.toLowerCase() : t
        );
    }
    if (update.$addToSet?.title) {
        update.$addToSet.title =
            typeof update.$addToSet.title === 'string'
                ? update.$addToSet.title.toLowerCase()
                : update.$addToSet.title;
    }
    next();
});

export const Orop = mongoose.model('Orop', OropSchema);
