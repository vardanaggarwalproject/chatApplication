import React, { useState, useEffect, useMemo } from 'react';
import { useChat } from '../../../context/ChatContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserMinus, UserPlus, LogOut, Trash2 } from "lucide-react";
import axiosInstance from '../../../utils/axiosConfig';
import AddGroupMembersModal from '@/components/AddGroupMembersModal';

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const GroupMembersModal = ({ isOpen, onClose, group }) => {
  const { currentUser, fetchGroups, setSelectedGroup, allUsers } = useChat();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  // Derive enriched members with the latest profile data from allUsers and currentUser
  const enrichedMembers = useMemo(() => {
    return members.map(member => {
      // If it's the current user, use their global profile data
      if (currentUser && String(member.id).toLowerCase() === String(currentUser.id).toLowerCase()) {
        return {
          ...member,
          name: currentUser.name,
          image: currentUser.image,
          email: currentUser.email,
          isOnline: true
        };
      }

      // Look up other users in the allUsers context
      const globalUser = allUsers.find(u => String(u.id).toLowerCase() === String(member.id).toLowerCase());
      if (globalUser) {
        return {
          ...member,
          name: globalUser.name,
          image: globalUser.image,
          email: globalUser.email,
          isOnline: globalUser.isOnline
        };
      }
      return member;
    });
  }, [members, allUsers, currentUser]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/groups/${group.id}`);
      setMembers(response.data.members || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (group?.id) fetchMembers();
  }, [group?.id]);

  const handleAddMember = async (user) => {
    try {
      console.log(`👥 [ADD MEMBER] Adding ${user.name} to group ${group.id}`);
      await axiosInstance.post(`/api/groups/${group.id}/members`, { userId: user.id });
      fetchMembers();
      fetchGroups();
    } catch (error) {
      console.error("Error adding member:", error);
      alert(error.response?.data?.error || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      console.log(`🗑️ [REMOVE MEMBER] Removing user ${userId} from group ${group.id}`);
      await axiosInstance.delete(`/api/groups/${group.id}/members/${userId}`);
      fetchMembers();
      fetchGroups();
    } catch (error) {
      console.error("Error removing member:", error);
      alert(error.response?.data?.error || "Failed to remove member");
    }
  };

  const handleExit = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      console.log(`👋 [EXIT GROUP] User ${currentUser.id} leaving group ${group.id}`);
      await axiosInstance.post(`/api/groups/${group.id}/exit`);
      fetchGroups();
      setSelectedGroup(null);
      onClose();
    } catch (error) {
      console.error("Error exiting group:", error);
      alert(error.response?.data?.error || "Failed to exit group");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("CRITICAL: This will delete the group and all messages. Proceed?")) return;
    try {
      console.log(`🗑️ [DELETE GROUP] Deleting group ${group.id}`);
      await axiosInstance.delete(`/api/groups/${group.id}`);
      fetchGroups();
      setSelectedGroup(null);
      onClose();
    } catch (error) {
      console.error("Error deleting group:", error);
      alert(error.response?.data?.error || "Failed to delete group");
    }
  };

  // Check if current user is admin (role === "admin")
  const currentUserMember = members.find(m => String(m.id).toLowerCase() === String(currentUser.id).toLowerCase());
  const isAdmin = currentUserMember?.role === "admin";
  const isCreator = group.createdBy === currentUser.id;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex justify-between items-center text-xl font-black text-slate-900">
                <span>{group.name} - Members</span>
              </DialogTitle>
              {group.description && (
                <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                  {group.description}
                </p>
              )}
            </DialogHeader>

          <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primaryColor" /></div>
            ) : (
              enrichedMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10 border shadow-sm">
                      <AvatarImage src={member.image} />
                      <AvatarFallback className="text-white bg-slate-400 font-semibold text-xs sm:text-sm">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    {member.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                    )}
                  </div>
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
                  {/* Admins can remove members (but not other admins or themselves) */}
                  {isAdmin && member.id !== currentUser.id && member.role !== "admin" && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveMember(member.id)} 
                      className="text-red-500 hover:bg-red-50"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isAdmin ? (
                <>
                <Button variant="outline" className="flex-1" onClick={() => setShowAddMember(true)}>
                    <UserPlus className="w-4 h-4 mr-2" /> Add Member
                </Button>
                {isCreator && (
                  <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                  </Button>
                )}
                </>
            ) : (
                <Button variant="destructive" className="flex-1" onClick={handleExit}>
                    <LogOut className="w-4 h-4 mr-2" /> Leave Group
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddGroupMembersModal
        isOpen={showAddMember}
        onOpenChange={setShowAddMember}
        allUsers={allUsers}
        groupMembers={enrichedMembers}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        isAdmin={isAdmin}
        isLoading={loading}
      />
    </>
  );
};

export default GroupMembersModal;
