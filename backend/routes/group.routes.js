import express from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import {
  groupsTable,
  groupMembersTable,
  messagesTable,
  usersTable,
} from "../drizzle/schema.js";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

const router = express.Router();

// FIXED: Proper authentication middleware that extracts user ID from JWT
const authenticateUser = async (req, res, next) => {
  try {
    // Get token from cookies
    let token = req.cookies.token;

    // console.log("Raw token from cookies:", token);

    if (!token) {
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    // Handle case where token might be JSON stringified
    if (typeof token === "object") {
      token = token.token || JSON.stringify(token);
    }

    // If token is a string that looks like JSON, try to parse it
    if (
      typeof token === "string" &&
      (token.startsWith("{") || token.startsWith("j:"))
    ) {
      try {
        // Remove 'j:' prefix if present (added by cookie-parser for JSON cookies)
        if (token.startsWith("j:")) {
          token = token.substring(2);
        }
        const parsed = JSON.parse(token);
        if (parsed.token) {
          token = parsed.token;
        }
      } catch (e) {
        // If parsing fails, use token as is
        // console.log("Token parsing failed, using as is");
      }
    }

    // console.log("Processed token:", token);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // console.log("Decoded token:", decoded);

    if (!decoded || !decoded.userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Invalid token structure" });
    }

    // Attach user ID to request
    req.userId = decoded.userId;
    // console.log("Authenticated user ID:", req.userId);
    //  console.log(" User ID type:", typeof req.userId);

    // ADDED: Verify user exists in database
    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId));

    if (!user) {
      console.error("❌ User not found in database:", req.userId);
      return res.status(401).json({ error: "User not found" });
    }

    // console.log(" User verified in database:", user.id);

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ error: "Authentication failed: " + error.message });
  }
};
// Create a new group
router.post("/create", authenticateUser, async (req, res) => {
  try {
    const { name, description, memberIds = [] } = req.body;

    console.log(
      `\n📁 [CREATE GROUP] User ${req.userId} creating group "${name}" with ${memberIds.length} members`
    );

    // Create group
    const [newGroup] = await db
      .insert(groupsTable)
      .values({
        name,
        description,
        createdBy: req.userId,
      })
      .returning();

    console.log(`✅ Group created with ID: ${newGroup.id}`);

    // Add creator as admin
    await db.insert(groupMembersTable).values({
      groupId: newGroup.id,
      userId: req.userId,
      role: "admin",
    });

    // Add other members
    if (memberIds.length > 0) {
      const memberValues = memberIds.map((userId) => ({
        groupId: newGroup.id,
        userId,
        role: "member",
      }));
      await db.insert(groupMembersTable).values(memberValues);
    }

    // Get full group details with last message for response
    const groupWithDetails = {
      ...newGroup,
      role: "admin",
      lastMessage: null,
      unreadCount: 0,
    };

    // 🔔 CRITICAL: Emit socket events to notify all members
    if (req.io) {
      console.log(`📢 [SOCKET] Notifying members about new group`);

      // All member IDs including creator
      const allMemberIds = [req.userId, ...memberIds];

      // Notify each member individually via their personal room
      allMemberIds.forEach((memberId) => {
        const memberRole = memberId === req.userId ? "admin" : "member";
        const groupDataForMember = {
          ...newGroup,
          role: memberRole,
          lastMessage: null,
          unreadCount: 0,
        };

        console.log(
          `   🔔 Notifying user ${memberId} (${memberRole}) via room: user:${memberId}`
        );
        req.io
          .to(`user:${memberId}`)
          .emit("added_to_group", groupDataForMember);
      });

      console.log(
        `✅ Notified ${allMemberIds.length} members about group creation`
      );
    } else {
      console.warn(
        `⚠️  Socket.io not available, members won't be notified in real-time`
      );
    }

    // Return group with memberIds for socket event
    res.status(201).json({ group: groupWithDetails, memberIds });
  } catch (error) {
    console.error("Error creating group:", error);
    res
      .status(500)
      .json({ error: "Failed to create group", details: error.message });
  }
});

