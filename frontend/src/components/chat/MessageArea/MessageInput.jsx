import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../../context/ChatContext';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Smile, Paperclip } from "lucide-react";

const MessageInput = () => {
  const { handleSendMessage, selectedUser, selectedGroup } = useChat();
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const handler = () => {
      if (textareaRef.current) textareaRef.current.focus();
    };
    window.addEventListener('focusMessageInput', handler);
    return () => window.removeEventListener('focusMessageInput', handler);
  }, []);

  const onSend = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    handleSendMessage(text);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  if (!selectedUser && !selectedGroup) return null;

  return (
    <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
      <form onSubmit={onSend} className="max-w-6xl mx-auto">
        <div className="flex items-center bg-slate-50 rounded-[24px] border border-slate-200 px-3 py-1 transition-all focus-within:shadow-md focus-within:border-slate-300">
          <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 w-10 h-10">
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-32 px-2 py-3 bg-transparent border-none focus-visible:ring-0 resize-none overflow-hidden text-[14px] text-slate-700 placeholder:text-slate-400"
          />

          <div className="flex items-center gap-1 ml-1">
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 h-10 w-10">
                <Smile className="w-5 h-5" />
            </Button>
            <Button 
                type="submit" 
                disabled={!text.trim()} 
                className="rounded-full w-10 h-10 p-0 flex-shrink-0 bg-slate-900 hover:bg-slate-800 text-white transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-slate-900 shadow-lg"
            >
                <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
