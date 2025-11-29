import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as chatService from './chat.service';

export const chat = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id || 'guest';
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const reply = await chatService.getChatResponse(userId, message);
        res.json({ reply });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
