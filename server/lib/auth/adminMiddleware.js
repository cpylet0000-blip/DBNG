import jwt from 'jsonwebtoken';

export function adminAuthMiddleware(req, res, next) {
  // Check for admin_token cookie first (for browser requests)
  let token = req.cookies?.admin_token;
  
  // If no cookie, check Authorization header (for API requests)
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
}