// Get user's groups
router.get("/my-groups", authenticateUser, async (req, res) => {
  try {
    const userGroups = await db
      .select({
        id: groupsTable.id,
        name: groupsTable.name,
        description: groupsTable.description,
        createdAt: groupsTable.createdAt,
        role: groupMembersTable.role,
      })
      .from(groupMembersTable)
      .innerJoin(groupsTable, eq(groupMembersTable.groupId, groupsTable.id))
      .where(eq(groupMembersTable.userId, req.userId));

    // Extract group IDs
    const groupIds = userGroups.map((g) => g.id);

    // Map for last messages
    const lastMessageMap = new Map();

    // Fetch last messages for ALL these groups in ONE query if groups exist
    if (groupIds.length > 0) {
      // Use raw SQL for DISTINCT ON performance
      // joining with users to get sender details
      const result = await db.execute(sql`
        SELECT DISTINCT ON (m."group_id") 
          m."content", 
          m."created_at", 
          m."sender_id", 
          m."group_id",
          u."name" as "senderName", 
          u."user_name" as "senderUserName"
        FROM ${messagesTable} m
        JOIN ${usersTable} u ON m."sender_id" = u."id"
        WHERE ${inArray(sql`m."group_id"`, groupIds)}
        ORDER BY m."group_id", m."created_at" DESC
      `);

      // Process results
      // Drizzle execute returns strict result object in newer versions, rows property contains data
      const rows = result.rows || [];

      rows.forEach((msg) => {
        // Map snake_case headers to the object structure expected by frontend
        lastMessageMap.set(msg.group_id, {
          content: msg.content,
          createdAt: msg.created_at,
          senderId: msg.sender_id,
          senderName: msg.senderName, // Aliased in SQL
          senderUserName: msg.senderUserName, // Aliased in SQL
        });
      });
    }

    const groupsWithLastMessage = userGroups.map((group) => ({
      ...group,
      lastMessage: lastMessageMap.get(group.id) || null,
      unreadCount: 0, // Placeholder
    }));

    res.json({ groups: groupsWithLastMessage });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups", details: error.message });
  }
});

// Get group details with members
router.get("/:groupId", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;

    // Verify user is a member
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (membership.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    // Get group details
    const [group] = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId));

    // Get members
    const members = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        userName: usersTable.userName,
        role: groupMembersTable.role,
        joinedAt: groupMembersTable.joinedAt,
      })
      .from(groupMembersTable)
      .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
      .where(eq(groupMembersTable.groupId, groupId));

    res.json({ group, members });
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ error: "Failed to fetch group details" });
  }
});

// Get messages for a group
router.get("/:groupId/messages", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user is a member
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (membership.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    // Get messages
    const messages = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        createdAt: messagesTable.createdAt,
        isEdited: messagesTable.isEdited,
        senderId: messagesTable.senderId,
        senderName: usersTable.name,
        senderUserName: usersTable.userName,
        senderEmail: usersTable.email,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.groupId, groupId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message (REST endpoint as backup to socket)
router.post("/:groupId/messages", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    // Verify user is a member
    const membership = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (membership.length === 0) {
      return res.status(403).json({ error: "Not a member of this group" });
    }

    const [message] = await db
      .insert(messagesTable)
      .values({
        groupId,
        senderId: req.userId,
        content,
      })
      .returning();

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Add member to group
router.post("/:groupId/members", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    console.log(
      `\n👥 [ADD MEMBER] Admin ${req.userId} adding member ${userId} to group ${groupId}`
    );

    // Validate inputs
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if requester is admin
    const [requesterMembership] = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, req.userId)
        )
      );

    if (!requesterMembership || requesterMembership.role !== "admin") {
      return res.status(403).json({ error: "Only admins can add members" });
    }

    // Check if user to add exists
    const [userToAdd] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!userToAdd) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already in group
    const [existingMembership] = await db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, userId)
        )
      );

    if (existingMembership) {
      return res
        .status(400)
        .json({ error: "User is already a member of this group" });
    }

    // Add new member
    const [newMember] = await db
      .insert(groupMembersTable)
      .values({
        groupId,
        userId,
        role: "member",
      })
      .returning();

    console.log(`✅ [ADD MEMBER] Member added successfully`);

    // Broadcast member added event
    if (req.io) {
      // 📢 ROOM-BASED BROADCAST: Notify the group and the specific user
      console.log(
        `📢 [BROADCAST] Notifying room user:${userId} and group:${groupId}`
      );

      // Get full group details to send to the new member
      const [groupDetails] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, groupId));

      const eventData = {
        groupId,
        userId,
        addedBy: req.userId,
        group: groupDetails,
        timestamp: new Date().toISOString(),
      };

      // Notify the specific user being added (all their tabs)
      req.io.to(`user:${userId}`).emit("group_member_added", eventData);

      // Notify the group room members
      req.io.to(`group:${groupId}`).emit("group_member_added", eventData);
    }

    res.status(201).json({
      message: "Member added successfully",
      member: {
        id: userId,
        role: "member",
        joinedAt: newMember.joinedAt,
      },
    });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// Remove member from group (admin only)
