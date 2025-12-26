import React, { useEffect, useRef } from 'react';
import { useChat } from '../../../context/ChatContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from '../../Logo';

const formatTime = (dateString) => {
  if (!dateString) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));
  } catch (e) {
    return "";
  }
};

const MessageSkeleton = ({ side }) => (
  <div className={`flex ${side === 'right' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`flex gap-2 max-w-[70%] ${side === 'right' ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse flex-shrink-0" />
      <div className={`h-10 w-32 bg-slate-100 animate-pulse rounded-2xl ${side === 'right' ? 'rounded-tr-none' : 'rounded-tl-none'}`} />
    </div>
  </div>
);

const MessageList = () => {
  const { activeMessages, currentUser, loadingMessages, pendingSelection, selectedUser, selectedGroup } = useChat();
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastMessageCount = useRef(0);
  const lastChatId = useRef(null);

  const currentChatId = selectedUser?.id || selectedGroup?.id;

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    } else if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (!loadingMessages && !pendingSelection && activeMessages.length > 0) {
      const isChatSwitch = lastChatId.current !== currentChatId;
      const behavior = isChatSwitch ? 'auto' : 'smooth';
      
      // Perform initial scroll
      scrollToBottom(behavior);

      // Multiple attempts to ensure we hit the bottom as images/layouts stabilize
      const timers = [
          setTimeout(() => scrollToBottom(behavior), 100),
          setTimeout(() => scrollToBottom(behavior), 300),
          setTimeout(() => scrollToBottom('auto'), 600), // Final forced sync
      ];

      lastMessageCount.current = activeMessages.length;
      lastChatId.current = currentChatId;

      return () => timers.forEach(clearTimeout);
    } else if (loadingMessages || pendingSelection) {
        lastMessageCount.current = 0;
    }
  }, [activeMessages, loadingMessages, pendingSelection, currentChatId]);

  if (!selectedUser && !selectedGroup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-transparent text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8"
        >
          <Logo className="w-24 h-24" />
        </motion.div>
        <h3 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">VibeMesh Chat</h3>
        <p className="text-slate-500 max-w-xs font-medium">Pick a thread to start weaving your connections.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
      <AnimatePresence mode="wait">
        {pendingSelection || loadingMessages ? (
          <motion.div 
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 p-6 overflow-y-auto"
          >
            {[1, 2, 3, 4, 5, 6].map((_, i) => (
              <React.Fragment key={i}>
                <MessageSkeleton side={i % 2 === 0 ? "left" : "right"} />
              </React.Fragment>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            ref={scrollRef} 
            className="flex-1 p-4 sm:p-8 overflow-y-auto flex flex-col gap-4 sm:gap-4 z-10 h-full scroll-smooth"
          >
            {activeMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm font-bold uppercase tracking-widest animate-pulse opacity-40">
                <Hash className="w-8 h-8 mb-2" />
                No messages yet
              </div>
            ) : (
              <>
                {activeMessages.map((msg, index) => {
                  const isMe = String(msg.senderId) === String(currentUser?.id || currentUser?._id);
                  const showAvatar = index === 0 || String(activeMessages[index - 1]?.senderId) !== String(msg.senderId);
                  const isLastFew = index >= activeMessages.length - 3;

                  return (
                    <motion.div
                      initial={false}
                      animate={false}
                      key={msg.id || index} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}
                    >
                      <div className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="w-9 flex-shrink-0 self-end mb-1">
                          {showAvatar && !isMe && (
                            <Avatar className="w-9 h-9 border-2 border-white shadow-md ring-2 ring-primaryColor/10">
                              <AvatarImage src={msg.senderImage} />
                              <AvatarFallback className="text-[10px] bg-slate-100 font-black text-slate-400">{msg.senderUserName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1`}>
                          {showAvatar && !isMe && selectedGroup && (
                            <span className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">
                              {msg.senderName || msg.senderUserName}
                            </span>
                          )}
                          <div className={`group relative px-4 py-2.5 rounded-[18px] text-[14px] shadow-sm transition-all hover:shadow-md ${
                            isMe 
                              ? 'bg-slate-100 text-slate-800 rounded-tr-none' 
                              : 'bg-deepNavy text-white rounded-tl-none'
                          }`}>
                            <div className="break-all leading-tight">
                              {msg.content}
                            </div>
                            <div className={`text-[9px] mt-1 opacity-60 font-bold flex items-center gap-1.5 ${isMe ? 'text-slate-500 justify-end' : 'text-white/80 justify-start'}`}>
                                {formatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={messagesEndRef} className="h-4 w-full flex-shrink-0" />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;
