import { useEffect, useCallback, useRef } from "react";
import socket from "../socket";

/**
 * Custom hook to synchronize profile updates across all connected users in real-time
 *
 * Problem: When User A updates their profile (name, email, photo), User B doesn't see
 * the changes unless they refresh the page
 *
 * Solution: Listen to socket events and update user profiles immediately when changes occur
 *
 * This hook:
 * 1. Listens for profile_updated socket events from backend
 * 2. Updates the users list with new profile data
 * 3. Updates selected user if viewing that user's profile
 * 4. Updates current user if viewing own profile
 * 5. Handles data properly to ensure UI re-renders
 */

export const useProfileSync = (setUsers, setSelectedUser, currentUser) => {
  const setUsersRef = useRef(setUsers);
  const setSelectedUserRef = useRef(setSelectedUser);
  const currentUserRef = useRef(currentUser);

  // Keep refs in sync
  useEffect(() => {
    setUsersRef.current = setUsers;
    setSelectedUserRef.current = setSelectedUser;
    currentUserRef.current = currentUser;
  }, [setUsers, setSelectedUser, currentUser]);

  useEffect(() => {
    if (!socket) return;

    /**
     * Handle incoming profile update events from server
     * This fires when ANY user updates their profile
     */
    const handleProfileUpdate = (data) => {
      console.log("🔄 [PROFILE UPDATE] Received profile update event");
      console.log(`   Updated user ID: ${data.userId}`);
      console.log(`   Updated user name: ${data.user.name}`);
      console.log(`   Current user ID: ${currentUserRef.current?.id}`);
      console.log(`   Event data:`, data);

      if (!data || !data.userId || !data.user) {
        console.error("❌ Invalid profile update data received:", data);
        return;
      }

      // If it's the current user's profile that was updated
      if (data.userId === currentUserRef.current?.id) {
        console.log("👤 Profile update is for CURRENT USER - updating localStorage");

        // Update current user in component state
        if (setUsersRef.current) {
          // Current user might be in the users list too, update them there
          setUsersRef.current((prevUsers) => {
            const updated = prevUsers.map((u) =>
              u.id === data.userId ? { ...u, ...data.user } : u
            );
            console.log(`   ✅ Updated current user in users list`);
            return updated;
          });
        }
      } else {
        // It's another user's profile that was updated
        console.log(
          `👥 Profile update is for OTHER USER (${data.user.name}) - updating users list`
        );

        // Update the user in the users list
        if (setUsersRef.current) {
          setUsersRef.current((prevUsers) => {
            const found = prevUsers.find((u) => u.id === data.userId);
            if (found) {
              const updated = prevUsers.map((u) =>
                u.id === data.userId
                  ? {
                      ...u,
                      ...data.user,
                      // Preserve existing fields that might not be in the update
                      isOnline: u.isOnline,
                      lastMessage: u.lastMessage,
                      unreadCount: u.unreadCount,
                    }
                  : u
              );
              console.log(
                `   ✅ Updated user ${data.userId} in users list with new name: ${data.user.name}`
              );
              return updated;
            } else {
              console.warn(`   ⚠️  User ${data.userId} not found in users list`);
              return prevUsers;
            }
          });
        }

        // Update the selected user if they are the one being viewed
        if (setSelectedUserRef.current) {
          setSelectedUserRef.current((prevSelected) => {
            if (prevSelected && prevSelected.id === data.userId) {
              const updated = {
                ...prevSelected,
                ...data.user,
                // Preserve critical fields
                isOnline: prevSelected.isOnline,
              };
              console.log(
                `   ✅ Updated selected user (${data.user.name}) in chat header`
              );
              return updated;
            }
            return prevSelected;
          });
        }
      }

      console.log("✅ Profile update processed successfully\n");
    };

    console.log("✅ Setting up profile sync listener");
    socket.on("profile_updated", handleProfileUpdate);

    // Cleanup
    return () => {
      console.log("🧹 Removing profile sync listener");
      socket.off("profile_updated", handleProfileUpdate);
    };
  }, []);

  return {
    isSetup: true,
  };
  return {
    isSetup: true,
  };
};

export default useProfileSync;
