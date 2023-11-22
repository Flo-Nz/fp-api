import { Account } from '../models/Account.js';

export const validateApiKey = async (req, res, next) => {
    try {
        const { apikey } = req.headers;

        const account = await Account.findOne({ apikey });
        if (!account) {
            console.warn('Authentication failed', {
                headers: req.headers,
                body: req.body,
            });
            return res.status(401).json('Authentication failed');
        }
        console.log(`Authentication success from ${account.username}`);
        next();
    } catch (error) {
        console.warn('Authentication failed', error);
        return res
            .status(500)
            .json('Something went wrong, please try again later.');
    }
};
