import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
    username: { type: String },
    apikey: { type: String },
    type: { type: String },
    password: { type: String },
});

export const Account = mongoose.model('Account', AccountSchema);
