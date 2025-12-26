import React, { useState } from 'react';
import { useChat } from '../../../context/ChatContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import axiosInstance from '../../../utils/axiosConfig';

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const EditProfileModal = ({ isOpen, onClose }) => {
  const { currentUser, setCurrentUser } = useChat();
  const [name, setName] = useState(currentUser?.name || currentUser?.userName || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [image, setImage] = useState(currentUser?.image || "");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    // Basic validation
    if (name.trim().length < 2 || name.trim().length > 20) {
      toast.error("Invalid Name", { description: "Name must be between 2 and 20 characters long." });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.trim() !== "" && !emailRegex.test(email.trim())) {
      toast.error("Invalid Email", { description: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.put('/api/user/update', {
        name: name.trim(),
        email: email.trim(),
        image
      });
      const updatedUser = { ...currentUser, ...response.data.user };
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-slate-100 shadow-xl">
                <AvatarImage src={image} />
                <AvatarFallback className="text-2xl">{getInitials(currentUser?.name || currentUser?.userName)}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ename">Display Name</Label>
              <Input id="ename" value={name} onChange={e => setName(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eemail">Email Address</Label>
              <Input id="eemail" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eimage">Avatar URL</Label>
              <Input id="eimage" value={image} onChange={e => setImage(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
