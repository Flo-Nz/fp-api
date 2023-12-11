import { Router } from 'express';
import {
    getAllOrop,
    getAllUserRatings,
    getOneOrop,
    getTopRatedOrop,
    getTopSearchedOrop,
    upsertDiscordOrop,
    upsertFpOrop,
    upsertFpOropRating,
} from './controllers/oropController.js';
import { validateApiKey } from './services/validateApiKey.js';

const router = Router();

router.get('/', (req, res) => {
    res.json('Hello World you biatch !');
});

router.get('/orop', validateApiKey, getOneOrop);
router.get('/orop/all', validateApiKey, getAllOrop);
router.get('/orop/top/searched', validateApiKey, getTopSearchedOrop);
router.get('/orop/top/rated', validateApiKey, getTopRatedOrop);
router.post('/fporop', validateApiKey, upsertFpOrop);
router.post('/fporop/rating', validateApiKey, upsertFpOropRating);
router.post('/discordorop', validateApiKey, upsertDiscordOrop);
router.get('/discordorop/ratings', validateApiKey, getAllUserRatings);

export default router;
