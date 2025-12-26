import { db } from "../config/db.js";
import { usersTable } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Sign Up
export const signUp = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: "Name, email, and password are required" 
      });
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (name.trim().length < 2 || name.trim().length > 20) {
      return res.status(400).json({ message: "Name must be between 2 and 20 characters long" });
    }



    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }



    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with UUID for consistency
    const userId = crypto.randomUUID();
    const [newUser] = await db
      .insert(usersTable)
      .values({
        id: userId,
        email,
        password: hashedPassword,
        name: name,
        isOnline: false,
      })
      .returning();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;

    // Store new user in response for middleware to broadcast
    res.locals.newUser = userWithoutPassword;

    res.status(201).json({
      message: "User created successfully",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ 
      message: "Error creating user", 
      error: error.message 
    });
  }
};

// Login
export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required" 
      });
    }

    // Find user
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Update user online status
    await db
      .update(usersTable)
      .set({ isOnline: true, lastSeen: new Date() })
      .where(eq(usersTable.id, user.id));

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      message: "Error logging in", 
      error: error.message 
    });
  }
};

// Logout
export const Logout = async (req, res) => {
  try {
    // Update user status to offline if authenticated
    if (req.userId) {
      await db
        .update(usersTable)
        .set({ isOnline: false, lastSeen: new Date() })
        .where(eq(usersTable.id, req.userId));
    }

    // Clear cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ 
      message: "Error logging out", 
      error: error.message 
    });
  }
};