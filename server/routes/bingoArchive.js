import express from 'express';
import { 
  getArchivedSession, 
  getArchivedSessionsByStake, 
  getArchivedSessionsByUser, 
  getArchiveStatistics,
  cleanupOldArchivedSessions 
} from '../service/bingoArchiveService.js';

const router = express.Router();

// Get archived session by original session ID
router.get('/session/:originalId', async (req, res) => {
  try {
    const { originalId } = req.params;
    const session = await getArchivedSession(parseInt(originalId));
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Archived session not found' 
      });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching archived session:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch archived session' 
    });
  }
});

// Get archived sessions by stake level
router.get('/stake/:stake', async (req, res) => {
  try {
    const { stake } = req.params;
    const { limit = 50 } = req.query;
    
    const sessions = await getArchivedSessionsByStake(parseInt(stake), parseInt(limit));
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error fetching archived sessions by stake:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch archived sessions' 
    });
  }
});

// Get archived sessions for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const sessions = await getArchivedSessionsByUser(parseInt(userId), parseInt(limit));
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error fetching user archived sessions:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch user archived sessions' 
    });
  }
});

// Get archive statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getArchiveStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching archive statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch archive statistics' 
    });
  }
});

// Clean up old archived sessions (admin only)
router.post('/cleanup', async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    
    const result = await cleanupOldArchivedSessions(parseInt(daysOld));
    
    res.json({
      success: true,
      message: `Cleaned up ${result.count} old archived sessions`,
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Error cleaning up archived sessions:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to cleanup archived sessions' 
    });
  }
});

export default router;
