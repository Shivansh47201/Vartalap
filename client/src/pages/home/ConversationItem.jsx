import { useMemo } from "react";
import { normalizeMediaUrl, resolveAvatarUrl } from "../../utils/avatar";

const ConversationItem = ({
  conversation,
  currentUserId,
  isSelected,
  onSelect,
}) => {
  const { title, subtitle, avatar } = useMemo(() => {
    if (!conversation) {
      return {
        title: "Conversation",
        subtitle: "",
        avatar: "https://api.dicebear.com/6.x/avataaars/svg?seed=Chat",
      };
    }

    if (conversation.isGroup) {
      const name = conversation.name || "Group chat";
      const groupAvatar = normalizeMediaUrl(conversation.avatar);
      return {
        title: name,
        subtitle: `${conversation.members?.length || 0} members`,
        avatar: groupAvatar ||
          `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(
            name
          )}`,
      };
    }

    const otherMember = conversation.members?.find(
      (member) => member?._id !== currentUserId
    );

    const name = otherMember?.name || "Unknown";
    return {
      title: name,
      subtitle: `@${otherMember?.username || "user"}`,
      avatar: resolveAvatarUrl(
        otherMember,
        otherMember?.username || name
      ),
    };
  }, [conversation, currentUserId]);

  const lastMessagePreview = useMemo(() => {
    const lastMessage = conversation?.lastMessage;
    if (!lastMessage) return null;

    const senderId = lastMessage?.senderId?._id || lastMessage?.senderId;
    const senderName = lastMessage?.senderId?.name || "You";
    const prefix = senderId === currentUserId ? "You: " : `${senderName}: `;

    const attachmentLabel = (() => {
      if (!Array.isArray(lastMessage.attachments) || !lastMessage.attachments.length) {
        return null;
      }
      const first = lastMessage.attachments[0];
      const remaining = lastMessage.attachments.length - 1;
      const labelMap = {
        image: "Photo",
        video: "Video",
        document: "Document",
        other: "File",
      };
      const baseLabel = labelMap[first.type] || "File";
      return remaining > 0 ? `${baseLabel} (+${remaining})` : baseLabel;
    })();

    if (lastMessage.message?.trim()) {
      return `${prefix}${lastMessage.message}`.slice(0, 60);
    }
    if (attachmentLabel) {
      return `${prefix}${attachmentLabel}`;
    }
    return prefix.slice(0, 60);
  }, [conversation, currentUserId]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group mt-3 flex w-full cursor-pointer items-center gap-4 rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        isSelected
          ? "border-primary/40 bg-white/[0.08] shadow-[0_18px_35px_-25px_rgba(99,102,241,0.8)]"
          : "border-transparent bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.06]"
      }`}
    >
      <div className="relative">
        <img
          src={avatar}
          alt={title}
          className="h-11 w-11 rounded-full border border-white/10 object-cover shadow-inner"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {conversation?.updatedAt && (
            <span className="text-xs text-white/40">
              {new Date(conversation.updatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <p className="text-xs text-white/50 transition group-hover:text-white/70">
          {lastMessagePreview || subtitle}
        </p>
      </div>
      {conversation?.hasUnread && !isSelected && (
        <span className="ml-auto h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_rgba(94,106,255,0.75)]" />
      )}
    </button>
  );
};

export default ConversationItem;
