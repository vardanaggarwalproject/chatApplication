import { db } from "../config/db.js";
import { messagesTable, usersTable } from "../drizzle/schema.js";
import { eq, and, or, desc, isNull } from "drizzle-orm";

// Get direct messages between two users
export const getDirectMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { userId: otherUserId } = req.params;

    // console.log(` Fetching messages between ${userId} and ${otherUserId}`);

    // Fetch messages where either:
    // 1. Current user sent to other user
    // 2. Other user sent to current user
    // And groupId is null (direct messages only)
    const messages = await db
      .select({
        id: messagesTable.id,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        receiverId: messagesTable.receiverId,
        createdAt: messagesTable.createdAt,
        isEdited: messagesTable.isEdited,
        isRead: messagesTable.isRead,
        senderName: usersTable.name,
        senderImage: usersTable.image,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(
        and(
          isNull(messagesTable.groupId),
          or(
            and(
              eq(messagesTable.senderId, userId),
              eq(messagesTable.receiverId, otherUserId)
            ),
            and(
              eq(messagesTable.senderId, otherUserId),
              eq(messagesTable.receiverId, userId)
            )
          )
        )
      )
      .orderBy(messagesTable.createdAt);

    // console.log(` Found ${messages.length} messages`);
    res.json({ messages });
  } catch (error) {
    // console.error("Error fetching direct messages:", error);
    res.status(500).json({ 
      message: "Error fetching messages", 
      error: error.message 
    });
  }
};

// Send a direct message (REST endpoint as backup)
export const sendDirectMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ 
        message: "Receiver ID and content are required" 
      });
    }

    // Insert message
    const [message] = await db
      .insert(messagesTable)
      .values({
        senderId: userId,
        receiverId,
        content,
        groupId: null,
      })
      .returning();

    // Get sender info
    const [sender] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        image: usersTable.image,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    const messageData = {
      ...message,
      senderName: sender.name,
      senderImage: sender.image,
    };

    res.status(201).json({ message: messageData });
  } catch (error) {
    // console.error("Error sending direct message:", error);
    res.status(500).json({ 
      message: "Error sending message", 
      error: error.message 
    });
  }
};

// Get all conversations (list of users with whom current user has chatted)
export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;

    // Get unique users with whom current user has exchanged messages
    const conversations = await db
      .selectDistinct({
        userId: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        image: usersTable.image,
        isOnline: usersTable.isOnline,
        lastSeen: usersTable.lastSeen,
      })
      .from(messagesTable)
      .innerJoin(
        usersTable,
        or(
          and(
            eq(messagesTable.senderId, userId),
            eq(usersTable.id, messagesTable.receiverId)
          ),
          and(
            eq(messagesTable.receiverId, userId),
            eq(usersTable.id, messagesTable.senderId)
          )
        )
      )
      .where(isNull(messagesTable.groupId));

    res.json({ conversations });
  } catch (error) {
    // console.error("Error fetching conversations:", error);
    res.status(500).json({ 
      message: "Error fetching conversations", 
      error: error.message 
    });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { userId: otherUserId } = req.params;

    // Mark all messages from other user to current user as read
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(
        and(
          eq(messagesTable.senderId, otherUserId),
          eq(messagesTable.receiverId, userId),
          eq(messagesTable.isRead, false),
          isNull(messagesTable.groupId)
        )
      );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    // console.error("Error marking messages as read:", error);
    res.status(500).json({ 
      message: "Error marking messages as read", 
      error: error.message 
    });
  }
};