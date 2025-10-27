import { useEffect, useMemo, useState } from "react";
import { IoMdSearch } from "react-icons/io";
import ConversationItem from "./ConversationItem";
import { useDispatch, useSelector } from "react-redux";
import { updateUserThunk } from "../../store/slice/user/user.thunk";
import {
  createDirectConversationThunk,
  createGroupConversationThunk,
  fetchConversationsThunk,
} from "../../store/slice/conversation/conversation.thunk";
import {
  setSelectedConversation,
} from "../../store/slice/conversation/conversation.slice";
import toast from "react-hot-toast";

const UserSidebar = ({
  isMobile = false,
  isVisible = true,
  onConversationSelected,
  isProfileEditorOpen = false,
  onOpenProfileEditor,
  onCloseProfileEditor,
}) => {
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    username: "",
    email: "",
    gender: "",
    avatar: "",
    password: "",
    language: "en",
  });
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    memberIds: [],
  });
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [selectedDirectUser, setSelectedDirectUser] = useState("");

  const { otherUsers, userProfile, profileUpdating } = useSelector(
    (state) => state.user
  );
  const {
    conversations,
    loading: conversationsLoading,
    selectedConversationId,
    creating,
  } = useSelector((state) => state.conversation);

  useEffect(() => {
    if (!conversations.length) {
      dispatch(fetchConversationsThunk());
    }
  }, [dispatch, conversations.length]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length) {
      dispatch(setSelectedConversation(conversations[0]?._id));
    }
  }, [dispatch, conversations, selectedConversationId]);

  const startedDirectChatIds = useMemo(() => {
    if (!Array.isArray(conversations)) {
      return new Set();
    }

    const currentId = userProfile?._id?.toString?.();
    const startedIds = new Set();

    conversations.forEach((conversation) => {
      if (!conversation || conversation.isGroup) return;
      const members = conversation.members || [];
      members.forEach((member) => {
        const memberId = member?._id?.toString?.();
        if (!memberId || memberId === currentId) return;
        startedIds.add(memberId);
      });
    });

    return startedIds;
  }, [conversations, userProfile?._id]);

  const filteredConversations = useMemo(() => {
    if (!Array.isArray(conversations)) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      if (!conversation) return false;
      if (conversation.isGroup) {
        return conversation.name?.toLowerCase().includes(term);
      }
      const otherMember = conversation.members?.find(
        (member) => member?._id !== userProfile?._id
      );
      const name = otherMember?.name?.toLowerCase() || "";
      const username = otherMember?.username?.toLowerCase() || "";
      return name.includes(term) || username.includes(term);
    });
  }, [conversations, searchTerm, userProfile?._id]);

  const filteredPeople = useMemo(() => {
    if (!Array.isArray(otherUsers)) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();
    const results = otherUsers.filter((user) => {
      const userId = user?._id?.toString?.();
      if (!userId) return false;
      if (userId === userProfile?._id?.toString?.()) return false;
      if (startedDirectChatIds.has(userId)) return false;
      const name = user?.name?.toLowerCase() || "";
      const username = user?.username?.toLowerCase() || "";
      return name.includes(term) || username.includes(term);
    });

    return term ? results.slice(0, 5) : results.slice(0, 3);
  }, [otherUsers, searchTerm, startedDirectChatIds, userProfile?._id]);

  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        name: userProfile?.name || "",
        username: userProfile?.username || "",
        email: userProfile?.email || "",
        gender: userProfile?.gender || "",
        avatar: userProfile?.avatar || "",
        password: "",
        language: userProfile?.language || "en",
      });
    }
  }, [userProfile]);

  const handleProfileInput = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();

    const payload = { ...profileForm };
    if (!payload.password) {
      delete payload.password;
    }
    if (!payload.avatar) {
      delete payload.avatar;
    }

    const result = await dispatch(updateUserThunk(payload));

    if (updateUserThunk.fulfilled.match(result)) {
      toast.success("Profile updated");
      onCloseProfileEditor?.();
      setProfileForm((prev) => ({ ...prev, password: "" }));
    } else {
      toast.error(result.payload || "Unable to update profile");
    }
  };

  const closeProfileEditor = () => {
    onCloseProfileEditor?.();
    setProfileForm((prev) => ({ ...prev, password: "" }));
  };

  const handleConversationSelect = (conversationId) => {
    dispatch(setSelectedConversation(conversationId));
    if (onConversationSelected) {
      onConversationSelected(conversationId);
    }
  };

  const toggleMemberSelection = (memberId) => {
    setGroupForm((prev) => {
      const exists = prev.memberIds.includes(memberId);
      return {
        ...prev,
        memberIds: exists
          ? prev.memberIds.filter((id) => id !== memberId)
          : [...prev.memberIds, memberId],
      };
    });
  };

  const handleGroupSubmit = async (event) => {
    event.preventDefault();
    if (!groupForm.name.trim() || groupForm.memberIds.length === 0) {
      toast.error("Provide a group name and at least one member");
      return;
    }

    const result = await dispatch(
      createGroupConversationThunk({
        name: groupForm.name.trim(),
        memberIds: groupForm.memberIds,
      })
    );

    if (createGroupConversationThunk.fulfilled.match(result)) {
      toast.success("Group created");
      setShowGroupModal(false);
      setGroupForm({ name: "", memberIds: [] });
    } else {
      toast.error(result.payload || "Unable to create group");
    }
  };

  const closeGroupModal = () => {
    setShowGroupModal(false);
    setGroupForm({ name: "", memberIds: [] });
  };

  const openDirectModal = () => {
    setSelectedDirectUser((prev) => prev || otherUsers?.[0]?._id || "");
    setShowDirectModal(true);
  };

  const closeDirectModal = () => {
    setShowDirectModal(false);
    setSelectedDirectUser("");
  };

  const handleDirectSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDirectUser) {
      toast.error("Select a user to start chatting");
      return;
    }
    await handleStartDirectConversation(selectedDirectUser);
  };

  const handleStartDirectConversation = async (memberId) => {
    const result = await dispatch(
      createDirectConversationThunk({ memberId })
    );

    if (createDirectConversationThunk.fulfilled.match(result)) {
      toast.success("Conversation ready");
      setShowDirectModal(false);
      setSelectedDirectUser("");
      if (onConversationSelected) {
        const createdId = result.payload?.conversation?._id;
        onConversationSelected(createdId);
      }
    } else {
      toast.error(result.payload || "Unable to open conversation");
    }
  };

  const visibilityClasses = `${isVisible ? "flex" : "hidden"} lg:flex`;

  return (
    <aside
      className={`${visibilityClasses} relative h-full w-full flex-shrink-0 flex-col border-b border-white/10 bg-white/[0.02] backdrop-blur lg:max-w-[22rem] lg:border-b-0 lg:border-r`}
    >
      <div className="sticky top-0 z-20 space-y-3 border-b border-white/10 bg-white/[0.04] px-4 pb-4 pt-4 backdrop-blur lg:space-y-4 lg:px-6 lg:py-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600/70 to-purple-500/60 px-5 py-4 shadow-lg shadow-indigo-900/30">
          <h1 className="text-2xl font-semibold text-white">Vartalap</h1>
        </div>

        <label className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40">
          <IoMdSearch className="text-lg" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search users"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
        </label>
        {!isMobile && (
          <button
            type="button"
            onClick={() => setShowGroupModal(true)}
            className="btn btn-sm w-full cursor-pointer rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/80"
            disabled={creating}
          >
            {creating ? "Preparing…" : "Create Group Chat"}
          </button>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={openDirectModal}
            className="btn btn-sm mt-2 w-full cursor-pointer rounded-full border border-white/10 bg-white/[0.08] text-white shadow-lg shadow-black/20 hover:border-primary/40 hover:bg-primary/70"
            disabled={!otherUsers?.length}
          >
            Create New Chat
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 lg:py-3">
        {conversationsLoading ? (
          <div className="flex justify-center py-6">
            <span className="loading loading-spinner text-primary" />
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation?._id}
              conversation={conversation}
              currentUserId={userProfile?._id}
              isSelected={conversation?._id === selectedConversationId}
              onSelect={() => handleConversationSelect(conversation?._id)}
            />
          ))
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-white/5 px-6 py-8 text-center text-white/60">
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="mt-2 text-xs">
              Start by creating a group or sending a message.
            </p>
          </div>
        )}

        {filteredPeople.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-white/40">
              People
            </p>
            <div className="space-y-2">
              {filteredPeople.map((user) => (
                <button
                  key={user?._id}
                  type="button"
                  onClick={() => handleStartDirectConversation(user?._id)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left text-sm text-white transition hover:border-primary/30 hover:bg-white/[0.08]"
                >
                  <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-xs text-white/50">@{user?.username}</p>
                  </div>
                  <span className="text-xs text-primary">Start chat</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isProfileEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">Edit Profile</h2>
            <p className="mt-1 text-sm text-white/60">
              Update your personal details. Leave password blank to keep it unchanged.
            </p>
            <form
              onSubmit={handleProfileSubmit}
              className="mt-6 space-y-4 overflow-visible"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-white/70">Full name</span>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileInput}
                    className="input input-bordered w-full bg-white/5 text-white"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-white/70">Username</span>
                  <input
                    type="text"
                    name="username"
                    value={profileForm.username}
                    onChange={handleProfileInput}
                    className="input input-bordered w-full bg-white/5 text-white"
                    required
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="text-white/70">Email</span>
                <input
                  type="email"
                  name="email"
                  value={profileForm.email}
                  onChange={handleProfileInput}
                  className="input input-bordered w-full bg-white/5 text-white"
                  required
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="relative z-40 space-y-2 text-sm">
                  <span className="text-white/70">Gender</span>
                  <select
                    name="gender"
                    value={profileForm.gender}
                    onChange={handleProfileInput}
                    className="select select-bordered w-full bg-[#111b37] text-white border-white/20 focus:outline-none focus:border-primary"
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-white/70">Avatar URL</span>
                  <input
                    type="url"
                    name="avatar"
                    value={profileForm.avatar}
                    onChange={handleProfileInput}
                    className="input input-bordered w-full bg-white/5 text-white"
                  />
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="text-white/70">New password (optional)</span>
                <input
                  type="password"
                  name="password"
                  value={profileForm.password}
                  onChange={handleProfileInput}
                  className="input input-bordered w-full bg-white/5 text-white"
                  placeholder="Leave blank to keep existing"
                  minLength={8}
                />
              </label>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeProfileEditor}
                  className="btn btn-ghost text-white"
                  disabled={profileUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-primary text-white hover:bg-primary/90"
                  disabled={profileUpdating}
                >
                  {profileUpdating ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">Create Group Chat</h2>
            <p className="mt-1 text-sm text-white/60">
              Select members to start a new group conversation.
            </p>
            <form onSubmit={handleGroupSubmit} className="mt-6 space-y-4 overflow-visible">
              <label className="space-y-2 text-sm">
                <span className="text-white/70">Group name</span>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(event) =>
                    setGroupForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  className="input input-bordered w-full bg-white/5 text-white"
                  required
                />
              </label>

              <div className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                {otherUsers?.length ? (
                  otherUsers.map((user) => {
                    const isSelected = groupForm.memberIds.includes(user?._id);
                    return (
                      <label
                        key={user?._id}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-white/[0.08] ${
                          isSelected ? "bg-primary/20" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={isSelected}
                          onChange={() => toggleMemberSelection(user?._id)}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {user?.name}
                          </p>
                          <p className="text-xs text-white/50">
                            @{user?.username}
                          </p>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-white/60">
                    Invite more users to create a group.
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeGroupModal}
                  className="btn btn-ghost text-white"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-primary text-white hover:bg-primary/90"
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">Create New Chat</h2>
            <p className="mt-1 text-sm text-white/60">
              Pick someone to start a new conversation.
            </p>
            <form onSubmit={handleDirectSubmit} className="mt-6 space-y-4 overflow-visible">
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                {otherUsers?.length ? (
                  otherUsers.map((user) => (
                    <label
                      key={user?._id}
                      className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-sm transition hover:bg-white/[0.08] ${
                        selectedDirectUser === user?._id ? "bg-primary/20" : ""
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">{user?.name}</p>
                        <p className="text-xs text-white/50">@{user?.username}</p>
                      </div>
                      <input
                        type="radio"
                        name="direct-user"
                        value={user?._id}
                        checked={selectedDirectUser === user?._id}
                        onChange={() => setSelectedDirectUser(user?._id)}
                        className="radio radio-primary"
                      />
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-white/60">
                    Invite more users to start chatting.
                  </p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDirectModal}
                  className="btn btn-ghost text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-primary text-white hover:bg-primary/90"
                  disabled={!selectedDirectUser}
                >
                  Start chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default UserSidebar;
