import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const authenticateUser = async (req, res, next) => {
  try {
    // Check for Telegram user data first (for mini app)
    if (req.tgUser) {
      const user = await prisma.user.findUnique({
        where: { telegramId: req.tgUser.id.toString() }
      });
      
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Check for Authorization header (JWT token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
      
      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateUser(req, res, async () => {
      if (!req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }
      next();
    });
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Admin authentication failed'
    });
  }
};
