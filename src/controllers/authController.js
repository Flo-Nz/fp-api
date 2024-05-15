import { request } from 'undici';
import jwt from 'jsonwebtoken';
import { Account } from '../models/Account.js';
import { v4 as uuid } from 'uuid';
import { addMilliseconds } from 'date-fns';

export const getDiscordAccount = async (req, res) => {
    try {
        const { code } = req.query;
        if (code) {
            const tokenResponseData = await request(
                'https://discord.com/api/oauth2/token',
                {
                    method: 'POST',
                    body: new URLSearchParams({
                        client_id: process.env.CLIENT_ID,
                        client_secret: process.env.CLIENT_SECRET,
                        code,
                        grant_type: 'authorization_code',
                        redirect_uri: 'http://localhost:3000/discord/login',
                        scope: 'identify guilds.members.read',
                    }).toString(),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
            const oauthData = await tokenResponseData.body.json();
            console.log('OAUTH DATA', oauthData);
            const userResult = await request(
                'https://discord.com/api/users/@me',
                {
                    headers: {
                        authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                    },
                }
            );
            const discordUser = await userResult.body.json();
            console.log('USER RESULT', discordUser);

            const fpMemberResult = await request(
                'https://discord.com/api/users/@me/guilds/933486333756846101/member',
                {
                    headers: {
                        authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                    },
                }
            );
            const discordMember = await fpMemberResult.body.json();
            console.log('DISCORD MEMBER', discordMember);

            let user;
            user = await Account.findOneAndUpdate(
                {
                    'discord.id': discordMember.user.id,
                },
                {
                    username: discordMember.user.username,
                    'discord.access_token': oauthData.access_token,
                    'discord.refresh_token': oauthData.refresh_token,
                    expires_at: addMilliseconds(
                        new Date(),
                        oauthData.expires_in
                    ),
                },
                { new: true }
            );
            if (!user) {
                user = await Account.create({
                    username: discordMember.user.username,
                    apikey: uuid(),
                    discord: {
                        id: discordMember.user.id,
                        roles: discordMember.roles,
                        access_token: oauthData.access_token,
                        refresh_token: oauthData.refresh_token,
                        expires_at: addMilliseconds(
                            new Date(),
                            oauthData.expires_in
                        ),
                    },
                });
            }

            console.log('EXISTING USER ID : ', user._id.toString());
            const userJwt = jwt.sign(
                {
                    id: user._id.toString(),
                    apikey: user.apikey,
                },
                process.env.JWT_SECRET
            );

            return res.redirect(`${process.env.FRONT_URL}?jwt=${userJwt}`);
        } else {
            return res.status(400).json("You didn't provide a valid code");
        }
    } catch (error) {
        return res
            .status(500)
            .json(
                `There was a problem during the query. Please try again later`
            );
    }
};

export const getUserInformations = async (req, res) => {
    const { apikey } = req.headers;
    try {
        const user = await Account.findOne({ apikey });
        if (!user) {
            return res
                .status(404)
                .json(`User with apikey ${apikey} not found.`);
        }
        console.log('user', user);
        return res.status(200).json(user);
    } catch (error) {
        return res
            .status(500)
            .json(`[getUserInformations] Something went wrong`);
    }
};
