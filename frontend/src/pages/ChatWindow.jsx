import React from 'react';
import { ChatProvider, useChat } from '../context/ChatContext';
import { useChatSocket } from '../hooks/useChatSocket';
import ChatSidebar from '../components/chat/Sidebar/ChatSidebar';
import MessageAreaContainer from '../components/chat/MessageArea/MessageAreaContainer';
import ModalsContainer from '../components/chat/Modals/ModalsContainer';
import { useTabSynchronization } from '../hooks/useTabSynchronization';

import { useOnlineStatusManager } from '../hooks/useOnlineStatusManager';

const ChatLayout = () => {
    const { 
        currentUser, 
        setUsers, 
        setSelectedUser, 
        selectedUser, 
        selectedGroup,
        setSelectedGroup 
    } = useChat();
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
