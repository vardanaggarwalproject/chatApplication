import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { getCurrentUser, getAllUsers, updateUserStatus, updateUserProfile, addUserAsContact, removeUserAsContact } from "../controllers/user.controllers.js";

const userRouter = express.Router();

// Middleware to inject io instance and activeUsers map
export const setIOMiddleware = (io, activeUsers) => {
  return (req, res, next) => {
    req.io = io;
    req.activeUsers = activeUsers;
    next();
  };
};

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.get("/all", isAuth, getAllUsers);
userRouter.post("/status", isAuth, updateUserStatus);

// Profile update route with socket broadcast
userRouter.put("/update", isAuth, async (req, res) => {
  try {
    console.log(`\n👤 [PROFILE UPDATE] User ${req.userId} updating profile`);
    console.log(`   Name: ${req.body.name || "unchanged"}`);
    console.log(`   Email: ${req.body.email || "unchanged"}`);
    console.log(`   Image: ${req.body.image ? "provided" : "unchanged"}`);

    // Call the controller function
    await updateUserProfile(req, res);

    // Broadcast profile update via socket if update was successful
    if (req.io && res.locals.updatedUser) {
      const updatedUser = res.locals.updatedUser;

      console.log(`   ✅ Profile updated in database`);
      console.log(`   New name: ${updatedUser.name}`);
      console.log(`   New email: ${updatedUser.email}`);

      // Broadcast to ALL connected clients (including other browser windows/tabs)
      // Use io.emit() to send to all connected sockets across all rooms
      console.log(`\n📢 [BROADCAST] Sending profile_updated event to ALL clients`);
      console.log(`   Updated user: ${updatedUser.name}`);
      console.log(`   User ID: ${updatedUser.id}`);

      req.io.emit("profile_updated", {
        userId: updatedUser.id,
        user: updatedUser,
        timestamp: new Date().toISOString(),
      });

      console.log(`   ✅ Broadcast sent successfully\n`);
    } else {
      console.warn(
        `   ⚠️  Could not broadcast - req.io: ${!!req.io}, updatedUser: ${!!res.locals.updatedUser}`
      );
    }
  } catch (error) {
    console.error("❌ Profile update route error:", error);
    console.error("   Error details:", error.message);
    res.status(500).json({ message: "Error updating profile" });
  }
});

// Add user as contact route
userRouter.post("/contacts/add", isAuth, addUserAsContact);

// Remove user as contact route
userRouter.post("/contacts/remove", isAuth, removeUserAsContact);

export default userRouter;