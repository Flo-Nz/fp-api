import { Router } from 'express';
import {
    getAllOrop,
    getOneOrop,
    upsertDiscordOrop,
    upsertFpOrop,
} from './controllers/oropController.js';
import { validateApiKey } from './services/validateApiKey.js';

const router = Router();

router.get('/', (req, res) => {
    res.json('Hello World you biatch !');
});

router.get('/orop', validateApiKey, getOneOrop);
router.get('/orop/all', validateApiKey, getAllOrop);
router.post('/fporop', validateApiKey, upsertFpOrop);
router.post('/discordorop', validateApiKey, upsertDiscordOrop);

export default router;
