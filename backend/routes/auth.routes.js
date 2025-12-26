import express from "express";
import { Login, Logout, signUp } from "../controllers/auth.controllers.js";

const authRouter = express.Router();

// Signup route with socket broadcast
authRouter.post("/signup", async (req, res) => {
  try {
    // Call the controller function
    await signUp(req, res);

    // Broadcast new user created via socket if signup was successful
    if (req.io && res.locals.newUser) {
      const newUser = res.locals.newUser;
      
      console.log(`\n📢 [BROADCAST] Sending user_created event to ALL clients`);
      console.log(`   New user: ${newUser.name}`);
      console.log(`   User ID: ${newUser.id}`);

      req.io.emit("user_created", {
        user: newUser,
        timestamp: new Date().toISOString(),
      });

      console.log(`   ✅ Broadcast sent successfully\n`);
    }
  } catch (error) {
    console.error("❌ Signup route error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error during signup broadcast" });
    }
  }
});

authRouter.post("/login", Login);
authRouter.get("/logout", Logout);

export default authRouter;