router.delete(
  "/:groupId/members/:userId",
  authenticateUser,
  async (req, res) => {
    try {
      const { groupId, userId } = req.params;

      console.log(
        `\n🗑️ [REMOVE MEMBER] Admin ${req.userId} removing member ${userId} from group ${groupId}`
      );

      // Check if requester is admin
      const [requesterMembership] = await db
        .select()
        .from(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, req.userId)
          )
        );

      if (!requesterMembership || requesterMembership.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Only admins can remove members" });
      }

      // Cannot remove group creator
      const [group] = await db
        .select()
        .from(groupsTable)
        .where(eq(groupsTable.id, groupId));

      if (group.createdBy === userId) {
        return res.status(400).json({ error: "Cannot remove group creator" });
      }

      // Remove member
      const [removedMember] = await db
        .delete(groupMembersTable)
        .where(
          and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userId)
          )
        )
        .returning();

      if (!removedMember) {
        return res
          .status(404)
          .json({ error: "Member not found in this group" });
      }

      console.log(`✅ [REMOVE MEMBER] Member removed successfully`);

      // 📢 ROOM-BASED BROADCAST: Notify the group and the specific user
      if (req.io) {
        console.log(
          `📢 [BROADCAST] Notifying removal to room user:${userId} and group:${groupId}`
        );
        const eventData = {
          groupId,
          userId,
          removedBy: req.userId,
          timestamp: new Date().toISOString(),
        };
        // Notify the user themselves
        req.io.to(`user:${userId}`).emit("group_member_removed", eventData);
        // Notify the current group members
        req.io.to(`group:${groupId}`).emit("group_member_removed", eventData);

        // 🚪 CRITICAL: Force all user's sockets to leave the group room
        // This ensures they stop receiving messages immediately
        console.log(`🚪 [SOCKET] Forcing user:${userId} to leave group:${groupId}`);
        req.io.in(`user:${userId}`).socketsLeave(`group:${groupId}`);
      }

      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ error: "Failed to remove member" });
    }
  }
);

// User exits group
router.post("/:groupId/exit", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.userId;

    console.log(`\n👋 [EXIT GROUP] User ${userId} exiting group ${groupId}`);

    // Check if user is member
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
      return res.status(404).json({ error: "Not a member of this group" });
    }

    // Cannot exit if group creator
    const [group] = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId));

    if (group.createdBy === userId) {
      return res
        .status(400)
        .json({
          error: "Group creator cannot exit. Delete the group instead.",
        });
    }

    // Remove user from group
    await db
      .delete(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, userId)
        )
      );

    console.log(`✅ [EXIT GROUP] User exited successfully`);

    // 📢 ROOM-BASED BROADCAST: Notify the group
    if (req.io) {
      console.log(`📢 [BROADCAST] Notifying exit to group:${groupId}`);
      req.io.to(`group:${groupId}`).emit("group_member_removed", {
        groupId,
        userId,
        removedBy: userId, // Self-removed
        reason: "exit",
        timestamp: new Date().toISOString(),
      });

      // 🚪 CRITICAL: Force all user's sockets to leave the group room
      console.log(`🚪 [SOCKET] User ${userId} leaving group:${groupId}`);
      req.io.in(`user:${userId}`).socketsLeave(`group:${groupId}`);
    }

    res.json({ message: "You have exited the group" });
  } catch (error) {
    console.error("Error exiting group:", error);
    res.status(500).json({ error: "Failed to exit group" });
  }
});

// Delete group (admin/creator only)
router.delete("/:groupId", authenticateUser, async (req, res) => {
  try {
    const { groupId } = req.params;

    console.log(
      `\n🗑️ [DELETE GROUP] User ${req.userId} attempting to delete group ${groupId}`
    );

    // Check if user is admin/creator
    const [group] = await db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, groupId));

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (group.createdBy !== req.userId) {
      return res
        .status(403)
        .json({ error: "Only group creator can delete the group" });
    }

    // Delete all messages in group
    await db.delete(messagesTable).where(eq(messagesTable.groupId, groupId));

    // Delete all members
    await db
      .delete(groupMembersTable)
      .where(eq(groupMembersTable.groupId, groupId));

    // Delete group
    const [deletedGroup] = await db
      .delete(groupsTable)
      .where(eq(groupsTable.id, groupId))
      .returning();

    console.log(`✅ [DELETE GROUP] Group deleted successfully`);

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

export default router;
