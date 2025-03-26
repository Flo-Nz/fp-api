import { Orop } from '../models/Orop.js';

export const updateBoardgame = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;
        if (!id) {
            return res.status(400).json('No ID provided in path');
        }

        const sanitizedBody = { ...body };

        if (body.title && Array.isArray(body.title)) {
            const loweredTitles = body.title.map((title) =>
                title.toLowerCase()
            );
            sanitizedBody.title = loweredTitles;
        }

        const updatedGame = await Orop.findOneAndUpdate(
            { _id: id },
            { $set: { ...sanitizedBody, lastUpdatedBy: res.locals.userId } },
            { new: true }
        );

        console.log(
            '[updateBoardgame] updated game : ',
            updatedGame.title?.[0]
        );

        if (!updatedGame) {
            return res.status(404).json('Game not found');
        }

        return res.status(200).json(updatedGame);
    } catch (error) {
        console.log('[updateBoardgame] Error:', error);
        res.status(500).json('Internal server error');
    }
};

export const deleteBoardgame = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Orop.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json('Boardgame not found');
        }
        console.log(`[DELETE BOARDGAME] ${id} / ${result.title[0]} deleted`);
        res.status(204).json('Successful deletion.');
    } catch (error) {
        console.log('[deleteBoardgame] error', error);
        res.status(500).json(error.message);
    }
};

export const addBoardgame = async (req, res) => {
    try {
        const { body } = req;
        if (!body.title || !Array.isArray(body.title)) {
            return res.status(400).json('No valid title provided.');
        }

        // Convert each string in the title array to lowercase
        const loweredTitles = body.title.map((title) => title.toLowerCase());

        // Check if already exists
        for (const title of loweredTitles) {
            const existingOrop = await Orop.find({ title });
            if (existingOrop.length > 0) {
                return res
                    .status(409)
                    .json(`Boardgame ${title} already exists.`);
            }
        }

        const newBoardgame = await Orop.create({
            ...body,
            title: loweredTitles,
            searchCount: 1,
            status: 'pending',
        });
        return res.status(200).json(newBoardgame);
    } catch (error) {
        console.log('[addBoardgame] Error : ', error);
        res.status(500).json(error.message);
    }
};
