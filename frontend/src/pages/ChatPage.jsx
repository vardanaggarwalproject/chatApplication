/* eslint-disable no-console */
import React, { useEffect, useState, useRef } from "react";
import socket from "../socket";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const { roomId } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Connect socket when component mounts
    socket.connect();

    const initializeChat = async () => {
      try {
        // Get current user from localStorage or make API call
        const storedUser = localStorage.getItem("user");
        if (!storedUser) {
          console.error("No user found, redirecting to login");
          navigate("/login");
          return;
        }

        const user = JSON.parse(storedUser);
        setCurrentUser(user);

        // Fetch group info
        const groupResponse = await axios.get(
          `http://${import.meta.env.VITE_BACKEND_URL}/api/groups/${roomId}`,
          { withCredentials: true }
        );
        setGroupInfo(groupResponse.data.group);
        setMembers(groupResponse.data.members);

        // Fetch message history
        const messagesResponse = await axios.get(
          `http://${
            import.meta.env.VITE_BACKEND_URL
          }/api/groups/${roomId}/messages`,
          { withCredentials: true }
        );
        setChat(messagesResponse.data.messages);

        // Join the room with user info
        socket.emit("join_group", {
          groupId: roomId,
          userId: user._id,
          username: user.email,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error initializing chat:", error);
        alert("Failed to load chat. Please try again.");
        navigate("/");
      }
    };

    initializeChat();

    // Socket listeners for group messages
    socket.on("receive_group_message", (data) => {
      // console.log(" Received group message:", data);
      // Add to chat if it's for the current group
      if (data.groupId === roomId) {
        setChat((prev) => [...prev, data]);
      }
    });

    // Also listen for direct message event in case it's used
    socket.on("receive_message", (data) => {
      // console.log("Received message:", data);
      setChat((prev) => [...prev, data]);
    });

    socket.on("user_joined", (data) => {
      console.log(" User joined:", data.message);
    });

    socket.on("user_left", (data) => {
      console.log("User left:", data.message);
    });

    socket.on("active_users", (users) => {
      console.log(" Active users:", users);
      setActiveUsers(users);
    });

    socket.on("user_typing", (data) => {
      setTypingUsers((prev) => {
        if (!prev.includes(data.username)) {
          return [...prev, data.username];
        }
        return prev;
      });
    });

    socket.on("user_stop_typing", (data) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.username));
    });

    socket.on("message_error", (data) => {
      // console.error(" Message error:", data.error);
      alert("Failed to send message: " + data.error);
    });

    return () => {
      // Clean up socket listeners
      socket.off("receive_message");
      socket.off("receive_group_message");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("active_users");
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("message_error");

      // Leave group room
      if (roomId) {
        socket.emit("leave_group", { groupId: roomId });
      }
    };
  }, [roomId, navigate]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = () => {
    if (!message.trim() || !currentUser) return;

    const msgData = {
      groupId: roomId,
      userId: currentUser._id || currentUser.id,
      username: currentUser.email,
      content: message.trim(),
    };

    console.log("📤 Sending group message:", msgData);
    // Use send_group_message for group chats
    socket.emit("send_group_message", msgData);

    // Optimistically add message to UI immediately
    const tempMessage = {
      id: Date.now().toString(),
      senderId: currentUser._id || currentUser.id,
      groupId: roomId,
      content: message.trim(),
      createdAt: new Date().toISOString(),
      senderName: currentUser.name,
      senderEmail: currentUser.email,
    };
    setChat((prev) => [...prev, tempMessage]);
    setMessage("");

    // Stop typing indicator
    socket.emit("stop_typing", {
      groupId: roomId,
      username: currentUser.email,
    });
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!currentUser) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing event
    socket.emit("typing", {
      groupId: roomId,
      username: currentUser.email,
    });

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        groupId: roomId,
        username: currentUser.email,
      });
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {groupInfo?.name}
            </h2>
            {groupInfo?.description && (
              <p className="text-sm text-slate-600">{groupInfo.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg hover:from-cyan-500 hover:to-blue-600 font-semibold transition-all"
          >
            ← Back to Groups
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-slate-50 to-blue-50">
          {chat && chat.length > 0 ? (
            chat.map((msg, i) => {
              // Handle both _id and id field names
              const msgSenderId = msg.senderId || msg.userId;
              const currentUserId = currentUser?._id || currentUser?.id;
              const isOwnMessage = msgSenderId === currentUserId;

              return (
                <div
                  key={msg.id || i}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                      isOwnMessage
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    {!isOwnMessage && (
                      <p
                        className={`text-xs font-semibold mb-1 ${
                          isOwnMessage ? "text-cyan-100" : "text-slate-600"
                        }`}
                      >
                        {msg.senderName || "Unknown"}
                      </p>
                    )}
                    <p className="break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-cyan-100" : "text-slate-500"
                      }`}
                    >
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-2 text-sm text-slate-600 italic bg-white border-t">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
            typing...
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t px-6 py-4 shadow-lg">
          <div className="flex gap-2">
            <input
              value={message}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border-2 border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-cyan-500 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - Members */}
      <div className="w-64 bg-white border-l p-4 shadow-lg">
        <h3 className="font-bold mb-4 text-slate-800">
          Members ({members.length})
        </h3>
        <div className="space-y-2">
          {members.map((member) => {
            const isOnline = activeUsers.some((u) => u.userId === member.id);
            return (
              <div
                key={member.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
