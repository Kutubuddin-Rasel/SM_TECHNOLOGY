import fetch from 'node-fetch';
import { getRedisClient } from '../../config/redis';
import config from '../../config';

const memoryCache = new Map<string, Array<{ role: string; content: string }>>();

const getChatHistory = async (userId: string): Promise<Array<{ role: string; content: string }>> => {
    const redis = getRedisClient();

    if (redis) {
        try {
            const key = `chat:history:${userId}`;
            const data = await redis.get(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Redis get error, using memory fallback:', error);
        }
    }

    return memoryCache.get(userId) || [];
};

const saveChatHistory = async (userId: string, history: Array<{ role: string; content: string }>) => {
    const redis = getRedisClient();

    if (redis) {
        try {
            const key = `chat:history:${userId}`;
            await redis.setEx(key, config.chat.historyTTL, JSON.stringify(history));
            return;
        } catch (error) {
            console.error('Redis set error, using memory fallback:', error);
        }
    }

    memoryCache.set(userId, history);
};

export const getChatResponse = async (userId: string, message: string) => {
    const history = await getChatHistory(userId);

    const messages = [
        {
            role: 'system',
            content: 'You are a helpful assistant for an e-commerce store. Answer questions about products concisely and helpfully.'
        },
        ...history,
        {
            role: 'user',
            content: message
        }
    ];

    try {
        const response = await fetch(config.openrouter.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.openrouter.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'SM Backend Chatbot'
            },
            body: JSON.stringify({
                model: config.openrouter.model,
                messages: messages,
                max_tokens: config.chat.maxTokens
            })
        });

        const result = (await response.json()) as any;

        if (result.error) {
            console.error("OpenRouter Error:", result.error);
            return "I'm having trouble thinking right now. Please try again later.";
        }

        const reply = result.choices?.[0]?.message?.content || "I'm not sure how to answer that.";

        history.push({ role: 'user', content: message });
        history.push({ role: 'assistant', content: reply });

        if (history.length > 6) {
            history.splice(0, history.length - 6);
        }

        await saveChatHistory(userId, history);

        return reply;
    } catch (error) {
        console.error('AI Service Error:', error);
        return "Sorry, I am currently unavailable.";
    }
}

