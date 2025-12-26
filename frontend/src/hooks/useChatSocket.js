import { useEffect, useRef } from 'react';
import socket from '../socket';
import { useChat } from '../context/ChatContext';
import axiosInstance from '../utils/axiosConfig';

export const useChatSocket = () => {
  const {
    currentUser,
    setUsers,
    setGroups,
    setAllUsers,
    setDirectMessages,
    setGroupMessages,
    setSelectedUser,
    setSelectedGroup,
    setSocketConnected,
    setConnectionStatus,
    fetchUsers,
    fetchGroups,
    selectedUserRef,
    selectedGroupRef,
    currentUserRef
  } = useChat();

  useEffect(() => {
    if (!currentUser) return;

    // Connect socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setSocketConnected(true);
      setConnectionStatus("connected");
      fetchUsers(currentUserRef.current);
      fetchGroups(currentUserRef.current);
    };

    const onConnectError = () => setSocketConnected(false);
    
    const onDisconnect = () => {
      setSocketConnected(false);
      setConnectionStatus("disconnected");
    };

    const onReconnectAttempt = () => setConnectionStatus("reconnecting");
    
    const onReconnect = () => {
      setSocketConnected(true);
      setConnectionStatus("connected");
      fetchUsers(currentUserRef.current);
      fetchGroups(currentUserRef.current);
    };

    const onUserStatusChange = ({ userId, isOnline }) => {
      const update = u => u.id === userId ? { ...u, isOnline } : u;
      setUsers(prev => prev.map(update));
      setAllUsers(prev => prev.map(update));
      if (selectedUserRef.current?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, isOnline } : null);
      }
    };

    const onReceiveDirectMessage = (messageData) => {
      const isSenderMe = String(currentUserRef.current?.id) === String(messageData.senderId);
      const chatId = isSenderMe ? String(messageData.receiverId) : String(messageData.senderId);
      const isCurrentlySelected = selectedUserRef.current && String(selectedUserRef.current.id) === chatId;

      // If I'm looking at the chat and it's not me sending, mark read on server immediately
      if (isCurrentlySelected && !isSenderMe) {
          axiosInstance.post(`/api/messages/mark-read/${chatId}`, {}).catch(console.error);
      }

      setDirectMessages(prev => {
        const msgs = prev[chatId] || [];
        if (msgs.some(m => m.id === messageData.id)) return prev;
        
        // Remove temp message
        const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content && String(m.senderId) === String(messageData.senderId)));
        
        return { ...prev, [chatId]: [...newMsgs, messageData] };
      });

      // Sidebar update for direct message
      setUsers(prev => {
        const exists = prev.find(u => String(u.id) === chatId);
        if (!exists && !isSenderMe) {
            const newUser = {
                id: messageData.senderId,
                userName: messageData.senderUserName || "Unknown",
                name: messageData.senderName || "Unknown User",
                hasChat: true,
                unreadCount: isCurrentlySelected ? 0 : 1,
                lastMessage: { content: messageData.content, createdAt: messageData.createdAt, senderId: messageData.senderId }
            };
            return [newUser, ...prev];
        }
        return prev.map(u => {
          if (String(u.id) === chatId) {
            return {
              ...u,
              hasChat: true,
              lastMessage: { content: messageData.content, createdAt: messageData.createdAt, senderId: messageData.senderId },
              unreadCount: (isCurrentlySelected || isSenderMe) ? 0 : (u.unreadCount || 0) + 1
            };
          }
          return u;
        }).sort((a,b) => {
            const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
            const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
            return timeB - timeA;
        });
      });
    };

    const onReceiveGroupMessage = (messageData) => {
      const targetGroupId = String(messageData.groupId);
      // User is actively viewing this group ONLY if:
      // 1. selectedGroup is set AND matches this group
      // 2. No user is selected (not in a direct message)
      const isActiveGroup = selectedGroupRef.current && 
                           !selectedUserRef.current && 
                           String(targetGroupId) === String(selectedGroupRef.current.id);

      console.log(`📨 [GROUP MESSAGE] Received for group ${targetGroupId}, isActive: ${isActiveGroup}`);

      setGroupMessages(prev => {
        const msgs = prev[targetGroupId] || [];
        if (msgs.some(m => m.id === messageData.id)) return prev;
        
        // Remove temp message
        const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content && String(m.senderId) === String(messageData.senderId)));
        
        return { ...prev, [targetGroupId]: [...newMsgs, messageData] };
      });

      setGroups(prev => prev.map(g => {
        if (String(g.id) === targetGroupId) {
          const isDifferentUser = String(messageData.senderId) !== String(currentUserRef.current?.id);
          const shouldIncrementUnread = !isActiveGroup && isDifferentUser;
          
          console.log(`   📊 Group ${targetGroupId}: isDifferentUser=${isDifferentUser}, shouldIncrement=${shouldIncrementUnread}`);
          
          return {
            ...g,
            lastMessage: { 
                content: messageData.content, 
                createdAt: messageData.createdAt, 
                senderName: messageData.senderName || messageData.senderUserName 
            },
            unreadCount: shouldIncrementUnread ? (g.unreadCount || 0) + 1 : (isActiveGroup ? 0 : g.unreadCount)
          };
        }
        return g;
      }).sort((a,b) => {
          const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
          const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
          return timeB - timeA;
      }));
    };

    const onMessageSent = (messageData) => {
        if (messageData.groupId) {
            const gid = String(messageData.groupId);
            
            // 1. Update messages
            setGroupMessages(prev => {
                const msgs = prev[gid] || [];
                if (msgs.some(m => m.id === messageData.id)) return prev;
                const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content));
                return { ...prev, [gid]: [...newMsgs, messageData] };
            });

            // 2. Update sidebar
            setGroups(prev => prev.map(g => {
                if (String(g.id) === gid) {
                    return {
                        ...g,
                        lastMessage: { 
                            content: messageData.content, 
                            createdAt: messageData.createdAt, 
                            senderName: messageData.senderName || "Me",
                            senderId: messageData.senderId
                        }
                    };
                }
                return g;
            }).sort((a,b) => {
                const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
                const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
                return timeB - timeA;
            }));

        } else if (messageData.receiverId) {
            const chatId = String(messageData.receiverId);
            setDirectMessages(prev => {
                const msgs = prev[chatId] || [];
                if (msgs.some(m => m.id === messageData.id)) return prev;
                const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content));
                return { ...prev, [chatId]: [...newMsgs, messageData] };
            });
        }
    };

    const onAddedToGroup = (data) => {
        console.log(`🔔 [ADDED TO GROUP] Received notification for group: ${data.id} (${data.name})`);
        console.log(`   Group details:`, data);
        
        socket.emit("join_group", { groupId: data.id });
        console.log(`   ✅ Emitted join_group for: ${data.id}`);
        
        fetchGroups(currentUserRef.current);
        console.log(`   ✅ Fetching updated groups list`);
    };

    const onGroupMemberAdded = (data) => {
        if (String(data.userId) === String(currentUserRef.current?.id)) {
            fetchGroups(currentUserRef.current);
            socket.emit("join_group", { groupId: data.groupId });
        }
    };

    const onProfileUpdated = (updateData) => {
        const { userId, user } = updateData;
        
        console.log(`👤 [SOCKET] Profile updated for user: ${userId}`);
        
        // 1. Update the sidebar users list and all-users list
        const updateFn = u => String(u.id) === String(userId) ? { ...u, ...user } : u;
        setUsers(prev => prev.map(updateFn));
        setAllUsers(prev => prev.map(updateFn));
        
        // 2. Update selected user if currently chatting with this person
        if (selectedUserRef.current && String(selectedUserRef.current.id) === String(userId)) {
            setSelectedUser(prev => prev ? { ...prev, ...user } : null);
        }
        
        // 3. Sync update across tabs if it's the current user
        if (String(currentUserRef.current?.id) === String(userId)) {
            const updatedUser = { ...currentUserRef.current, ...user };
            setCurrentUser(updatedUser);
            localStorage.setItem("user", JSON.stringify(updatedUser));
        }

        // 4. Update sender info in all cached messages for visual consistency
        const updateMessageFn = m => String(m.senderId) === String(userId) ? { 
            ...m, 
            senderName: user.name || user.userName,
            senderImage: user.image 
        } : m;

        setDirectMessages(prev => {
            const newDirect = { ...prev };
            Object.keys(newDirect).forEach(key => {
                newDirect[key] = newDirect[key].map(updateMessageFn);
            });
            return newDirect;
        });

        setGroupMessages(prev => {
            const newGroups = { ...prev };
            Object.keys(newGroups).forEach(key => {
                newGroups[key] = newGroups[key].map(updateMessageFn);
            });
            return newGroups;
        });
    };

    const onGroupMemberRemoved = (data) => {
        const { groupId, userId, removedBy, reason } = data;
        
        console.log(`🚪 [GROUP MEMBER REMOVED] User ${userId} removed from group ${groupId}`);
        console.log(`   Removed by: ${removedBy}, Reason: ${reason || 'admin action'}`);
        
        // Check if the removed user is the current user
        if (String(userId) === String(currentUserRef.current?.id)) {
            console.log(`   ⚠️  YOU were removed from the group!`);
            
            // Remove group from sidebar
            setGroups(prev => {
                const filtered = prev.filter(g => String(g.id) !== String(groupId));
                console.log(`   ✅ Removed group from sidebar. Groups remaining: ${filtered.length}`);
                return filtered;
            });
            
            // Clear group messages cache
            setGroupMessages(prev => {
                const newMessages = { ...prev };
                delete newMessages[groupId];
                return newMessages;
            });
            
            // If currently viewing this group, clear selection
            if (selectedGroupRef.current && String(selectedGroupRef.current.id) === String(groupId)) {
                console.log(`   ✅ Clearing group selection`);
                setSelectedGroup(null);
            }
            
            // Show notification to user
            const reasonText = reason === 'exit' ? 'left the group' : 'were removed from the group';
            alert(`You ${reasonText}: ${selectedGroupRef.current?.name || 'Group'}`);
        } else {
            // Another member was removed, just refresh the group list
            console.log(`   ℹ️  Another user was removed, refreshing groups`);
            fetchGroups(currentUserRef.current);
        }
    };

    const onUserCreated = (data) => {
        const { user } = data;
        
        console.log(`👤 [USER CREATED] New user signed up: ${user.userName} (ID: ${user.id})`);
        
        // Add the new user to allUsers list (for Add New Conversation modal)
        // Only add if it's not the current user
        if (String(user.id) !== String(currentUserRef.current?.id)) {
            setAllUsers(prev => {
                // Check if user already exists
                const exists = prev.find(u => String(u.id) === String(user.id));
                if (exists) {
                    console.log(`   ℹ️  User already exists in allUsers list`);
                    return prev;
                }
                
                console.log(`   ✅ Added new user to allUsers list`);
                return [...prev, user];
            });
        }
    };

    const onUserOnline = (user) => {
        // user object has { id, userName, name, image, ... }
        // Emitted when a user connects via socket
        
        // Ignore self
        if (String(user.id) === String(currentUserRef.current?.id)) return;

        setAllUsers(prev => {
            const exists = prev.find(u => String(u.id) === String(user.id));
            if (exists) {
                 // Update status to online if present
                 return prev.map(u => String(u.id) === String(user.id) ? { ...u, ...user, isOnline: true } : u);
            }
            console.log(`👤 [USER ONLINE] Added missing user to allUsers: ${user.userName}`);
            return [...prev, { ...user, isOnline: true }];
        });
        
        // Also update sidebar users if present (though user_status_change handles this too)
        setUsers(prev => prev.map(u => String(u.id) === String(user.id) ? { ...u, ...user, isOnline: true } : u));
    };

    // Attach listeners
    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect_attempt", onReconnectAttempt);
    socket.on("reconnect", onReconnect);
    socket.on("user_status_change", onUserStatusChange);
    socket.on("receive_direct_message", onReceiveDirectMessage);
    socket.on("receive_group_message", onReceiveGroupMessage);
    socket.on("message_sent", onMessageSent);
    socket.on("group_created", () => fetchGroups(currentUserRef.current));
    socket.on("added_to_group", onAddedToGroup);
    socket.on("group_member_added", onGroupMemberAdded);
    socket.on("group_member_removed", onGroupMemberRemoved);
    socket.on("profile_updated", onProfileUpdated);
    socket.on("user_created", onUserCreated);
    socket.on("user_online", onUserOnline);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect_attempt", onReconnectAttempt);
      socket.off("reconnect", onReconnect);
      socket.off("user_status_change", onUserStatusChange);
      socket.off("receive_direct_message", onReceiveDirectMessage);
      socket.off("receive_group_message", onReceiveGroupMessage);
      socket.off("message_sent", onMessageSent);
      socket.off("group_created");
      socket.off("added_to_group", onAddedToGroup);
      socket.off("group_member_added", onGroupMemberAdded);
      socket.off("group_member_removed", onGroupMemberRemoved);
      socket.off("profile_updated", onProfileUpdated);
      socket.off("user_created", onUserCreated);
      socket.off("user_online", onUserOnline);
    };
  }, [currentUser]);

  return { socket };
};
