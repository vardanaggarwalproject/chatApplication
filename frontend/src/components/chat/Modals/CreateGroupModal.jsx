import React, { useState } from 'react';
import { useChat } from '../../../context/ChatContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Search } from "lucide-react";
import axiosInstance from '../../../utils/axiosConfig';
import socket from '../../../socket';

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const CreateGroupModal = ({ isOpen, onClose }) => {
  const { allUsers, fetchGroups } = useChat();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const toggleMember = (id) => {
    const standardizedId = String(id).toLowerCase();
    setSelectedMembers(prev => prev.some(mid => mid.toLowerCase() === standardizedId) 
      ? prev.filter(mid => mid.toLowerCase() !== standardizedId) 
      : [...prev, standardizedId]);
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedMembers.length === 0) return;
    setLoading(true);
    try {
      const response = await axiosInstance.post('/api/groups/create', {
        name: name.trim(),
        description: description.trim(),
        memberIds: selectedMembers
      });
      
      const { group, memberIds } = response.data;
      
      console.log(`✅ [GROUP CREATED] Group ${group.id} created successfully`);
      
      // Immediately join the group room via socket for real-time messaging
      if (socket && socket.connected) {
        console.log(`🔌 [SOCKET] Joining group room: group:${group.id}`);
        socket.emit("join_group", { groupId: group.id });
      }
      
      // Refresh groups list to show the new group
      fetchGroups();
      
      onClose();
      // Reset
      setName("");
      setDescription("");
      setSelectedMembers([]);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Marketing Team..." />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="desc">Description (Optional)</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the group..." />
          </div>

          <div className="space-y-2">
            <Label>Select Members</Label>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
            </div>
            
            <div className="border rounded-lg max-h-[200px] overflow-y-auto divide-y">
              {filteredUsers.map(user => (
                <div key={user.id} onClick={() => toggleMember(user.id)} className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer transition-colors">
                  <div className="relative">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.image} />
                      <AvatarFallback className="bg-slate-100 text-slate-500 text-[10px] font-bold">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium">{user.name}</span>
                  {selectedMembers.some(mid => mid.toLowerCase() === String(user.id).toLowerCase()) && <Check className="w-4 h-4 text" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 bg-slate-50">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !name.trim() || selectedMembers.length === 0}>
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
