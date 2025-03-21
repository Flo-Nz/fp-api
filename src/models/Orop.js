import { meanBy, round } from 'lodash-es';
import mongoose from 'mongoose';

const FpOropSchema = new mongoose.Schema(
    {
        youtubeUrl: { type: String },
        publishedDate: { type: String },
        rating: { type: Number },
        videoTitle: { type: String },
        thumbnail: { type: String },
    },
    { _id: false }
);

const DiscordOropSchema = new mongoose.Schema(
    {
        ratings: [{ rating: Number, userId: String }],
    },
    { _id: false }
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
        },
        toJSON: {
            virtuals: true,
        },
        timestamps: true,
    }
);

OropSchema.pre('save', function (next) {
    if (this.discordOrop && this.discordOrop.ratings) {
        this.discordRating =
            round(meanBy(this.discordOrop.ratings, 'rating')) || null;
    }
    next();
});

OropSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.discordOrop && update.discordOrop.ratings) {
        update.discordRating =
            round(meanBy(update.discordOrop.ratings, 'rating')) || null;
    }
    next();
});

export const Orop = mongoose.model('Orop', OropSchema);
