import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook to synchronize authentication state across multiple browser tabs
 *
 * Problem: When user logs out from one tab, other tabs still show as logged in
 * Solution: Listen to localStorage changes and sync authentication state
 *
 * This hook:
 * 1. Listens for storage events (when another tab changes localStorage)
 * 2. Listens for visibility changes (when tab becomes visible, check if logged in)
 * 3. Detects logout in other tabs and syncs immediately
 */

export const useTabSynchronization = () => {
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * Handle storage event - fired when localStorage changes in ANOTHER tab
     * This is the main synchronization mechanism
     */
    const handleStorageChange = (event) => {
      console.log("📱 Storage event detected from another tab:");
      console.log("  Key changed:", event.key);
      console.log("  Old value:", event.oldValue ? "exists" : "null");
      console.log("  New value:", event.newValue ? "exists" : "null");

      // If 'user' or 'token' was removed in another tab, sync this tab
      if (event.key === "user" && event.oldValue && !event.newValue) {
        console.log("🔐 User logged out from another tab - syncing this tab");
        handleLogoutSync();
      }

      if (event.key === "token" && event.oldValue && !event.newValue) {
        console.log("🔐 Token removed from another tab - syncing this tab");
        handleLogoutSync();
      }

      // If 'user' changed to a different user, update this tab
      if (event.key === "user" && event.oldValue && event.newValue) {
        const oldUser = JSON.parse(event.oldValue);
        const newUser = JSON.parse(event.newValue);

        if (oldUser.id !== newUser.id) {
            `🔄 User switched from ${oldUser.name} to ${newUser.name} in another tab - syncing`
          handleLoginSync(newUser);
        }
      }
    };

    /**
     * Handle visibility change - when tab becomes visible again
     * Check if authentication state is still valid
     */
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("👁️  Tab became visible - checking authentication state");
        verifyAuthenticationState();
      } else {
        console.log("⚫ Tab hidden");
      }
    };

    /**
     * Verify if current tab's authentication is still valid
     * compared to what's in localStorage
     */
    const verifyAuthenticationState = () => {
      try {
        const user = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!user || !token) {
          console.log("❌ No user or token in localStorage - logging out");
          handleLogoutSync();
        } else {
          console.log("✅ User still authenticated:", JSON.parse(user).name);
        }
      } catch (error) {
        console.error("Error verifying auth state:", error);
      }
    };

    /**
     * Handle logout synchronization across tabs
     */
    const handleLogoutSync = () => {
      console.log("🧹 Performing logout sync across all tabs");

      // Clear all auth data
      localStorage.removeItem("user");
      localStorage.removeItem("token");

      // Disconnect socket if available
      try {
        const socket = require("../socket").default;
        if (socket && socket.connected) {
          console.log("📵 Disconnecting socket");
          socket.disconnect();
        }
      } catch (error) {
        // Socket module might not be available
      }

      // Redirect to login
      window.location.href = "/login";
    };

    /**
     * Handle login synchronization across tabs
     */
    const handleLoginSync = (newUser) => {
      console.log("✅ Syncing login across tabs:", newUser.name);

      // Update localStorage
      localStorage.setItem("user", JSON.stringify(newUser));

      // Reload page to get fresh data
      window.location.reload();
    };

    // Add event listeners
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    console.log("✅ Tab synchronization initialized");

    // Cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      console.log("🧹 Tab synchronization listeners removed");
    };
  }, [navigate]);

  return {
    isSetup: true,
  };
};

export default useTabSynchronization;
