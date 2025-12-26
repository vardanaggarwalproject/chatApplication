import React, { useState } from 'react';
import { useChat } from '../../../context/ChatContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Plus, LogOut, Settings, UserPlus, Users, Hash, MessageSquare, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Logo from '../../Logo';

const formatTimeAgo = (dateString) => {
  if (!dateString) return "";
  
  // Use a Date object, parsing the ISO string from backend correctly
  const date = new Date(dateString);
  const now = new Date();
  
  // Check if invalid date
  if (isNaN(date.getTime())) return "Invalid Time";

  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) {
    // Matches the bubble format (24h)
    return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
  }
  
  if (isYesterday) {
    return "Yesterday";
  }

  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffInDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const SidebarItemSkeleton = () => (
    <div className="flex items-center gap-3.5 px-3 py-3.5 rounded-2xl animate-pulse">
        <div className="w-[52px] h-[52px] rounded-full bg-slate-100 flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
        </div>
    </div>
);

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

import { useDebounce } from '../../../hooks/useDebounce';

const ChatSidebar = () => {
  const {
    currentUser,
    filteredUsers,
    filteredGroups,
    searchQuery,
    setSearchQuery,
    selectedUser,
    setSelectedUser,
    selectedGroup,
    setSelectedGroup,
    setShowAddConversationModal,
    setShowCreateGroup,
    setShowEditProfile,
    setLoadingMessages,
    setPendingSelection,
    loadingUsers,
    loadingGroups,
    fetchDirectMessages,
    fetchGroupMessages
  } = useChat();

  const [activeTab, setActiveTab] = useState("users");
  
  // Local state for debounced search
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debouncedSearch = useDebounce(localSearch, 500);

  // Sync debounced value to context
  React.useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  // Sync context value to local (in case cleared externally)
  React.useEffect(() => {
    if (searchQuery !== debouncedSearch && searchQuery !== localSearch) {
       setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  const handleSelectUser = (user) => {
    if (selectedUser?.id && String(selectedUser.id).toLowerCase() === String(user.id).toLowerCase()) return;
    setSelectedGroup(null);
    setSelectedUser(user);
  };

  const handleSelectGroup = (group) => {
    if (selectedGroup?.id && String(selectedGroup.id).toLowerCase() === String(group.id).toLowerCase()) return;
    setSelectedUser(null);
    setSelectedGroup(group);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-slate-100">
      {/* Sidebar Header - Logo & Profile */}
      <div className="p-4 sm:p-6 pb-4 flex items-center justify-between">
        <div className="flex flex-col">
          <Logo showText={true} textClassName="text-2xl font-black text-slate-900 tracking-tight" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative cursor-pointer group">
              <Avatar className="w-14 h-14 border-4 border-slate-50 group-hover:border-slate-100 transition-all shadow-md">
                {currentUser?.image ? (
                  <AvatarImage src={currentUser.image} alt={currentUser.name} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primaryColor to-secondaryColor text-slate-800 text-sm font-black">
                    {getInitials(currentUser?.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-3xl shadow-2xl border-slate-100 p-0 z-[100] bg-white overflow-hidden">
            {/* Header with User Info */}
            <div className="p-5 border-b border-slate-50 flex items-center gap-4 bg-slate-50/20">
              <div className="relative">
                <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                  {currentUser?.image ? (
                    <AvatarImage src={currentUser.image} alt={currentUser.name} />
                  ) : (
                    <AvatarFallback className="bg-primaryColor/10 text-primaryColor font-bold">
                       {getInitials(currentUser?.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-slate-900 truncate text-[14px]">{currentUser?.name}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </div>
                <span className="text-[11px] text-slate-400 font-bold truncate">{currentUser?.email || "No email provided"}</span>
              </div>
            </div>

            <div className="p-2">
                <DropdownMenuItem onClick={() => setShowEditProfile(true)} className="rounded-2xl py-3 cursor-pointer focus:bg-slate-50 group">
                    <User className="mr-3 h-4 w-4 text-purple-600" /> 
                    <span className="font-bold text-slate-700 text-[13px]">Edit Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="rounded-2xl py-3 text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer group">
                    <LogOut className="mr-3 h-4 w-4" /> 
                    <span className="font-bold text-[13px]">Log out</span>
                </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search Section */}
      <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          <Input
            placeholder="Search conversations..."
            className="pl-11 bg-slate-50 border-slate-100 rounded-2xl focus-visible:ring-0 focus-visible:border-slate-200 focus-visible:bg-white transition-all text-sm h-12 shadow-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowAddConversationModal(true)} 
          className="rounded-2xl w-12 h-12 bg-[#040316] text-white shadow-lg active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="flex-1 flex flex-col min-h-0" onValueChange={setActiveTab}>
        <div className="px-4 sm:px-6 py-2">
          <TabsList className="w-full grid grid-cols-2 bg-transparent p-0 gap-4 h-12">
            <TabsTrigger 
              value="users" 
              className="rounded-2xl border-2 border-slate-50 data-[state=active]:bg-white data-[state=active]:border-[#ABD4FF]/30 data-[state=active]:text-[#ABD4FF] data-[state=active]:shadow-sm font-black text-[11px] uppercase tracking-[0.2em] transition-all h-full"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Users
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="groups" 
              className="rounded-2xl border-2 border-slate-50 data-[state=active]:bg-white data-[state=active]:border-[#5B21B6]/30 data-[state=active]:text-[#5B21B6] data-[state=active]:shadow-sm font-black text-[11px] uppercase tracking-[0.2em] transition-all h-full"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Groups
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Content Section */}
        <div className="px-4 sm:px-6 pb-3 flex items-center justify-between">
            <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">
                {activeTab === 'users' ? `Directs (${filteredUsers.length})` : `My Groups (${filteredGroups.length})`}
            </h2>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => activeTab === 'users' ? setShowAddConversationModal(true) : setShowCreateGroup(true)}
                className="h-8 rounded-lg bg-deepNavy text-white text-[10px] font-black uppercase tracking-widest px-3 shadow-md active:scale-95 transition-all"
            >
                <Plus className="w-3 h-3 mr-1.5" />
                New
            </Button>
        </div>

        <TabsContent value="users" className="flex-1 overflow-y-auto m-0 scrollbar-hide">
          {loadingUsers ? (
            <div className="flex flex-col gap-0.5 px-3">
              {[1, 2, 3, 4, 5, 6].map(i => <SidebarItemSkeleton key={i} />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center opacity-30">
              <MessageSquare className="w-10 h-10 mb-3" />
              <p className="text-xs font-bold uppercase tracking-tighter">Start your first chat</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 px-3">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`group relative flex items-center gap-3.5 px-3 py-3.5 rounded-2xl transition-all duration-300 ${String(selectedUser?.id).toLowerCase() === String(user.id).toLowerCase() ? 'bg-slate-50 shadow-sm' : 'hover:bg-slate-50/50'}`}
                >
                  <div className="relative">
                    <Avatar className={`w-[52px] h-[52px] border-2 shadow-sm transition-all duration-500 ${String(selectedUser?.id).toLowerCase() === String(user.id).toLowerCase() ? 'border-primaryColor' : 'border-white group-hover:border-slate-200'}`}>
                      <AvatarImage src={user.image} />
                      <AvatarFallback className="bg-slate-100 text-slate-400 font-black text-sm">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    {user.isOnline && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-lg" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className={`font-black truncate text-[15px] ${String(selectedUser?.id).toLowerCase() === String(user.id).toLowerCase() ? 'text-slate-900' : 'text-slate-800'}`}>{user.name}</span>
                      {user.lastMessage && <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap pt-1">{formatTimeAgo(user.lastMessage.createdAt)}</span>}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-[13px] truncate flex-1 font-medium ${String(selectedUser?.id).toLowerCase() === String(user.id).toLowerCase() ? 'text-slate-600' : 'text-slate-500'}`}>{user.lastMessage?.content || "Message this person..."}</p>
                      {user.unreadCount > 0 && <div className="bg-primaryColor text-slate-800 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-primaryColor/20 animate-in zoom-in-50 duration-300">{user.unreadCount}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="flex-1 overflow-y-auto m-0 scrollbar-hide">
          {loadingGroups ? (
            <div className="flex flex-col gap-0.5 px-3">
              {[1, 2, 3, 4].map(i => <SidebarItemSkeleton key={i} />)}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center opacity-30">
              <Users className="w-10 h-10 mb-3" />
              <p className="text-xs font-bold uppercase tracking-tighter">No groups found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 px-3">
              {filteredGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => handleSelectGroup(group)}
                  className={`group relative flex items-center gap-3.5 px-3 py-3.5 rounded-2xl transition-all duration-300 ${selectedGroup?.id === group.id ? 'bg-slate-50 shadow-sm' : 'hover:bg-slate-50/50'}`}
                >
                  <Avatar className={`w-[52px] h-[52px] border-2 shadow-sm bg-slate-50 transition-all duration-500 ${selectedGroup?.id === group.id ? 'border-primaryColor' : 'border-white group-hover:border-slate-200'}`}>
                    <AvatarFallback className="bg-transparent shadow-none text-slate-800"><Hash className="w-6 h-6" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className={`font-black truncate text-[15px] ${selectedGroup?.id === group.id ? 'text-slate-900' : 'text-slate-800'}`}>{group.name}</span>
                      {group.lastMessage && <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap pt-1">{formatTimeAgo(group.lastMessage.createdAt)}</span>}
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className={`text-[13px] truncate flex-1 font-medium ${selectedGroup?.id === group.id ? 'text-slate-600' : 'text-slate-500'}`}>
                        {group.lastMessage ? (
                          <>
                            <span className="font-bold text-slate-800/80">{group.lastMessage.senderName}:</span> {group.lastMessage.content}
                          </>
                        ) : "No activity in this group"}
                      </p>
                      {group.unreadCount > 0 && <div className="bg-primaryColor text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-primaryColor/20 animate-in zoom-in-50 duration-300">{group.unreadCount}</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChatSidebar;
