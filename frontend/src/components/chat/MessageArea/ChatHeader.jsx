import React from 'react';
import { useChat } from '../../../context/ChatContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Users, Info, Hash, ChevronLeft, Phone, Video, MoreVertical } from "lucide-react";

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup, setShowGroupMembersModal } = useChat();

  if (!selectedUser && !selectedGroup) return null;

  const handleBack = () => {
    setSelectedUser(null);
    setSelectedGroup(null);
  };

  return (
    <div className="h-16 flex items-center justify-between px-3 sm:px-6 bg-white border-b border-slate-100 z-10 sticky top-0">
      <div className="flex items-center gap-3">
        {/* Back button for mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack} 
          className="md:hidden -ml-2 rounded-full hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </Button>

        {selectedUser ? (
          <>
            <div className="relative group cursor-pointer">
              <Avatar key={selectedUser.id} className="w-10 h-10 border border-slate-200">
                <AvatarImage src={selectedUser.image} />
                <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">{getInitials(selectedUser.name)}</AvatarFallback>
              </Avatar>
              <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${selectedUser.isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-800 leading-tight truncate max-w-[150px] sm:max-w-xs text-[15px]">
                {selectedUser.name}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedUser.isOnline ? 'text-green-500' : 'text-slate-400'}`}>
                {selectedUser.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="relative group cursor-pointer">
              <Avatar key={selectedGroup.id} className="w-10 h-10 border border-slate-200">
                <AvatarFallback className="bg-slate-100 text-slate-400 font-bold"><Hash className="w-5 h-5" /></AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-primaryColor border-2 border-white rounded-full" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-800 leading-tight truncate max-w-[150px] sm:max-w-xs text-[15px]">
                {selectedGroup.name}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate max-w-[150px]">
                {selectedGroup.description || "Group"}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-0.5 sm:gap-2">
        <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-50 transition-all">
          <Phone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-50 transition-all">
          <Video className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => selectedGroup && setShowGroupMembersModal(true)} 
          className="rounded-full text-slate-400 hover:bg-slate-50 transition-all"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
