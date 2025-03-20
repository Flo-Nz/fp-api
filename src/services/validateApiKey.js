import { intersection } from 'lodash-es';
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
        console.log(
            `Authentication success from ${account.username} - ${account.type}`
        );
        res.locals.userId =
            account.type === 'discord'
                ? account.discord?.id
                : account.google?.id;
        if (account.type === 'service') {
            if (req.body?.userId) {
                res.locals.userId = req.body.userId;
            }
            if (req.query?.userId) {
                res.locals.userId = req.query.userId;
            }
        }
        next();
    } catch (error) {
        console.warn('Authentication failed', error);
        return res
            .status(500)
            .json('Something went wrong, please try again later.');
    }
};

export const validateServiceApiKey = async (req, res, next) => {
    try {
        const { apikey } = req.headers;

        const authorizedApiKeys = await Account.find(
            { type: 'service' },
            { apikey: 1 }
        );

        const isAuthorizedApiKey = authorizedApiKeys.find(
            (account) => account.apikey === apikey
        );

        if (!isAuthorizedApiKey) {
            console.warn(
                `Unauthorized try to use service endpoint with apiKey : ${apikey}`
            );
            return res
                .status(403)
                .json('You are not authorized to use this endpoint');
        }
        next();
    } catch (error) {
        return res.status(500).json(error.message);
    }
};

export const validateScribeAccount = async (req, res, next) => {
    try {
        const authorizedDiscordRoles =
            process.env.AUTHORIZED_SCRIBES.split(',');

        const { apikey } = req.headers;
        const account = await Account.findOne({ apikey });

        res.locals.userId = account.discord?.id;
        const commonRoles = intersection(
            authorizedDiscordRoles,
            account?.discord?.roles
        );
        if (commonRoles.length === 0) {
            return res.status(403).json('Unauthorized account.');
        }
        next();
    } catch (error) {
        console.log('[ValidateScribeAccount] error :', error.message);
    }
};
