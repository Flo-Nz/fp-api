import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
    username: { type: String },
    apikey: { type: String },
    type: { type: String },
    password: { type: String },
    discord: {
        id: { type: String },
        roles: { type: Array },
        access_token: { type: String },
        refresh_token: { type: String },
        expires_at: { type: Date },
    },
    google: {
        id: { type: String },
        access_token: { type: String },
        refresh_token: { type: String },
        expires_at: { type: Date },
    },
});

export const Account = mongoose.model('Account', AccountSchema);
