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

const OropSchema = new mongoose.Schema({
    title: [{ type: String, required: true }],
    fpOrop: {
        type: FpOropSchema,
        description: "FirstPlayer's orop and rating",
    },
    discordOrop: {
        type: DiscordOropSchema,
        description: 'Discord community rating',
    },
    searchCount: { type: Number, default: 0 },
});

export const Orop = mongoose.model('Orop', OropSchema);
