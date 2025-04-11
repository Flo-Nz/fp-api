import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // Root level unique ID
    username: { type: String },
    apikey: { type: String },
    type: { type: String },
    password: { type: String },
    avatar: { type: String },
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

// Pre-save middleware to ensure userId is set from provider ID
AccountSchema.pre('save', function (next) {
    if (!this.userId) {
        this.userId =
            this.type === 'discord' ? this.discord?.id : this.google?.id;
    }
    next();
});

export const Account = mongoose.model('Account', AccountSchema);
