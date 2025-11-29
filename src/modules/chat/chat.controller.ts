import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import * as chatService from './chat.service';

export const chat = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id || 'guest'; // Allow guests if needed, but prompt implies auth? "Chat with an AI chatbot... Endpoint: POST /chatbot"
        // Requirement 7 doesn't explicitly say auth is required for chat, but usually it is. 
        // However, "User: Which product is best?" implies a user context.
        // I will assume auth is required to track history by userId.

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
