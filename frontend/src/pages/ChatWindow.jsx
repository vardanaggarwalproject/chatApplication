import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChatProvider, useChat } from '../context/ChatContext';
import { useChatSocket } from '../hooks/useChatSocket';
import ChatSidebar from '../components/chat/Sidebar/ChatSidebar';
import MessageAreaContainer from '../components/chat/MessageArea/MessageAreaContainer';
import ModalsContainer from '../components/chat/Modals/ModalsContainer';
import { useTabSynchronization } from '../hooks/useTabSynchronization';
import { useOnlineStatusManager } from '../hooks/useOnlineStatusManager';

const ChatLayout = () => {
    const { userId, groupId } = useParams();
    const navigate = useNavigate();
    const { 
        currentUser, 
        users,
        groups,
        allUsers,
        setSelectedUser, 
        selectedUser, 
        selectedGroup,
        setSelectedGroup,
        loadingUsers,
        loadingGroups,
        handleSelectNewUser
    } = useChat();

    // Sync URL with Context
    React.useEffect(() => {
        // Don't sync until users and groups are loaded
        if (loadingUsers || loadingGroups) return;

        if (userId) {
            const standardizedUserId = String(userId).toLowerCase();
            const currentSelectedId = selectedUser ? String(selectedUser.id).toLowerCase() : null;

            if (currentSelectedId !== standardizedUserId) {
                // Find in active users first
                const user = users.find(u => String(u.id).toLowerCase() === standardizedUserId);
                if (user) {
                    setSelectedGroup(null);
                    setSelectedUser(user);
                } else {
                    // Try to find in allUsers (maybe hasn't been added to sidebar yet)
                    const userFromAll = allUsers.find(u => String(u.id).toLowerCase() === standardizedUserId);
                    if (userFromAll) {
                        handleSelectNewUser(userFromAll);
                    } else {
                        // User not found anywhere, redirect to chat home
                        console.warn(`User ${userId} not found, redirecting to /chat`);
                        navigate('/chat', { replace: true });
                    }
                }
            }
        } else if (groupId) {
            const standardizedGroupId = String(groupId).toLowerCase();
            const currentSelectedGroupId = selectedGroup ? String(selectedGroup.id).toLowerCase() : null;

            if (currentSelectedGroupId !== standardizedGroupId) {
                const group = groups.find(g => String(g.id).toLowerCase() === standardizedGroupId);
                if (group) {
                    setSelectedUser(null);
                    setSelectedGroup(group);
                } else {
                    // Group not found, redirect
                    console.warn(`Group ${groupId} not found, redirecting to /chat`);
                    navigate('/chat', { replace: true });
                }
            }
        } else {
            // No params in URL, ensure context selection is cleared
            if (selectedUser || selectedGroup) {
                setSelectedUser(null);
                setSelectedGroup(null);
            }
        }
    }, [userId, groupId, users, groups, allUsers, loadingUsers, loadingGroups, navigate, setSelectedUser, setSelectedGroup, handleSelectNewUser, selectedUser, selectedGroup]); 
    // Note: selectedUser and selectedGroup are used inside but we comparison check to break loops


    // Initialize socket connection and listeners
    useChatSocket();
    // Initialize tab sync (logout across tabs)
    useTabSynchronization();
    // Initialize profile synchronization

    // Initialize online status manager
    useOnlineStatusManager(currentUser?.id, currentUser);

    const isChatSelected = selectedUser || selectedGroup;

    return (
        <div className="flex w-full h-screen overflow-hidden bg-slate-50/50">
            {/* Sidebar - Responsive logic restored and styled */}
            <div className={`
                ${isChatSelected ? 'hidden md:flex' : 'flex'} 
                w-full md:w-80 lg:w-[380px] flex-shrink-0 flex-col h-full border-r border-slate-100 bg-white/80 backdrop-blur-xl transition-all duration-300 ease-in-out z-30
            `}>
                <ChatSidebar />
            </div>

            {/* Main Chat Area - Responsive logic with themed background */}
            <div className={`
                ${isChatSelected ? 'flex' : 'hidden md:flex'} 
                flex-1 flex flex-col h-full overflow-hidden relative bg-[#f8fafc]
            `}>
                {/* Decorative Blobs to match Home Page aesthetic */}
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primaryColor/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-secondaryColor/10 rounded-full blur-[100px] pointer-events-none -z-10" />
                
                <MessageAreaContainer />
            </div>

            {/* Global Modals */}
            <ModalsContainer />
        </div>
    );
};

const ChatWindow = () => {
    return (
        <ChatProvider>
            <ChatLayout />
        </ChatProvider>
    );
};

export default ChatWindow;
