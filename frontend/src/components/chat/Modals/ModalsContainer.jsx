import React from 'react';
import { useChat } from '../../../context/ChatContext';
import { useLocation, useNavigate } from 'react-router-dom';
import AddNewConversationModal from '@/components/AddNewConversationModal';
import AddGroupMembersModal from '@/components/AddGroupMembersModal';
// We'll create these three below
import CreateGroupModal from './CreateGroupModal';
import EditProfileModal from './EditProfileModal';
import GroupMembersModal from './GroupMembersModal';
import { blockIfLocked } from '@/lib/modalQueryGuard';

const ModalsContainer = () => {
  const {
    // keep state setters for backward compatibility in other places but modals are URL-driven now
    setShowAddConversationModal,
    setShowCreateGroup,
    setShowEditProfile,
    showGroupMembersModal, setShowGroupMembersModal,
    selectedGroup,
    allUsers, users, loadingUsers,
    handleSelectNewUser, fetchUsers, currentUser
  } = useChat();

  const location = useLocation();
  const navigate = useNavigate();

  // Derive modal open state directly from URL. URL is single source of truth to avoid sync loops.
  const params = new URLSearchParams(location.search);
  const isAddOpen = params.get('modal') === 'add';
  const isCreateOpen = params.get('modal') === 'create-group';

  React.useEffect(() => {
    console.log('🧭 [MODALS] location.search changed:', location.search, 'isAddOpen=', isAddOpen, 'isCreateOpen=', isCreateOpen);
    if (isAddOpen) {
      console.trace('🧭 [MODALS] isAddOpen stack trace');
    }
  }, [location.search, isAddOpen, isCreateOpen]);

  const closeAddModal = () => {
    if (blockIfLocked('close-add')) return;
    const p = new URLSearchParams(location.search);
    if (p.get('modal')) p.delete('modal');
    navigate({ pathname: location.pathname, search: p.toString() ? `?${p.toString()}` : '' }, { replace: true });
  };

  const closeCreateModal = () => {
    if (blockIfLocked('close-create')) return;
    const p = new URLSearchParams(location.search);
    if (p.get('modal')) p.delete('modal');
    navigate({ pathname: location.pathname, search: p.toString() ? `?${p.toString()}` : '' }, { replace: true });
  };

  // When a user is selected from the modal, add them and navigate to the correct route
  const handleUserSelect = async (user) => {
    console.log('🧭 [MODALS] User selected in modal:', user);

    // Add to users and set selectedUser immediately (local state)
    handleSelectNewUser(user);

    // Persist as a contact on the server so subsequent /api/user/all reflects it
    try {
      // Backend endpoint is POST /api/user/contacts/add
      const resp = await (await import('@/utils/axiosConfig')).default.post('/api/user/contacts/add', { contactUserId: user.id });
      console.log('🧭 [MODALS] add-contact response:', resp?.data?.message || resp?.data);

      // Refresh users from server so `hasChat`/`addedForChat` flags are accurate
      try {
        fetchUsers(currentUser);
        console.log('🧭 [MODALS] Triggered fetchUsers to sync server state');
      } catch (fetchErr) {
        console.warn('🧭 [MODALS] fetchUsers failed:', fetchErr?.message || fetchErr);
      }
    } catch (err) {
      console.warn('🧭 [MODALS] Failed to persist contact:', err?.response?.data || err.message);
    }

    // Ensure navigation happens even if a guard is active (selection must proceed)
    const params = new URLSearchParams(location.search);
    if (params.get('modal')) params.delete('modal');

    // Wait a tick to let React apply state updates so ChatWindow finds the user
    // then navigate to the user route
    window.requestAnimationFrame(() => {
      console.log('🧭 [MODALS] Navigating to user route:', `/chat/${user.id}`);
      navigate({ pathname: `/chat/${user.id}`, search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
    });

    // Close modal
    setShowAddConversationModal(false);
  };

  return (
    <>
      <AddNewConversationModal
        isOpen={isAddOpen}
        onOpenChange={(open) => { if (!open) closeAddModal(); }}
        allUsers={allUsers}
        chatUsers={users}
        onUserSelect={handleUserSelect}
        isLoading={loadingUsers}
      />

      <CreateGroupModal
        isOpen={isCreateOpen}
        onClose={() => closeCreateModal()}
      />

      <EditProfileModal
        isOpen={false}
        onClose={() => setShowEditProfile(false)}
      />

      {showGroupMembersModal && (
        <GroupMembersModal
          isOpen={showGroupMembersModal}
          onClose={() => setShowGroupMembersModal(false)}
          group={selectedGroup}
        />
      )}
    </>
  );
};

export default ModalsContainer;
