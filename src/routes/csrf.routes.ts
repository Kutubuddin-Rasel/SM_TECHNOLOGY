import { Router } from 'express';
import { generateCsrfToken } from '../middlewares/csrf.middleware';

const router = Router();

router.get('/csrf-token', (req, res) => {
    const csrfToken = generateCsrfToken(req, res);
    res.json({ csrfToken });
});

export default router;
