import React, { useState, useMemo } from "react";
import { Search, X, Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Modal for adding/removing members to a group
 * Admin can add new users and remove existing members
 *
 * Props:
 * - isOpen: boolean - controls modal visibility
 * - onOpenChange: (open: boolean) => void - callback to change modal state
 * - allUsers: array - list of all available users
 * - groupMembers: array - current group members
 * - onAddMember: (userId) => void - callback when admin adds a member
 * - onRemoveMember: (userId) => void - callback when admin removes a member
 * - isAdmin: boolean - whether current user is group admin
 * - isLoading: boolean - loading state
 */
const AddGroupMembersModal = ({
  isOpen,
  onOpenChange,
  allUsers = [],
  groupMembers = [],
  onAddMember,
  onRemoveMember,
  isAdmin = false,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("add"); // "add" or "manage"

  // Get users that are not in the group (for adding)
  const availableUsers = useMemo(() => {
    console.log("🔍 [ADD MEMBERS MODAL] Calculating available users");
    const memberIds = new Set(groupMembers.map((m) => String(m.id).toLowerCase()));
    const available = allUsers.filter((user) => !memberIds.has(String(user.id).toLowerCase()));
    console.log(`   Available to add: ${available.length}`);
    return available;
  }, [allUsers, groupMembers]);

  // Filter available users based on search
  const filteredAvailableUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [searchQuery, availableUsers]);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddMember = (user) => {
    console.log("📝 [ADD MEMBERS MODAL] User selected to add:", user.name);
    onAddMember(user);
  };

  const handleRemoveMember = (user) => {
    console.log("🗑️ [ADD MEMBERS MODAL] User selected to remove:", user.name);
    onRemoveMember(user.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[95vw] max-h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 p-3 sm:p-4 z-20">
          <DialogHeader className="mb-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-[#040316]">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-darkPurple" />
              Manage Group Members
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm mt-1 sm:mt-2">
              {isAdmin
                ? "Add new members or remove existing members from this group"
                : "View current group members"}
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          {isAdmin && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setActiveTab("add")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "add"
                    ? "bg-darkPurple text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Add Members
              </button>
              <button
                onClick={() => setActiveTab("manage")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "manage"
                    ? "bg-darkPurple text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Manage ({groupMembers.length})
              </button>
            </div>
          )}

          {/* Search Bar */}
          {activeTab === "add" && (
            <div className="mt-3 sm:mt-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.trim())}
                placeholder="Search users by name or email..."
                className="pl-10 bg-slate-50 border-slate-200 focus:border-darkPurple focus:ring-darkPurple h-9 sm:h-10 text-sm"
              />
            </div>
          )}
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-slate-500">Loading...</p>
            </div>
          ) : activeTab === "add" ? (
            // ADD MEMBERS TAB
            <>
              {filteredAvailableUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-48 text-center p-4">
                  {availableUsers.length === 0 ? (
                    <>
                      <p className="text-slate-500 font-medium">All users are already members</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Everyone you can add is already in this group
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
                  {filteredAvailableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border shadow-sm">
                          <AvatarImage
                            src={user?.image || ""}
                            alt="User Avatar"
                          />
                          <AvatarFallback className="bg-slate-100 text-slate-500 font-semibold text-xs sm:text-sm border-none shadow-none">
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
                        <p className="text-xs text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Add Button */}
                      {isAdmin && (
                        <button
                          onClick={() => handleAddMember(user)}
                          className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 text-darkPurple hover:text-darkPurple transition-colors"
                          title="Add member"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // MANAGE MEMBERS TAB
            <>
              {groupMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-48 text-center p-4">
                  <p className="text-slate-500 font-medium">No members in this group</p>
                </div>
              ) : (
                <div className="space-y-0 px-2 py-2 sm:px-3 sm:py-3">
                  {groupMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border shadow-sm">
                          <AvatarImage
                            src={member?.image || ""}
                            alt="User Avatar"
                          />
                          <AvatarFallback className="bg-slate-100 text-slate-500 font-semibold text-xs sm:text-sm border-none shadow-none">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full absolute bottom-0 right-0 border-2 border-white" />
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {member.email}
                        </p>
                        <p className="text-xs text-darkPurple font-medium">
                          {member.role === "admin" ? "👑 Admin" : "Member"}
                        </p>
                      </div>

                      {/* Remove Button (Admin only, not for creator) */}
                      {isAdmin && member.role !== "admin" && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
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

export default AddGroupMembersModal;
