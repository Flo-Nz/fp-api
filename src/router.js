import { Router } from 'express';
import {
    askForOrop,
    getAllUserRatings,
    getOneDayOneGame,
    getOneOrop,
    getPaginatedOrop,
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
    validateScribeAccount,
    validateServiceApiKey,
} from './services/validateApiKey.js';
import {
    getDiscordAccount,
    getGoogleAccount,
    getUserInformations,
} from './controllers/authController.js';
import { updateBoardgame } from './controllers/boardgameController.js';

const router = Router();

router.get('/', (req, res) => {
    res.json('Hello World you biatch !');
});

// Get lists of orops
router.get('/orop', validateApiKey, getOneOrop);
router.get('/orop/search', validateApiKey, searchOrop);
router.get('/orop/all', validateApiKey, getPaginatedOrop);
router.get('/orop/top/searched', validateApiKey, getTopSearchedOrop);
router.get('/orop/top/rated', validateApiKey, getTopRatedOrop);
router.get('/orop/top/asked', validateApiKey, getTopAskedOrop);

// Interact with boardgames / orops
router.post('/orop/ask', validateApiKey, askForOrop);
router.put('/boardgame/:id', validateScribeAccount, updateBoardgame);

// Ratings
// Yoel
router.post('/fporop', validateApiKey, upsertFpOrop);
router.post('/fporop/rating', validateApiKey, upsertFpOropRating);
// users
router.post('/discordorop', validateApiKey, upsertDiscordOrop);
router.put('/discordorop/ratings/remove', validateApiKey, removeUserRating);
router.get('/discordorop/ratings', validateApiKey, getAllUserRatings);

// Endpoint only use by Discord Bot
router.get('/one-day-one-game', validateServiceApiKey, getOneDayOneGame);

// Auth
router.get('/discord/login', getDiscordAccount);
router.post('/google/login', getGoogleAccount);
router.get('/user/infos', getUserInformations);

export default router;
