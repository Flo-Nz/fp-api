import { Orop } from '../models/Orop.js';

export const updateBoardgame = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;
        if (!id) {
            return res.status(400).json('No ID provided in path');
        }
        const updatedGame = await Orop.findOneAndUpdate(
            {
                _id: id,
            },
            { $set: { ...body, lastUpdatedBy: res.locals.userId } },
            { new: true }
        );
        console.log('updated game', updatedGame);
        if (!updatedGame) {
            return res.status(404).json('Game not found');
        }
        return res.status(200).json(updatedGame);
    } catch (error) {
        console.log('[updateBoardgame] error : ', error);
        res.status(500).json('Something went wrong');
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
