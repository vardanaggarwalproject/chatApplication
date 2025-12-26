import dotenv from "dotenv";
dotenv.config({path: ".env.production"});

import express from "express";
import { createServer } from 'node:http';
import cookieParser from "cookie-parser";
import cors from "cors";
import { db } from "./config/db.js";
import { messagesTable, usersTable, groupMembersTable } from "./drizzle/schema.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { eq, and } from "drizzle-orm";

// Routes
import authRouter from "./routes/auth.routes.js";
import userRouter, { setIOMiddleware } from "./routes/user.routes.js";
import groupRouter from "./routes/group.routes.js";
import messageRouter from "./routes/message.routes.js";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8000;

// Dynamic CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:5173", "http://localhost:3000", "https://chat-application-gqrk4hwr2-vardans-projects-378735dd.vercel.app"];

// console.log("✅ CORS Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);

      // Check if origin is allowed
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        // In development, log but don't block
        // console.warn(`⚠️ CORS request from unauthorized origin: ${origin}`);
        // Allow it anyway for development (remove this check in production)
        callback(null, true);
      }
    },
    credentials: true,
  })
);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        // console.warn(`⚠️ Socket.io CORS request from: ${origin}`);
        callback(null, true); // Allow for development
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Store active users: userId -> socket.id
const activeUsers = new Map();
// Store socket to user mapping: socket.id -> userId
const socketToUser = new Map();

