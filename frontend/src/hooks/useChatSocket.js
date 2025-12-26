import { useEffect } from 'react';
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
        currentUserRef,
        setCurrentUser
    } = useChat();

    useEffect(() => {
        if (!currentUserRef.current) return;

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
            
            // 🛡️ RE-JOIN GROUP ROOM: If a group was selected, re-join its room on reconnect
            if (selectedGroupRef.current) {
                console.log(`🔌 [SOCKET] Re-joining group room: group:${selectedGroupRef.current.id}`);
                socket.emit("join_group", { groupId: selectedGroupRef.current.id });
            }
        };

        const onUserStatusChange = (data) => {
            if (!data || !data.userId) return;
            const userId = String(data.userId).toLowerCase();
            const isOnline = !!data.isOnline;
            
            const update = u => String(u.id).toLowerCase() === userId ? { ...u, isOnline } : u;
            setUsers(prev => prev.map(update));
            setAllUsers(prev => prev.map(update));
            
            setSelectedUser(prev => {
                if (prev && String(prev.id).toLowerCase() === userId) {
                    return { ...prev, isOnline };
                }
                return prev;
            });
        };

        const onReceiveDirectMessage = (messageData) => {
            if (!messageData) return;
            const isSenderMe = String(currentUserRef.current?.id).toLowerCase() === String(messageData.senderId).toLowerCase();
            const chatId = isSenderMe ? String(messageData.receiverId).toLowerCase() : String(messageData.senderId).toLowerCase();
            const isCurrentlySelected = selectedUserRef.current && String(selectedUserRef.current.id).toLowerCase() === chatId;

            console.log(`📨 [DIRECT_MSG] Received for ${chatId}. Active? ${isCurrentlySelected}`, messageData);

            if (isCurrentlySelected && !isSenderMe) {
                axiosInstance.post(`/api/messages/mark-read/${chatId}`, {}).catch(console.error);
            }

            setDirectMessages(prev => {
                const msgs = prev[chatId] || [];
                if (msgs.some(m => m.id === messageData.id)) return prev;
                const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content && String(m.senderId) === String(messageData.senderId)));
                return { ...prev, [chatId]: [...newMsgs, messageData] };
            });

            setUsers(prev => {
                const exists = prev.find(u => String(u.id).toLowerCase() === chatId);
                let updatedList;
                if (!exists && !isSenderMe) {
                    const newUser = {
                        id: String(messageData.senderId).toLowerCase(),
                        name: messageData.senderName || "Unknown User",
                        hasChat: true,
                        unreadCount: isCurrentlySelected ? 0 : 1,
                        lastMessage: { 
                            content: messageData.content, 
                            createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(), 
                            senderId: String(messageData.senderId).toLowerCase()
                        }
                    };
                    updatedList = [newUser, ...prev];
                } else {
                    updatedList = prev.map(u => {
                        if (String(u.id).toLowerCase() === chatId) {
                            return {
                                ...u,
                                hasChat: true,
                                lastMessage: { 
                                    content: messageData.content, 
                                    createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(), 
                                    senderId: String(messageData.senderId).toLowerCase()
                                },
                                unreadCount: (isCurrentlySelected || isSenderMe) ? 0 : (u.unreadCount || 0) + 1
                            };
                        }
                        return u;
                    });
                }
                
                return [...updatedList].sort((a, b) => {
                    const timeA = new Date(a.lastMessage?.createdAt || a.lastMessage?.created_at || 0).getTime();
                    const timeB = new Date(b.lastMessage?.createdAt || b.lastMessage?.created_at || 0).getTime();
                    return timeB - timeA;
                });
            });
        };

        const onReceiveGroupMessage = (messageData) => {
            if (!messageData) return;
            const targetGroupId = String(messageData.groupId || messageData.group_id).toLowerCase();
            const isActiveGroup = selectedGroupRef.current && 
                                !selectedUserRef.current && 
                                String(targetGroupId) === String(selectedGroupRef.current.id).toLowerCase();

            console.log(`📨 [GROUP_MSG] Received for ${targetGroupId}. Active? ${isActiveGroup}`, messageData);

            setGroupMessages(prev => {
                const msgs = prev[targetGroupId] || [];
                if (msgs.some(m => m.id === messageData.id)) return prev;
                const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content && String(m.senderId) === String(messageData.senderId)));
                return { ...prev, [targetGroupId]: [...newMsgs, messageData] };
            });

            setGroups(prev => {
                const newGroups = prev.map(g => {
                    if (String(g.id).toLowerCase() === targetGroupId) {
                        const isDifferentUser = String(messageData.senderId).toLowerCase() !== String(currentUserRef.current?.id).toLowerCase();
                        const shouldIncrementUnread = !isActiveGroup && isDifferentUser;
                        
                        console.log(`   ✅ Updating sidebar for group ${g.name} (${targetGroupId})`);
                        
                        return {
                            ...g,
                            lastMessage: { 
                                content: messageData.content, 
                                createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(), 
                                senderId: String(messageData.senderId).toLowerCase(),
                                senderName: messageData.senderName || "User",
                                senderImage: messageData.senderImage
                            },
                            unreadCount: shouldIncrementUnread ? (g.unreadCount || 0) + 1 : (isActiveGroup ? 0 : g.unreadCount)
                        };
                    }
                    return g;
                });

                // Sort groups by latest message
                return [...newGroups].sort((a, b) => {
                    const timeA = new Date(a.lastMessage?.createdAt || a.lastMessage?.created_at || 0).getTime();
                    const timeB = new Date(b.lastMessage?.createdAt || b.lastMessage?.created_at || 0).getTime();
                    return timeB - timeA;
                });
            });
        };

        const onMessageSent = (messageData) => {
            if (!messageData) return;
            console.log(`✉️ [MSG_SENT] Success for message:`, messageData);
            
            if (messageData.groupId || messageData.group_id) {
                const gid = String(messageData.groupId || messageData.group_id);
                setGroupMessages(prev => {
                    const msgs = prev[gid] || [];
                    if (msgs.some(m => m.id === messageData.id)) return prev;
                    const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content));
                    return { ...prev, [gid]: [...newMsgs, messageData] };
                });
                setGroups(prev => {
                    const newGroups = prev.map(g => {
                        if (String(g.id).toLowerCase() === gid.toLowerCase()) {
                            return {
                                ...g,
                                unreadCount: 0, // It's my own message
                                lastMessage: { 
                                    content: messageData.content, 
                                    createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(), 
                                    senderName: "Me",
                                    senderId: String(messageData.senderId).toLowerCase(),
                                    senderImage: messageData.senderImage
                                }
                            };
                        }
                        return g;
                    });
                    return [...newGroups].sort((a, b) => {
                        const timeA = new Date(a.lastMessage?.createdAt || a.lastMessage?.created_at || 0).getTime();
                        const timeB = new Date(b.lastMessage?.createdAt || b.lastMessage?.created_at || 0).getTime();
                        return timeB - timeA;
                    });
                });
            } else if (messageData.receiverId) {
                const chatId = String(messageData.receiverId);
                setDirectMessages(prev => {
                    const msgs = prev[chatId] || [];
                    if (msgs.some(m => m.id === messageData.id)) return prev;
                    const newMsgs = msgs.filter(m => !(m.id.startsWith("temp-") && m.content === messageData.content));
                    return { ...prev, [chatId]: [...newMsgs, messageData] };
                });
                
                // Update sidebar users for direct message sent
                setUsers(prev => {
                    const updatedUsers = prev.map(u => {
                        if (String(u.id).toLowerCase() === chatId) {
                            return {
                                ...u,
                                lastMessage: { 
                                    content: messageData.content, 
                                    createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(), 
                                    senderId: String(messageData.senderId).toLowerCase()
                                },
                                unreadCount: 0
                            };
                        }
                        return u;
                    });
                    return [...updatedUsers].sort((a, b) => {
                        const timeA = new Date(a.lastMessage?.createdAt || a.lastMessage?.created_at || 0).getTime();
                        const timeB = new Date(b.lastMessage?.createdAt || b.lastMessage?.created_at || 0).getTime();
                        return timeB - timeA;
                    });
                });
            }
        };

        const onAddedToGroup = (data) => {
            if (!data || !data.id) return;
            socket.emit("join_group", { groupId: data.id });
            fetchGroups(currentUserRef.current);
        };

        const onGroupMemberAdded = (data) => {
            if (!data || !data.userId || !data.groupId) return;
            const userId = String(data.userId).toLowerCase();
            const groupId = String(data.groupId).toLowerCase();
            if (userId === String(currentUserRef.current?.id).toLowerCase()) {
                fetchGroups(currentUserRef.current);
                socket.emit("join_group", { groupId });
            }
        };

        const onProfileUpdated = (data) => {
            if (!data || !data.userId || !data.user) return;
            const userId = String(data.userId).toLowerCase();
            const updates = data.user;
            
            const updateFn = u => String(u.id).toLowerCase() === userId ? { ...u, ...updates } : u;
            setUsers(prev => prev.map(updateFn));
            setAllUsers(prev => prev.map(updateFn));

            setSelectedUser(prev => {
                if (prev && String(prev.id).toLowerCase() === userId) {
                    return { ...prev, ...updates };
                }
                return prev;
            });

            if (String(currentUserRef.current?.id).toLowerCase() === userId) {
                const updatedUser = { ...currentUserRef.current, ...updates };
                setCurrentUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }

            const updateMessageFn = m => String(m.senderId).toLowerCase() === userId ? { 
                ...m, 
                senderName: updates.name || m.senderName,
                senderImage: updates.image || m.senderImage 
            } : m;

            setDirectMessages(prev => {
                const newDirect = { ...prev };
                Object.keys(newDirect).forEach(key => { newDirect[key] = newDirect[key].map(updateMessageFn); });
                return newDirect;
            });

            setGroupMessages(prev => {
                const newGroups = { ...prev };
                Object.keys(newGroups).forEach(key => { newGroups[key] = newGroups[key].map(updateMessageFn); });
                return newGroups;
            });

            setGroups(prev => prev.map(g => {
                if (g.lastMessage && String(g.lastMessage.senderId).toLowerCase() === userId) {
                    return {
                        ...g,
                        lastMessage: {
                            ...g.lastMessage,
                            senderName: updates.name || g.lastMessage.senderName,
                            senderImage: updates.image || g.lastMessage.senderImage
                        }
                    };
                }
                return g;
            }));
        };

        const onGroupMemberRemoved = (data) => {
            if (!data || !data.groupId || !data.userId) return;
            const groupId = String(data.groupId).toLowerCase();
            const userId = String(data.userId).toLowerCase();
            if (userId === String(currentUserRef.current?.id).toLowerCase()) {
                setGroups(prev => prev.filter(g => String(g.id).toLowerCase() !== groupId));
                setGroupMessages(prev => {
                    const newMessages = { ...prev };
                    delete newMessages[groupId];
                    return newMessages;
                });
                if (selectedGroupRef.current && String(selectedGroupRef.current.id).toLowerCase() === groupId) {
                    setSelectedGroup(null);
                }
                const reasonText = data.reason === 'exit' ? 'left the group' : 'were removed from the group';
                alert(`You ${reasonText}: ${selectedGroupRef.current?.name || 'Group'}`);
            } else {
                fetchGroups(currentUserRef.current);
            }
        };

        const onUserCreated = (data) => {
            if (!data || !data.user) return;
            const newUser = data.user;
            const newUserId = String(newUser.id).toLowerCase();
            if (newUserId !== String(currentUserRef.current?.id).toLowerCase()) {
                setAllUsers(prev => {
                    const exists = prev.find(u => String(u.id).toLowerCase() === newUserId);
                    if (exists) return prev;
                    return [...prev, { ...newUser, id: newUserId }];
                });
            }
        };

        const onUserOnline = (user) => {
            if (!user || !user.id) return;
            const userId = String(user.id).toLowerCase();
            if (userId === String(currentUserRef.current?.id).toLowerCase()) return;
            
            const onlineUpdate = u => String(u.id).toLowerCase() === userId ? { ...u, ...user, isOnline: true } : u;
            
            setAllUsers(prev => {
                const exists = prev.find(u => String(u.id).toLowerCase() === userId);
                if (exists) return prev.map(onlineUpdate);
                return [{ ...user, isOnline: true }, ...prev];
            });
            
            setUsers(prev => prev.map(onlineUpdate));

            setSelectedUser(prev => {
                if (prev && String(prev.id).toLowerCase() === userId) {
                    return { ...prev, ...user, isOnline: true };
                }
                return prev;
            });
        };

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
    }, [currentUser, fetchUsers, fetchGroups, setUsers, setGroups, setAllUsers, setDirectMessages, setGroupMessages, setSelectedUser, setSelectedGroup, setSocketConnected, setConnectionStatus, setCurrentUser]);

    return { socket };
};
