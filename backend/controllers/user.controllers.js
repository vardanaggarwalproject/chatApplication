import { db } from "../config/db.js";
import { usersTable, messagesTable, userContactsTable } from "../drizzle/schema.js";
import { eq, and, or, desc, ne, isNull, sql } from "drizzle-orm";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        image: usersTable.image,
        isOnline: usersTable.isOnline,
        lastSeen: usersTable.lastSeen,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user online status
    await db
      .update(usersTable)
      .set({ isOnline: true, lastSeen: new Date() })
      .where(eq(usersTable.id, userId));

    res.status(200).json({ user: { ...user, isOnline: true } });
  } catch (error) {
    // console.error("Get current user error:", error);
    res.status(500).json({ message: "Error fetching user data" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const currentUserIdRaw = req.userId;
    const currentUserId = String(currentUserIdRaw).toLowerCase();
    const activeUsers = req.activeUsers;

    console.log(`\n🔍 [GET_ALL_USERS] Starting optimized fetch for User: ${currentUserId}`);
    const startTime = Date.now();

    // 1. Get all users except current user
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        image: usersTable.image,
        isOnline: usersTable.isOnline,
        lastSeen: usersTable.lastSeen,
      })
      .from(usersTable)
      .where(ne(sql`${usersTable.id}::text`, currentUserId));

    console.log(`   - Found ${users.length} other users in DB`);

    // 2. Fetch all contacts for this user in bulk
    let userContacts = [];
    try {
      userContacts = await db
        .select({ contactUserId: userContactsTable.contactUserId })
        .from(userContactsTable)
        .where(
          and(
            eq(userContactsTable.userId, currentUserId),
            eq(userContactsTable.addedForChat, true)
          )
        );
    } catch (err) {
      console.warn("   ⚠️  Contacts table error (skipping):", err.message);
    }
    const contactIds = new Set(userContacts.map(c => String(c.contactUserId)));

    // 3. Fetch unread counts in bulk
    const unreadCounts = await db
      .select({
        senderId: messagesTable.senderId,
        count: sql`count(*)`.mapWith(Number)
      })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.receiverId, currentUserId),
          eq(messagesTable.isRead, false),
          isNull(messagesTable.groupId)
        )
      )
      .groupBy(messagesTable.senderId);
    
    const unreadMap = new Map(unreadCounts.map(c => [String(c.senderId).toLowerCase(), c.count]));

    // 4. Fetch ALL last messages for the current user in a SINGLE optimized query
    // Use DISTINCT ON to get the latest message per conversation
    // NOTE: Using subquery to define partner_id avoids "expression must match" errors with parameterized queries
    const lastMessages = await db.execute(sql`
      SELECT DISTINCT ON (partner_id) *
      FROM (
        SELECT *, 
          CASE 
            WHEN sender_id::text = ${currentUserId}::text THEN receiver_id 
            ELSE sender_id 
          END as partner_id
        FROM ${messagesTable}
        WHERE (
          sender_id::text = ${currentUserId}::text OR receiver_id::text = ${currentUserId}::text
        )
        AND group_id IS NULL
      ) as subquery
      ORDER BY partner_id, created_at DESC
    `);
    
    // Create a map of conversationPartnerId -> message (mapped to camelCase)
    const lastMessageMap = new Map();
    // Helper to extract rows
    const rows = (lastMessages && Array.isArray(lastMessages)) 
      ? lastMessages 
      : (lastMessages && lastMessages.rows) 
        ? lastMessages.rows 
        : [];
       
    rows.forEach(msg => {
       const partnerId = String(msg.partner_id).toLowerCase();
       
       // Standardize the timestamp to UTC ISO string
       let createdAt = null;
       if (msg.created_at) {
          const raw = msg.created_at;
          // If it's a string from raw SQL without timezone, append Z to force UTC interpretation
          if (typeof raw === 'string' && !raw.includes('Z') && !raw.includes('+')) {
            createdAt = new Date(raw + 'Z').toISOString();
          } else {
            createdAt = new Date(raw).toISOString();
          }
       }

       lastMessageMap.set(partnerId, {
         id: msg.id,
         content: msg.content,
         senderId: msg.sender_id,
         receiverId: msg.receiver_id,
         groupId: msg.group_id,
         createdAt,
         isRead: msg.is_read,
       });
    });

    const usersWithMetadata = users.map((user) => {
        const userIdStr = String(user.id).toLowerCase();
        const addedForChat = contactIds.has(userIdStr);
        const lastMessage = lastMessageMap.get(userIdStr) || null;
        const hasChat = !!lastMessage;

        return {
          ...user,
          isOnline: activeUsers ? activeUsers.has(userIdStr) : (user.isOnline || false),
          lastMessage: lastMessage,
          unreadCount: unreadMap.get(userIdStr) || 0,
          hasChat,
          addedForChat
        };
    });

    const endTime = Date.now();
    console.log(`✅ [GET_ALL_USERS] Completed in ${endTime - startTime}ms`);
    
    res.status(200).json({ users: usersWithMetadata });
  } catch (error) {
    console.error("❌ [GET_ALL_USERS] CRITICAL ERROR:", error);
    res.status(500).json({ 
      message: "Error fetching users", 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { isOnline } = req.body;

    await db
      .update(usersTable)
      .set({
        isOnline,
        lastSeen: new Date(),
      })
      .where(eq(usersTable.id, userId));

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ message: "Error updating status" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, email, image } = req.body;

    // Validate email if provided
    if (email !== undefined && email.trim() !== "") {
      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email is unique (not used by another user)
      const [existingUser] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(
          and(
            eq(usersTable.email, email),
            ne(usersTable.id, userId) // Exclude current user
          )
        );

      if (existingUser) {
        return res.status(400).json({ message: "Email already in use by another user" });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    // Validate name if provided
    if (name !== undefined) {
      if (!name || name.trim() === "") {
        return res.status(400).json({ message: "Name is required" });
      }
      if (name.trim().length < 2 || name.trim().length > 20) {
        return res.status(400).json({ message: "Name must be between 2 and 20 characters long" });
      }
      updateData.name = name.trim();
    }
    if (email !== undefined && email.trim() !== "") updateData.email = email.trim();
    if (image !== undefined && image.trim() !== "") updateData.image = image.trim();
    updateData.updatedAt = new Date();

    // Check if there's actually anything to update
    if (Object.keys(updateData).length === 1) { // Only updatedAt field
      return res.status(400).json({ message: "Please provide at least one field to update" });
    }

    // Update user
    await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId));

    // Get updated user
    const [updatedUser] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        image: usersTable.image,
        isOnline: usersTable.isOnline,
        lastSeen: usersTable.lastSeen,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    // console.log(" Profile updated for user:", userId);
    // console.log(" Updated user data:", updatedUser);

    // Store updated user in response for middleware to broadcast
    res.locals.updatedUser = { ...updatedUser, id: String(updatedUser.id).toLowerCase() };

    res.status(200).json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

export const addUserAsContact = async (req, res) => {
  try {
    const userId = req.userId;
    const { contactUserId } = req.body;

    console.log(`\n👥 [ADD CONTACT] User ${userId} adding user ${contactUserId} as contact`);

    // Validate contact user exists
    if (!contactUserId) {
      return res.status(400).json({ message: "Contact user ID is required" });
    }

    if (userId === contactUserId) {
      return res.status(400).json({ message: "Cannot add yourself as a contact" });
    }

    // Check if contact user exists
    const [contactUser] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, contactUserId));

    if (!contactUser) {
      return res.status(404).json({ message: "Contact user not found" });
    }

    try {
      // Check if already added as contact
      const [existingContact] = await db
        .select()
        .from(userContactsTable)
        .where(
          and(
            eq(userContactsTable.userId, userId),
            eq(userContactsTable.contactUserId, contactUserId),
            eq(userContactsTable.addedForChat, true)
          )
        );

      if (existingContact) {
        return res.status(400).json({ message: "User is already added as contact" });
      }

      // Add contact
      const [newContact] = await db
        .insert(userContactsTable)
        .values({
          userId,
          contactUserId,
          addedForChat: true,
        })
        .returning();

      console.log(`✅ [ADD CONTACT] Contact added successfully:`, newContact.id);

      res.status(200).json({
        message: "Contact added successfully",
        contact: newContact,
      });
    } catch (tableError) {
      // Table might not exist - create a temporary response
      if (tableError.message?.includes("does not exist")) {
        console.warn(`⚠️  user_contacts table does not exist yet`);
        console.log(`💡 [INFO] Run database migrations to create the table`);
        // Still return success so frontend can work
        res.status(200).json({
          message: "Contact added (table pending migration)",
          contact: { userId, contactUserId, addedForChat: true },
        });
      } else {
        throw tableError;
      }
    }
  } catch (error) {
    console.error("Add contact error:", error);
    res.status(500).json({ message: "Error adding contact" });
  }
};

