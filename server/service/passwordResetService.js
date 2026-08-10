// Service for password reset OTP functionality
import prisma from '../lib/prisma.js';
import { Resend } from 'resend';

// Initialize Resend only if API key is available
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.warn('⚠️  RESEND_API_KEY not found. Email sending will be disabled. OTPs will be logged to console.');
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP email with smart message
async function sendOTPEmail(email, otp) {
  // Check if Resend is configured
  if (!resend) {
    console.warn('Resend not configured. Skipping email send. OTP:', otp);
    return true; // Return true to prevent blocking the flow during development
  }

  const htmlContent = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Admin System</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #333; margin-top: 0;">Hello Admin,</h2>
        
        <p style="color: #666; line-height: 1.6;">
          We received a request to reset your password for the admin system. 
          If you didn't make this request, please ignore this email and your password will remain unchanged.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #667eea; margin: 20px 0; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your Password Reset Code:</p>
          <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; margin: 10px 0;">
            ${otp}
          </div>
          <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">This code will expire in 1 hour</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>🔒 Security Notice:</strong> Never share this code with anyone. 
            Our support team will never ask for your password reset code.
          </p>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-top: 20px;">
          If you have any questions or concerns, please contact our support team immediately.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
          This is an automated message from the Admin System. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Admin System <noreply@yourdomain.com>',
      to: [email],
      subject: '🔐 Password Reset Request - Admin System',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`OTP email sent to ${email} via Resend:`, data);
    return true;
  } catch (error) {
    console.error('Error sending OTP email with Resend:', error);
    return false;
  }
}

// Generate and send OTP for password reset
export async function generateAndSendOTP(email) {
  try {
    // Check if admin user exists
    const adminUser = await prisma.adminUser.findUnique({
      where: { email }
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }


    // Delete any existing unused OTPs for this email to avoid unique constraint error
    await prisma.passwordResetOtp.deleteMany({
      where: {
        email,
        isUsed: false
      }
    });

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Save OTP to database
    await prisma.passwordResetOtp.create({
      data: {
        email,
        otp,
        expiresAt,
      }
    });

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent) {
      throw new Error('Failed to send OTP email');
    }

    return {
      success: true,
      message: 'OTP sent successfully to your email'
    };

  } catch (error) {
    console.error('Error generating OTP:', error);
    throw new Error(error.message || 'Failed to generate OTP');
  }
}

// Verify OTP and reset password
export async function verifyOTPAndResetPassword(email, otp, newPassword, currentPassword) {
  try {
    // Find valid OTP
    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        email,
        otp,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    // Check current password
    const adminUser = await prisma.adminUser.findUnique({ where: { email } });
    if (!adminUser) {
      throw new Error('Admin user not found');
    }
    const passwordMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!passwordMatch) {
      throw new Error('Current password is incorrect');
    }

    // Mark OTP as used
    await prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { isUsed: true }
    });

    // Hash new password and update admin password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { email },
      data: { password: hashedNewPassword }
    });

    return {
      success: true,
      message: 'Password reset successfully'
    };

  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error(error.message || 'Failed to reset password');
  }
}

// Verify OTP only (for validation before password reset)
export async function verifyOTP(email, otp) {
  try {
    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        email,
        otp,
        isUsed: false,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    return {
      success: true,
      message: 'OTP verified successfully'
    };

  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw new Error(error.message || 'Failed to verify OTP');
  }
}
