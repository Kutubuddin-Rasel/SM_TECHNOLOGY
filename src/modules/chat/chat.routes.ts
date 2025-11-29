import { Router } from 'express';
import * as chatController from './chat.controller';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/', authenticate, chatController.chat);

export default router;