// Routes
app.use("/api/auth", setIOMiddleware(io, activeUsers), authRouter);
app.use("/api/user", setIOMiddleware(io, activeUsers), userRouter);
app.use("/api/groups", setIOMiddleware(io, activeUsers), groupRouter);
app.use("/api/messages", messageRouter);

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.userId;

  // console.log(`\n✅ [CONNECTION] User connected`);
  // console.log(`   User ID: ${userId}`);
  // console.log(`   Socket ID: ${socket.id}`);
  // console.log(`   Total active users before: ${activeUsers.size}`);

  // Store active user
  activeUsers.set(userId, socket.id);
  socketToUser.set(socket.id, userId);

  // console.log(`   ✅ User registered in activeUsers map`);
  // console.log(`   Total active users after: ${activeUsers.size}`);
  // console.log(`   Active Users: ${Array.from(activeUsers.entries()).map(([uid, sid]) => `${uid}→${sid.substring(0, 8)}...`).join(", ")}`);

  // Update user online status in database
  try {
    await db
      .update(usersTable)
      .set({ isOnline: true, lastSeen: new Date() })
      .where(eq(usersTable.id, userId));

    console.log(`   ✅ Database updated: user marked as online`);
  } catch (error) {
    console.error(`❌ Error updating user status:`, error.message);
  }

  // Join user to their personal room
  socket.join(`user:${userId}`);
  console.log(`   ✅ User joined personal room: user:${userId}`);

  // CRITICAL: Join all groups user belongs to BEFORE broadcasting online status
  // This prevents race conditions where other users send messages before this user has joined rooms
  try {
    const userGroups = await db
      .select({ groupId: groupMembersTable.groupId })
      .from(groupMembersTable)
      .where(eq(groupMembersTable.userId, userId));
    
    console.log(`   📁 User ${userId} belongs to ${userGroups.length} groups`);
    userGroups.forEach(group => {
      socket.join(`group:${group.groupId}`);
      console.log(`   ✅ User ${userId} joined group room: group:${group.groupId}`);
    });
    
    if (userGroups.length > 0) {
      console.log(`   ✅ User ${userId} successfully joined all ${userGroups.length} group rooms`);
    }
  } catch (error) {
    console.error("❌ Error joining group rooms on connection:", error);
  }

  // Get user info and emit to all clients
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        userName: usersTable.userName,
        name: usersTable.name,
        image: usersTable.image,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    socket.broadcast.emit("user_online", user);
  } catch (error) {
    console.error("Error fetching user:", error);
  }

  // NOW broadcast user online status AFTER joining all rooms
  // This ensures the user is ready to receive messages
  io.emit("user_status_change", {
    userId,
    isOnline: true,
  });

  console.log(`   📢 User setup complete - broadcasted online status\n`);

  // Handle joining a group
  socket.on("join_group", async (data) => {
    const { groupId } = data;
    console.log(`📥 [JOIN_GROUP] Request from Socket ${socket.id} (User ${userId}) to join Group ${groupId}`);
    
    if (!groupId) {
      console.warn(`⚠️ [JOIN_GROUP] Invalid groupId received:`, data);
      return;
    }

    // Check if room already has this socket
    const existingRooms = socket.rooms;
    if (existingRooms.has(`group:${groupId}`)) {
      console.log(`   ℹ️ User ${userId} is ALREADY in group ${groupId}`);
    } else {
      socket.join(`group:${groupId}`);
      const socketsInRoom = await io.in(`group:${groupId}`).fetchSockets();
      console.log(`   ✅ User ${userId} joined room group:${groupId}. Total sockets: ${socketsInRoom.length}`);
    }

    socket.to(`group:${groupId}`).emit("user_joined_group", {
      userId,
      groupId,
    });
  });

  // Handle leaving a group
  socket.on("leave_group", (data) => {
    const { groupId } = data;
    socket.leave(`group:${groupId}`);
    // console.log(`📤 User ${userId} left group ${groupId}`);

    socket.to(`group:${groupId}`).emit("user_left_group", {
      userId,
      groupId,
    });
  });

  // Handle direct message - Enhanced version with logging and error handling
  socket.on("send_direct_message", async (data) => {
    const { receiverId, content } = data;

    try {
      // console.log(`\n📤 [DIRECT MESSAGE] Sender: ${userId}, Receiver: ${receiverId}`);
      // console.log(`   Content: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);

      // Validate inputs
      if (!receiverId || !content || !content.trim()) {
        console.error(`❌ Invalid message data - receiverId: ${receiverId}, content length: ${content?.length || 0}`);
        socket.emit("message_error", { error: "Invalid message data" });
        return;
      }

      // Validate receiver exists
      const [receiver] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, receiverId));

      if (!receiver) {
        console.error(`❌ Receiver not found: ${receiverId}`);
        socket.emit("message_error", { error: "Receiver not found" });
        return;
      }

      // Save message to database
      const [savedMessage] = await db.insert(messagesTable).values({
        senderId: userId,
        receiverId,
        content: content.trim(),
        groupId: null,
        isRead: false,
      }).returning();

      console.log(`✅ Message saved to DB with ID: ${savedMessage.id}`);

      // Get sender info
      const [sender] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          userName: usersTable.userName,
          image: usersTable.image,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const messageData = {
        ...savedMessage,
        senderName: sender.name,
        senderUserName: sender.userName,
        senderImage: sender.image,
      };

      // Check if receiver is online and send message in real-time
      const receiverSocketId = activeUsers.get(receiverId);

      console.log(`   Checking receiver status...`);
      console.log(`   Receiver Socket ID: ${receiverSocketId ? `Found (${receiverSocketId})` : "NOT FOUND"}`);
      console.log(`   Active Users Count: ${activeUsers.size}`);

      if (receiverSocketId || true) { // Always try to emit to the room, or check if any socket is in the room
        try {
          console.log(`📨 Emitting real-time message to receiver room: user:${receiverId}`);
          io.to(`user:${receiverId}`).emit("receive_direct_message", messageData);
          console.log(`✅ Real-time message emitted successfully`);
        } catch (emitError) {
          console.error(`⚠️  Error emitting real-time message:`, emitError.message);
        }
      } else {
        console.warn(`⚠️  Receiver is OFFLINE`);
        console.warn(`   Message stored in database for delivery when user comes online`);
      }

      // Send confirmation back to sender
      socket.emit("message_sent", {
        ...messageData,
        deliveryStatus: receiverSocketId ? "delivered_realtime" : "stored_offline"
      });

      console.log(`✅ Confirmation sent to sender\n`);

    } catch (error) {
      console.error(`❌ Error in send_direct_message:`, error.message);
      console.error(`   Stack:`, error.stack);
      socket.emit("message_error", {
        error: "Failed to send message",
        details: error.message
      });
    }
  });

  // Handle group message - Enhanced version with logging
  socket.on("send_group_message", async (data) => {
    const { groupId, content } = data;

    try {
      console.log(`\n📤 [GROUP MESSAGE] Group: ${groupId}, Sender: ${userId}`);
      console.log(`   Content: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);

      // Validate inputs
      if (!groupId || !content || !content.trim()) {
        console.error(`❌ Invalid message data - groupId: ${groupId}, content length: ${content?.length || 0}`);
        socket.emit("message_error", { error: "Invalid message data" });
        return;
      }

      // 🛡️ CRITICAL: Verify user is still a member of the group
      const [membership] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userId)
          )
        );

      if (!membership) {
        console.error(`❌ Permission denied: User ${userId} is not a member of group ${groupId}`);
        socket.emit("message_error", { error: "You are no longer a member of this group" });
        
        // Force socket to leave the room if they somehow still have it
        socket.leave(`group:${groupId}`);
        return;
      }

      // Save message to database
      const [savedMessage] = await db.insert(messagesTable).values({
        groupId,
        senderId: userId,
        content: content.trim(),
        receiverId: null,
        isRead: false,
      }).returning();

      console.log(`✅ Message saved to DB with ID: ${savedMessage.id}`);

      // Get sender info
      const [sender] = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          userName: usersTable.userName,
          image: usersTable.image,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

      const messageData = {
        ...savedMessage,
        senderName: sender.name,
        senderUserName: sender.userName,
        senderImage: sender.image,
      };

      // Broadcast to ALL users in the group (including sender tabs)
      // Frontend handles duplicate message filtering by ID
      console.log(`📢 Broadcasting to all members in group: group:${groupId}`);
      
      const socketsInRoom = await io.in(`group:${groupId}`).fetchSockets();
      console.log(`   👥 Total member sockets in room: ${socketsInRoom.length}`);
      
      // Log each socket in the room
      socketsInRoom.forEach((s, index) => {
        const socketUserId = socketToUser.get(s.id);
        console.log(`   ${index + 1}. Socket ${s.id.substring(0, 8)}... → User ${socketUserId}`);
      });
      
      io.to(`group:${groupId}`).emit("receive_group_message", messageData);

      // Confirm to sender that message was sent and saved
      socket.emit("message_sent", messageData);
      console.log(`✅ Group message broadcasted successfully to ${socketsInRoom.length} sockets in room group:${groupId}\n`);

    } catch (error) {
      console.error(`❌ Error in send_group_message:`, error.message);
      socket.emit("message_error", {
        error: "Failed to send message",
        details: error.message
      });
    }
  });

  // Handle typing indicator for direct messages
  socket.on("typing_direct", (data) => {
    const { receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_typing_direct", { userId });
    }
  });

  socket.on("stop_typing_direct", (data) => {
    const { receiverId } = data;
    const receiverSocketId = activeUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("user_stop_typing_direct", { userId });
    }
  });

  // Handle typing indicator for groups
  socket.on("typing_group", (data) => {
    const { groupId } = data;
    socket.to(`group:${groupId}`).emit("user_typing_group", { userId, groupId });
  });

  socket.on("stop_typing_group", (data) => {
    const { groupId } = data;
    socket.to(`group:${groupId}`).emit("user_stop_typing_group", { userId, groupId });
  });

  // Handle group_created event from client
  socket.on("group_created", async (data) => {
    const { group, memberIds } = data;

    // Emit to each member's personal room
    if (memberIds && memberIds.length > 0) {
      memberIds.forEach((memberId) => {
        console.log(`🔔 Sending group notification to room: user:${memberId}`);
        io.to(`user:${memberId}`).emit("added_to_group", {
          ...group,
          role: "member",
        });
      });
    }
  });

  // Handle explicit user going offline (sent from frontend on tab close)
  socket.on("user_going_offline", async (data, callback) => {
    const { userId: requestedUserId, timestamp } = data;

    try {
      console.log(`\n📵 [USER GOING OFFLINE] Explicit offline notification`);
      console.log(`   User ID: ${requestedUserId}`);
      console.log(`   Socket ID: ${socket.id}`);
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Current active users: ${activeUsers.size}`);

      // Only allow users to mark themselves offline
      if (requestedUserId !== userId) {
        console.warn(`   ⚠️  User ${userId} attempted to mark ${requestedUserId} as offline`);
        if (callback) {
          callback({
            success: false,
            error: "Cannot mark another user offline",
          });
        }
        return;
      }

      // Remove this specific socket from mappings
      socketToUser.delete(socket.id);
      
      // Check for other sockets
      const remainingSockets = await io.in(`user:${userId}`).fetchSockets();
      const otherActiveSockets = remainingSockets.filter(s => s.id !== socket.id);

      if (otherActiveSockets.length === 0) {
        activeUsers.delete(userId);
        console.log(`   ✅ User removed from activeUsers map (no more sessions)`);

        // Update user offline status in database
        try {
          await db
            .update(usersTable)
            .set({ isOnline: false, lastSeen: new Date(timestamp) })
            .where(eq(usersTable.id, userId));

          console.log(`   ✅ Database updated: user marked as offline with timestamp`);
        } catch (error) {
          console.error(`   ❌ Error updating user status in database:`, error.message);
        }

        // Broadcast user offline status to all clients
        io.emit("user_status_change", {
          userId: userId,
          isOnline: false,
        });

        console.log(`   📢 Broadcasted user_status_change to all clients\n`);
      } else {
        console.log(`   ℹ️ User still has ${otherActiveSockets.length} other active sessions. Keeping online status.`);
      }

      // Send acknowledgement back to client
      if (callback) {
        callback({
          success: true,
          message: "Session disconnected successfully",
          userId: userId,
          wasLastSession: otherActiveSockets.length === 0
        });
      }
    } catch (error) {
      console.error(`   ❌ Error in user_going_offline:`, error.message);
      if (callback) {
        callback({
          success: false,
          error: error.message,
        });
      }
    }
  });

  // Handle disconnect
  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`\n❌ [DISCONNECT] User disconnected`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Socket ID: ${socket.id}`);

    socketToUser.delete(socket.id);
    console.log(`   ✅ Socket removed from socketToUser mapping`);

    // Check if user has any OTHER active sockets before marking offline
    const remainingSockets = await io.in(`user:${userId}`).fetchSockets();
    console.log(`   Remaining sockets for user ${userId}: ${remainingSockets.length}`);

    if (remainingSockets.length === 0) {
      activeUsers.delete(userId);
      console.log(`   ✅ User ${userId} has no more active sessions. Marking OFFLINE.`);
      
      // Update user offline status in database
      try {
        await db
          .update(usersTable)
          .set({ isOnline: false, lastSeen: new Date() })
          .where(eq(usersTable.id, userId));

        console.log(`   ✅ Database updated: user marked as offline`);
      } catch (error) {
        console.error(`   ❌ Error updating user status:`, error.message);
      }

      // Broadcast user offline status
      io.emit("user_status_change", {
        userId,
        isOnline: false,
      });

      console.log(`   📢 Broadcasted user_status_change to all clients\n`);
    } else {
      console.log(`   ℹ️ User ${userId} still has ${remainingSockets.length} active sessions. Staying online.\n`);
    }
  });
});

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Server is running" });
});

// Debug endpoint - shows active connections
app.get("/debug/active-users", (req, res) => {
  const users = Array.from(activeUsers.entries()).map(([userId, socketId]) => ({
    userId,
    socketId: socketId.substring(0, 12) + "..."
  }));
  res.json({
    message: "Active users connected to this backend",
    activeUsers: users,
    totalCount: activeUsers.size,
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint - socket connection info
app.get("/debug/socket-info", (req, res) => {
  res.json({
    message: "Socket.io server is running",
    serverPort: PORT,
    corsOrigins: allowedOrigins,
    connectedClients: io.engine.clientsCount,
    activeUsersInMap: activeUsers.size
  });
});

// Debug endpoint - socket rooms membership
app.get("/debug/socket-rooms", async (req, res) => {
  try {
    const roomsData = {};
    
    // Get all sockets
    const allSockets = await io.fetchSockets();
    
    // Iterate through each socket and collect room info
    for (const socket of allSockets) {
      const userId = socketToUser.get(socket.id);
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id); // Exclude default room
      
      roomsData[socket.id.substring(0, 12) + "..."] = {
        userId: userId || "unknown",
        rooms: rooms
      };
    }
    
    res.json({
      message: "Socket room membership",
      totalSockets: allSockets.length,
      sockets: roomsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;