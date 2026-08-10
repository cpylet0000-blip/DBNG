import express from 'express';
import { loginAuth } from '../lib/auth/adminAuth.js';

const router = express.Router();

// Admin login route
router.post('/login_admin', loginAuth);

export default router;
