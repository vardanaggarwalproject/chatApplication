import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axiosInstance from '../utils/axiosConfig';
import socket from '../socket';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState({});
  const [directMessages, setDirectMessages] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connected");
  const [showAddConversationModal, setShowAddConversationModal] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [messagesEndRef, setMessagesEndRef] = useState(null); // Will be set by ChatArea
  const [pendingSelection, setPendingSelection] = useState(null);
  
  // Refs for socket listeners to avoid stale closures
  const selectedUserRef = useRef(selectedUser);
  const selectedGroupRef = useRef(selectedGroup);
  const currentUserRef = useRef(currentUser);
  const lastUserIdRef = useRef(null);
  const lastGroupIdRef = useRef(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
    selectedGroupRef.current = selectedGroup;
    currentUserRef.current = currentUser;
  }, [selectedUser, selectedGroup, currentUser]);

  // Function Definitions
  const fetchUsers = useCallback(async (user) => {
    const activeUser = user || currentUserRef.current;
    if (!activeUser) return;
    try {
      setLoadingUsers(true);
      const response = await axiosInstance.get(`/api/user/all`);
      let otherUsers = response.data.users.filter(u => String(u.id) !== String(activeUser.id));
      const usersToShow = otherUsers.filter(u => u.hasChat || u.addedForChat);
      setUsers(usersToShow);
      setAllUsers(otherUsers);
    } catch (error) {
      console.error("❌ Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchGroups = useCallback(async (user) => {
    const activeUser = user || currentUserRef.current;
    if (!activeUser) return;
    try {
      setLoadingGroups(true);
      const response = await axiosInstance.get(`/api/groups/my-groups`);
      const groupsData = response.data.groups || [];
      if (socket && socket.connected) {
        groupsData.forEach(group => socket.emit("join_group", { groupId: group.id }));
      }
      setGroups(groupsData);
    } catch (error) {
      console.error("❌ Error fetching groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const fetchDirectMessages = useCallback(async (userId, isBackground = false) => {
    if (!userId) return;
    if (!isBackground) setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/api/messages/direct/${userId}`);
      
      const fetchedMessages = response.data.messages || [];
      setDirectMessages(prev => ({ ...prev, [userId]: fetchedMessages }));
    } catch (error) {
      console.error("Error fetching direct messages:", error);
    } finally {
      if (!isBackground) setLoadingMessages(false);
    }
  }, []);

  const fetchGroupMessages = useCallback(async (groupId, isBackground = false) => {
    if (!groupId) return;
    if (!isBackground) setLoadingMessages(true);
    try {
      const response = await axiosInstance.get(`/api/groups/${groupId}/messages`);
      
      const fetchedMessages = response.data.messages || [];
      setGroupMessages(prev => ({ ...prev, [groupId]: fetchedMessages }));
    } catch (error) {
      console.error("Error fetching group messages:", error);
    } finally {
      if (!isBackground) setLoadingMessages(false);
    }
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    if (currentUser) {
      fetchUsers(currentUser);
      fetchGroups(currentUser);
      setLoading(false);
    }
  }, [currentUser, fetchUsers, fetchGroups]);

  // Fetch messages and reset unread counts when selection changes
  useEffect(() => {
    if (selectedUser) {
      const isNewUser = lastUserIdRef.current !== selectedUser.id;
      
      // 1. Reset unread count locally and on server
      setUsers(prev => prev.map(u => String(u.id) === String(selectedUser.id) ? { ...u, unreadCount: 0 } : u));
      axiosInstance.post(`/api/messages/mark-read/${selectedUser.id}`, {}).catch(console.error);

      // 2. Only trigger loading logic if we actually switched users
      if (isNewUser) {
        lastUserIdRef.current = selectedUser.id;
        
        // Clear previous state for a new selection if not cached
        if (!directMessages[selectedUser.id]) {
          fetchDirectMessages(selectedUser.id);
        } else {
          // If cached, we can show it instantly
          setLoadingMessages(false);
          // 🛡️ RE-VALIDATE: Even if cached, check for new messages in background
          fetchDirectMessages(selectedUser.id, true); 
        }
      }
    } else {
      lastUserIdRef.current = null;
    }
  }, [selectedUser, fetchDirectMessages]); // Removed activeMessages/directMessages dependency

  useEffect(() => {
    if (selectedGroup) {
      const isNewGroup = lastGroupIdRef.current !== selectedGroup.id;

      // 0. Join the group room via socket FIRST
      if (socket && socket.connected) {
        console.log(`🔌 [SOCKET] Joining group room: group:${selectedGroup.id}`);
        socket.emit("join_group", { groupId: selectedGroup.id });
      }

      // 1. Reset unread count locally
      setGroups(prev => prev.map(g => String(g.id) === String(selectedGroup.id) ? { ...g, unreadCount: 0 } : g));

      // 2. Only trigger loading logic if we actually switched groups
      if (isNewGroup) {
        lastGroupIdRef.current = selectedGroup.id;

        if (!groupMessages[selectedGroup.id]) {
          fetchGroupMessages(selectedGroup.id);
        } else {
          // If cached, show instantly
          setLoadingMessages(false);
          // 🛡️ RE-VALIDATE: Background fetch to ensure no missed messages
          fetchGroupMessages(selectedGroup.id, true);
        }
      }
    } else {
      lastGroupIdRef.current = null;
    }
  }, [selectedGroup, fetchGroupMessages]); // Removed activeMessages/groupMessages dependency

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => 
      u.userName?.toLowerCase().includes(q) || 
      u.name?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(g => 
      g.name?.toLowerCase().includes(q)
    );
  }, [groups, searchQuery]);

  const activeMessages = useMemo(() => {
    if (selectedGroup) return groupMessages[selectedGroup.id] || [];
    if (selectedUser) return directMessages[selectedUser.id] || [];
    return [];
  }, [selectedGroup, selectedUser, groupMessages, directMessages]);

  const refreshSidebar = useCallback(() => {
    const sortFn = (a, b) => {
      const timeA = (a.lastMessage?.createdAt || a.lastMessage?.created_at) ? new Date(a.lastMessage.createdAt || a.lastMessage.created_at).getTime() : 0;
      const timeB = (b.lastMessage?.createdAt || b.lastMessage?.created_at) ? new Date(b.lastMessage.createdAt || b.lastMessage.created_at).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    };
    setUsers(prev => [...prev].sort(sortFn));
    setGroups(prev => [...prev].sort(sortFn));
  }, []);

  const handleSendMessage = useCallback(async (content) => {
    if (!content.trim()) return;
    if (!selectedUser && !selectedGroup) return;
    if (!socketConnected) {
      alert("Not connected. Please wait for connection...");
      return;
    }

    const messageContent = content.trim();

    if (selectedGroup) {
      // Send group message
      socket.emit("send_group_message", { groupId: selectedGroup.id, content: messageContent });

      // Optimistic update for group
      const tempGroupMessage = {
        id: `temp-${Date.now()}`,
        groupId: selectedGroup.id,
        senderId: currentUser.id,
        content: messageContent,
        createdAt: new Date().toISOString(),
        senderName: currentUser.name || currentUser.userName,
        senderUserName: currentUser.userName,
      };
      setGroupMessages(prev => ({
        ...prev,
        [selectedGroup.id]: [...(prev[selectedGroup.id] || []), tempGroupMessage]
      }));

      // Optimistic sidebar update for group
      setGroups(prev => prev.map(g => {
        if (String(g.id) === String(selectedGroup.id)) {
          return {
            ...g,
            lastMessage: {
              content: messageContent,
              createdAt: tempGroupMessage.createdAt,
              senderName: "You",
              senderId: currentUser.id
            }
          };
        }
        return g;
      }).sort((a, b) => {
        const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
        const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
        return timeB - timeA;
      }));
    } else if (selectedUser) {
      // Send direct message
      socket.emit("send_direct_message", { receiverId: selectedUser.id, content: messageContent });

      // Optimistic update for direct
      const tempMessage = {
        id: `temp-${Date.now()}`,
        senderId: currentUser.id,
        receiverId: selectedUser.id,
        content: messageContent,
        createdAt: new Date().toISOString(),
        senderName: currentUser.name || currentUser.userName,
        senderUserName: currentUser.userName,
      };
      setDirectMessages(prev => ({
        ...prev,
        [selectedUser.id]: [...(prev[selectedUser.id] || []), tempMessage]
      }));
      
      // Optimistic sidebar update for direct message sender
      setUsers(prev => prev.map(u => String(u.id) === String(selectedUser.id) ? {
        ...u,
        hasChat: true,
        lastMessage: { content: messageContent, createdAt: tempMessage.createdAt, senderId: String(currentUser.id) }
      } : u).sort((a, b) => {
        const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
        const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
        return timeB - timeA;
      }));
    }
  }, [selectedUser, selectedGroup, socketConnected, currentUser]);

  const handleSelectNewUser = useCallback((user) => {
    setUsers(prev => {
      if (prev.find(u => String(u.id) === String(user.id))) return prev;
      return [{ ...user, hasChat: false, addedForChat: true }, ...prev];
    });
    setSelectedGroup(null);
    setSelectedUser(user);
  }, []);

  const value = useMemo(() => ({
    currentUser, setCurrentUser,
    users, setUsers,
    groups, setGroups,
    allUsers, setAllUsers,
    filteredUsers,
    filteredGroups,
    searchQuery, setSearchQuery,
    selectedUser, setSelectedUser,
    selectedGroup, setSelectedGroup,
    groupMessages, setGroupMessages,
    directMessages, setDirectMessages,
    activeMessages,
    loading, setLoading,
    loadingUsers, setLoadingUsers,
    loadingGroups, setLoadingGroups,
    loadingMessages, setLoadingMessages,
    socketConnected, setSocketConnected,
    connectionStatus, setConnectionStatus,
    showAddConversationModal, setShowAddConversationModal,
    showCreateGroup, setShowCreateGroup,
    showEditProfile, setShowEditProfile,
    showGroupMembersModal, setShowGroupMembersModal,
    groupMembers, setGroupMembers,
    loadingGroupMembers, setLoadingGroupMembers,
    messagesEndRef, setMessagesEndRef,
    pendingSelection, setPendingSelection,
    refreshSidebar, fetchUsers, fetchGroups,
    fetchDirectMessages, fetchGroupMessages, handleSendMessage,
    handleSelectNewUser,
    selectedUserRef, selectedGroupRef, currentUserRef
  }), [
    currentUser, users, groups, allUsers, filteredUsers, filteredGroups, 
    searchQuery, selectedUser, selectedGroup, groupMessages, directMessages, 
    activeMessages, loading, loadingUsers, loadingGroups, loadingMessages, 
    socketConnected, connectionStatus, showAddConversationModal, showCreateGroup, 
    showEditProfile, showGroupMembersModal, groupMembers, loadingGroupMembers, 
    messagesEndRef, pendingSelection, refreshSidebar, fetchUsers, fetchGroups, 
    fetchDirectMessages, fetchGroupMessages, handleSendMessage, handleSelectNewUser
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