export const removeUserAsContact = async (req, res) => {
  try {
    const userId = req.userId;
    const { contactUserId } = req.body;

    console.log(`\n❌ [REMOVE CONTACT] User ${userId} removing user ${contactUserId} as contact`);

    if (!contactUserId) {
      return res.status(400).json({ message: "Contact user ID is required" });
    }

    try {
      // Remove contact by setting addedForChat to false
      const [removed] = await db
        .update(userContactsTable)
        .set({ addedForChat: false })
        .where(
          and(
            eq(userContactsTable.userId, userId),
            eq(userContactsTable.contactUserId, contactUserId)
          )
        )
        .returning();

      if (!removed) {
        return res.status(404).json({ message: "Contact not found" });
      }

      console.log(`✅ [REMOVE CONTACT] Contact removed successfully`);

      res.status(200).json({
        message: "Contact removed successfully",
      });
    } catch (tableError) {
      // Table might not exist yet - that's okay
      if (tableError.message?.includes("does not exist")) {
        console.warn(`⚠️  user_contacts table does not exist yet`);
        // Still return success
        res.status(200).json({
          message: "Contact removed (table pending migration)",
        });
      } else {
        throw tableError;
      }
    }
  } catch (error) {
    console.error("Remove contact error:", error);
    res.status(500).json({ message: "Error removing contact" });
  }
};