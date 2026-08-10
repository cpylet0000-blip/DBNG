import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const loginAuth = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is missing in environment');
      return res.status(500).json({ message: 'Server authentication is not configured' });
    }

    // 1️⃣ Find admin
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2️⃣ Compare password
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Token expiration based on rememberMe
    const tokenExpiresIn = rememberMe ? "30d" : "2h";
    const cookieMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 2 * 60 * 60 * 1000;     // 2 hours

    // 4️⃣ Create JWT
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      jwtSecret,
      { expiresIn: tokenExpiresIn }
    );

    // 5️⃣ Set HttpOnly cookie
    res.cookie("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: cookieMaxAge,
    });

    // 6️⃣ Send success response (also return token for header-based auth)
    return res.status(200).json({ message: "Login successful", token });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};