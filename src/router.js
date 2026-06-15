import { Router } from 'express';
import {
    validateApiKey,
    validateScribeAccount,
    validateServiceApiKey,
} from './services/validateApiKey.js';
import {
    getDiscordAccount,
    getGoogleAccount,
    getUserInformations,
    verifyJwt,
} from './controllers/authController.js';
import {
    addBoardgame,
    deleteBoardgame,
    getPendingBoardgameList,
    updateBoardgame,
    validateBoardgame,
    getOneBoardgame,
} from './controllers/boardgameController.js';
import { findYoutubeOrop } from './controllers/youtubeController.js';
import { getBggCover } from './controllers/bggController.js';
import {
    askForOrop,
    getAllUserRatings,
    getLatestReviews,
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
    removeReview,
    postUnifiedRating,
} from './controllers/oropController.js';

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
router.get('/orop/reviews/latest', validateApiKey, getLatestReviews);

// Interact with boardgames / orops
router.post('/orop/ask', validateApiKey, askForOrop);
router.post('/boardgame', validateApiKey, addBoardgame);
router.get(
    '/boardgame/pending',
    validateScribeAccount,
    getPendingBoardgameList
);
router.get('/boardgame/:id/validate', validateScribeAccount, validateBoardgame);
router.get('/boardgame/:id/youtube', validateApiKey, findYoutubeOrop);
router.get('/boardgame/:id/cover', validateApiKey, getBggCover);
router.get('/boardgame/:id', validateApiKey, getOneBoardgame);
router.put('/boardgame/:id', validateScribeAccount, updateBoardgame);
router.delete('/boardgame/:id', validateScribeAccount, deleteBoardgame);

// Ratings
// Yoel
router.post('/fporop', validateApiKey, upsertFpOrop);
router.post('/fporop/rating', validateApiKey, upsertFpOropRating);
// users
router.post('/discordorop', validateApiKey, upsertDiscordOrop);
router.put('/discordorop/ratings/remove', validateApiKey, removeUserRating);
router.put('/discordorop/reviews/remove', validateScribeAccount, removeReview);
router.get('/discordorop/ratings', validateApiKey, getAllUserRatings);

// Endpoint only use by Discord Bot
router.get('/one-day-one-game', validateServiceApiKey, getOneDayOneGame);

// Auth
router.get('/discord/login', getDiscordAccount);
router.post('/google/login', getGoogleAccount);
router.get('/user/infos', getUserInformations);
router.post('/auth/verify-jwt', verifyJwt);

// Unified rating endpoint (frontend uses this instead of choosing between fporop/discordorop)
router.post('/rating', validateApiKey, postUnifiedRating);

export default router;
