import express from 'express';
import { generateAndSendOTP, verifyOTPAndResetPassword, verifyOTP } from '../service/passwordResetService.js';

const router = express.Router();

// POST /password-reset/request - Request OTP for password reset
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format' 
      });
    }

    const result = await generateAndSendOTP(email);
    
    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    
    // Don't reveal if email exists or not for security
    if (error.message === 'Admin user not found') {
      return res.json({
        success: true,
        message: 'If an account with this email exists, an OTP has been sent'
      });
    }

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process password reset request' 
    });
  }
});

// POST /password-reset/verify - Verify OTP
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and OTP are required' 
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP must be 6 digits' 
      });
    }

    const result = await verifyOTP(email, otp);
    
    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || 'Failed to verify OTP' 
    });
  }
});

// POST /password-reset/reset - Reset password with OTP
router.post('/reset', async (req, res) => {
  try {
    const { email, otp, newPassword, currentPassword } = req.body;

    if (!email || !otp || !newPassword || !currentPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, OTP, new password, and current password are required' 
      });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters long' 
      });
    }

    if (otp.length !== 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'OTP must be 6 digits' 
      });
    }

    const result = await verifyOTPAndResetPassword(email, otp, newPassword, currentPassword);
    
    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    // Log full error for debugging
    console.error('Password reset error:', error);
    // Return detailed error if available
    if (error instanceof Error && error.message) {
      res.status(400).json({ 
        success: false, 
        error: error.message
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Failed to reset password (unknown error)'
      });
    }
  }
});

export default router;
