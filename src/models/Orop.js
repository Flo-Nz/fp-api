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
        bggId: { type: Number },
        coverUrl: { type: String },
        thumbnailUrl: { type: String },
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

OropSchema.pre('save', function () {
    // Set lastEditedAt only for new/modified ratings
    if (this.fpOrop?.rating && this.isModified('fpOrop.rating')) {
        this.fpOrop.lastEditedAt = new Date();
    }
    if (this.isModified('discordOrop.ratings') && this.discordOrop?.ratings?.length > 0) {
        const lastRating = this.discordOrop.ratings[this.discordOrop.ratings.length - 1];
        if (!lastRating.lastEditedAt) {
            lastRating.lastEditedAt = new Date();
        }
    }

    // Recalculate discordRating
    if (this.discordOrop && this.discordOrop.ratings) {
        this.discordRating =
            round(meanBy(this.discordOrop.ratings, 'rating')) || null;
    }
    // Normalize titles to lowercase
    if (this.title) {
        this.title = this.title.map((t) =>
            typeof t === 'string' ? t.toLowerCase() : t
        );
    }
});

OropSchema.pre('findOneAndUpdate', function () {
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
});

// Indexes for common queries
OropSchema.index({ title: 1 });
OropSchema.index({ 'discordOrop.ratings.userId': 1 });
OropSchema.index({ searchCount: -1 });
OropSchema.index({ lastOneDayOneGame: 1 });
OropSchema.index({ status: 1 });

export const Orop = mongoose.model('Orop', OropSchema);
