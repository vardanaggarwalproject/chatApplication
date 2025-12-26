import React, { useState, useMemo } from "react";
import { Search, X, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebounce } from "@/hooks/useDebounce";

/**
 * Reusable modal component for adding new conversations
 * Shows users that haven't been chatted with yet or added as contacts
 *
 * Props:
 * - isOpen: boolean - controls modal visibility
 * - onOpenChange: (open: boolean) => void - callback to change modal state
 * - allUsers: array - list of all users (should include all available users)
 * - chatUsers: array - list of users already in conversations
 * - onUserSelect: (user) => void - callback when a user is selected
 * - isLoading: boolean - loading state
 */
const AddNewConversationModal = ({
  isOpen,
  onOpenChange,
  allUsers = [],
  chatUsers = [],
  onUserSelect,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Get users not in current chat list (neither hasChat nor addedForChat)
  const availableUsers = useMemo(() => {
    console.log("🔍 [MODAL] Calculating available users");
    console.log(`   allUsers count: ${allUsers.length}`);
    console.log(`   chatUsers count: ${chatUsers.length}`);
    console.log(`   allUsers:`, allUsers.map(u => ({ id: u.id, name: u.name, hasChat: u.hasChat, addedForChat: u.addedForChat })));
    console.log(`   chatUsers:`, chatUsers.map(u => ({ id: u.id, name: u.name, hasChat: u.hasChat, addedForChat: u.addedForChat })));

    const chatUserIds = new Set(chatUsers.map((u) => String(u.id)));
    const available = allUsers.filter((user) => !chatUserIds.has(String(user.id)));

    console.log(`   Available users after filter: ${available.length}`);
    console.log(`   Available:`, available.map(u => ({ id: u.id, name: u.name })));

    return available;
  }, [allUsers, chatUsers]);

  // Filter available users based on search
  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return availableUsers;

    const query = debouncedSearchQuery.toLowerCase();
    return availableUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [debouncedSearchQuery, availableUsers]);

  const handleUserSelect = (user) => {
    console.log("📝 [ADD CONVERSATION] User selected:", user.name);
    onUserSelect(user);
    setSearchQuery(""); // Clear search
    onOpenChange(false); // Close modal
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 p-3 sm:p-4 z-20">
          <DialogHeader className="mb-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-[#040316]">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-darkPurple" />
              Start New Conversation
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
              Select a user to start chatting with them
            </DialogDescription>
          </DialogHeader>

          {/* Search Bar */}
          <div className="mt-3 sm:mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.trim())}
              placeholder="Search users by name or email..."
              className="pl-10 bg-slate-50 border-slate-200 focus:border-darkPurple focus:ring-darkPurple h-9 sm:h-10 text-sm"
            />
          </div>
        </div>

        {/* Users List - Scrollable Container with Fixed Height */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-500">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-48 text-center p-4">
              {availableUsers.length === 0 ? (
                <>
                  <p className="text-slate-500 font-medium">No new users available</p>
                  <p className="text-sm text-slate-400 mt-1">
                    You've already started conversations with everyone
                  </p>
                </>
              ) : (
                <>
                  <p className="text-slate-500 font-medium">No users found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Try adjusting your search query
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-0 px-2 py-2 sm:px-3 sm:py-3">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border shadow-sm">
                      <AvatarImage
                        src={user?.image || ""}
                        alt="User Avatar"
                      />
                      <AvatarFallback className="bg-slate-100 text-slate-500 font-semibold text-xs sm:text-sm">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {user.isOnline && (
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full absolute bottom-0 right-0 border-2 border-white" />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate line-clamp-1">
                      {user.email}
                    </p>
                    {user.isOnline && (
                      <p className="text-xs text-green-600 font-medium hidden sm:block">Online</p>
                    )}
                  </div>

                  {/* Plus Icon */}
                  <div className="flex-shrink-0 text-slate-400 hover:text-darkPurple transition-colors">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-sm"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddNewConversationModal;
