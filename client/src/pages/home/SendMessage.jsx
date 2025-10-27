import React, { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { sendMessageThunk } from "../../store/slice/message/message.thunk";
import { addMessage } from "../../store/slice/message/message.slice";
import { emitTyping } from "../../lib/socket";
import { FiPaperclip, FiSend, FiSmile } from "react-icons/fi";

const MAX_ATTACHMENTS = 5;

const SendMessage = ({ activeConversation, otherMember, isGroupConversation }) => {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const dispatch = useDispatch();

  const { buttonLoading } = useSelector((state) => state.message);
  const { userProfile } = useSelector((state) => state.user);

  const conversationId = activeConversation?._id;
  const receiverId = !isGroupConversation ? otherMember?._id : null;

  const hasContent = attachments.length > 0 || message.trim().length > 0;
  const canAddressRecipient = conversationId &&
    (isGroupConversation || Boolean(receiverId));

  const canSend = hasContent && canAddressRecipient;

  const isSubmitDisabled = buttonLoading || !canSend;
  const isInputDisabled = buttonLoading || !canAddressRecipient;

  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const notifyTyping = (isTyping) => {
    if (!receiverId) return;
    emitTyping({ to: receiverId, isTyping });
  };

  useEffect(() => {
    setMessage("");
    setAttachments((prevAttachments) => {
      prevAttachments.forEach((item) => URL.revokeObjectURL(item.preview));
      return [];
    });
    if (receiverId) {
      emitTyping({ to: receiverId, isTyping: false });
    }
    setShowEmojiPicker(false);
  }, [conversationId, receiverId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (receiverId) {
        emitTyping({ to: receiverId, isTyping: false });
      }
    };
  }, [receiverId]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!canSend) {
      toast.error("Add a message or attachment first.");
      return;
    }

    if (!conversationId) {
      toast.error("Select a conversation to start chatting.");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticAttachments = attachments.map((item) => ({
      url: item.preview,
      type: item.type.startsWith("image")
        ? "image"
        : item.type.startsWith("video")
        ? "video"
        : item.type.startsWith("audio")
        ? "audio"
        : "document",
      originalName: item.name,
      mimeType: item.type,
      size: item.file?.size,
      uploadedAt: new Date().toISOString(),
    }));

    dispatch(
      addMessage({
        _id: tempId,
        senderId: userProfile?._id || "temp-sender",
        receiverId,
        conversationId,
        message: trimmedMessage,
        messageType:
          optimisticAttachments.length === 0
            ? "text"
            : optimisticAttachments.every((att) => att.type === "image")
            ? "image"
            : "file",
        attachments: optimisticAttachments,
        createdAt: new Date().toISOString(),
        read: false,
        pending: true,
      })
    );

    const response = await dispatch(
      sendMessageThunk({
        conversationId,
        receiverId,
        message: trimmedMessage,
        attachments: attachments.map((item) => item.file),
        tempId,
      })
    );

    if (sendMessageThunk.fulfilled.match(response)) {
      setMessage("");
      attachments.forEach((item) => URL.revokeObjectURL(item.preview));
      setAttachments([]);
      notifyTyping(false);
      setShowEmojiPicker(false);
    } else {
      toast.error(response.payload || "Unable to send message.");
    }
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    setMessage(nextValue);

    if (!receiverId) return;

    if (!nextValue.trim()) {
      notifyTyping(false);
      return;
    }

    notifyTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      notifyTyping(false);
    }, 1500);
  };

  const handleAttachmentButtonClick = () => {
    fileInputRef.current?.click();
    setShowEmojiPicker(false);
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setAttachments((prev) => {
      const remainingSlots = MAX_ATTACHMENTS - prev.length;
      const selectedFiles = files.slice(0, remainingSlots);
      if (selectedFiles.length < files.length) {
        toast(`Only ${MAX_ATTACHMENTS} files allowed per message`, {
          icon: "ℹ️",
        });
      }

      const mapped = selectedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
      }));

      return [...prev, ...mapped];
    });

    event.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => {
      const item = prev[index];
      if (item) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  useEffect(() => {
    return () => {
      attachments.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [attachments]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target) &&
        !(event.target.closest && event.target.closest("[data-emoji-trigger]"))
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      window.addEventListener("click", handleClickOutside);
    }

    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleEmojiClick = (emojiData) => {
    if (!emojiData?.emoji) return;
    setMessage((prev) => `${prev}${emojiData.emoji}`);
    if (receiverId || isGroupConversation) {
      notifyTyping(true);
    }
  };

  if (!conversationId) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 left-0 right-0 z-30 mt-auto border-t border-white/5 bg-gradient-to-b from-transparent to-white/[0.02] px-4 pb-4 pt-3 lg:px-6"
    >
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-24 left-6 z-40 rounded-3xl border border-white/10 bg-[#111b37] p-2 shadow-2xl"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme="dark"
            width={320}
            height={410}
            lazyLoadEmojis
          />
        </div>
      )}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {attachments.map((item, index) => (
            <div
              key={`${item.preview}-${index}`}
              className="group relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white"
            >
              {item.type.startsWith("image") ? (
                <img
                  src={item.preview}
                  alt={item.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : item.type.startsWith("video") ? (
                <video
                  src={item.preview}
                  className="h-10 w-10 rounded-lg object-cover"
                  muted
                  playsInline
                />
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/30 text-xs">
                  {item.name.split(".").pop()?.toUpperCase() || "DOC"}
                </span>
              )}
              <span className="max-w-[10rem] truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="cursor-pointer opacity-60 transition hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex h-14 items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 shadow-[0_18px_45px_-25px_rgba(87,84,231,0.65)] backdrop-blur">
        <button
          type="button"
          className="cursor-pointer text-white/60 transition hover:text-primary"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Insert emoji"
          data-emoji-trigger
        >
          <FiSmile size={20} />
        </button>
        <button
          type="button"
          className="cursor-pointer text-white/60 transition hover:text-primary"
          onClick={handleAttachmentButtonClick}
          title="Attach files"
        >
          <FiPaperclip size={20} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
          onChange={handleAttachmentChange}
        />
        <input
          type="text"
          value={message}
          onChange={handleChange}
          placeholder={
            isGroupConversation
              ? "Type a message to the group…"
              : otherMember
              ? `Message ${otherMember.name || otherMember.username}`
              : "Type a message…"
          }
          className="flex-1 h-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          disabled={isInputDisabled}
        />
        <button
          type="submit"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-900/40 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isSubmitDisabled}
        >
          {buttonLoading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <FiSend size={18} />
          )}
        </button>
      </div>
    </form>
  );
};

export default SendMessage;
