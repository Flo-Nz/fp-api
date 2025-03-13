import { Router } from 'express';
import {
    askForOrop,
    getAllOrop,
    getAllUserRatings,
    getOneDayOneGame,
    getOneOrop,
    getTopAskedOrop,
    getTopRatedOrop,
    getTopSearchedOrop,
    removeUserRating,
    searchOrop,
    upsertDiscordOrop,
    upsertFpOrop,
    upsertFpOropRating,
} from './controllers/oropController.js';
import {
    validateApiKey,
    validateServiceApiKey,
} from './services/validateApiKey.js';
import {
    getDiscordAccount,
    getGoogleAccount,
    getUserInformations,
} from './controllers/authController.js';

const router = Router();

router.get('/', (req, res) => {
    res.json('Hello World you biatch !');
});

router.get('/orop', validateApiKey, getOneOrop);
router.get('/orop/search', validateApiKey, searchOrop);
router.get('/orop/all', validateApiKey, getAllOrop);
router.get('/orop/top/searched', validateApiKey, getTopSearchedOrop);
router.get('/orop/top/rated', validateApiKey, getTopRatedOrop);
router.get('/orop/top/asked', validateApiKey, getTopAskedOrop);
router.post('/orop/ask', validateApiKey, askForOrop);
router.post('/fporop', validateApiKey, upsertFpOrop);
router.post('/fporop/rating', validateApiKey, upsertFpOropRating);
router.post('/discordorop', validateApiKey, upsertDiscordOrop);
router.put('/discordorop/ratings/remove', validateApiKey, removeUserRating);
router.get('/discordorop/ratings', validateApiKey, getAllUserRatings);
router.get('/discord/login', getDiscordAccount);
router.get('/user/infos', getUserInformations);
router.get('/one-day-one-game', validateServiceApiKey, getOneDayOneGame);
router.post('/google/login', getGoogleAccount);

export default router;
