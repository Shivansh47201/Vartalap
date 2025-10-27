import React, { useEffect, useRef, useState } from "react";
import { FiDownload, FiExternalLink, FiFileText } from "react-icons/fi";
import { normalizeMediaUrl, resolveAvatarUrl } from "../../utils/avatar";
import { normalizeFilename } from "../../utils/filename";
import { translateText } from "../../utils/translate";

const Message = ({
  messageDetails,
  currentUserId,
  currentUserProfile,
  members = [],
  isGroupConversation = false,
  shouldScrollIntoView = false,
}) => {
  const messageRef = useRef(null);

  const currentUserAvatar = resolveAvatarUrl(
    currentUserProfile,
    currentUserProfile?.username || currentUserProfile?.name || "me",
    { preferDefaultFallback: true }
  );

  const senderIdRaw =
    messageDetails?.senderId?._id ||
    messageDetails?.senderId?.toString?.() ||
    messageDetails?.senderId;
  const senderId = senderIdRaw?.toString?.() || senderIdRaw;
  const senderProfile =
    messageDetails?.senderId && typeof messageDetails.senderId === "object"
      ? messageDetails.senderId
      : members.find((member) => member?._id === senderId);

  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [translatedMessage, setTranslatedMessage] = useState(
    messageDetails?.message || ""
  );
  const [isTranslating, setIsTranslating] = useState(false);

  const buildViewerUrl = (url, label, mime, size) => {
    const params = new URLSearchParams();
    params.set("url", url);
    if (label) params.set("name", label);
    if (mime) params.set("mime", mime);
    if (size) params.set("size", String(size));
    return `/preview?${params.toString()}`;
  };

  const openOriginalFile = (url) => {
    if (!url || typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };


  const downloadFile = (url, name) => {
    if (!url) return;
    if (typeof document === "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const sanitizedName = name || "download";

    fetch(url, { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to download file (${response.status})`);
        }
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = sanitizedName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        window.open(url, "_blank", "noopener,noreferrer");
      });
  };

  const getFileExtension = (attachment) => {
    const fromName = attachment?.originalName || attachment?.fileName || "";
    const nameMatch = /\.([a-z0-9]+)(?:$|[?#])/i.exec(fromName);
    if (nameMatch) return nameMatch[1].toLowerCase();
    const urlMatch = /\.([a-z0-9]+)(?:$|[?#])/i.exec(attachment?.url || "");
    return urlMatch ? urlMatch[1].toLowerCase() : "";
  };

  const formatFileSize = (value) => {
    const size = Number(value);
    if (!size || Number.isNaN(size)) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let idx = 0;
    let current = size;
    while (current >= 1024 && idx < units.length - 1) {
      current /= 1024;
      idx += 1;
    }
    const display = current >= 10 || idx === 0 ? current.toFixed(0) : current.toFixed(1);
    return `${display} ${units[idx]}`;
  };

  useEffect(() => {
    if (shouldScrollIntoView && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [shouldScrollIntoView]);

  useEffect(() => {
    let isCancelled = false;
    const text = messageDetails?.message;
    if (!text) {
      setTranslatedMessage("");
      return undefined;
    }

    const targetLanguage = (currentUserProfile?.language || "en").toLowerCase();
    if (!targetLanguage || targetLanguage.startsWith("en")) {
      setTranslatedMessage(text);
      return undefined;
    }

    setIsTranslating(true);
    translateText(text, targetLanguage)
      .then((result) => {
        if (!isCancelled) {
          setTranslatedMessage(result || text);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setTranslatedMessage(text);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsTranslating(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [messageDetails?.message, currentUserProfile?.language]);

  useEffect(() => {
    if (!previewAttachment) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreviewAttachment(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewAttachment]);

  const senderBase =
    senderProfile && Object.keys(senderProfile).length > 0
      ? senderProfile
      : messageDetails?.senderId && typeof messageDetails.senderId === "object"
      ? messageDetails.senderId
      : null;

  const senderSeed =
    senderBase?.username ||
    senderBase?.name ||
    senderProfile?.username ||
    senderProfile?.name ||
    "user";

  const senderAvatar = resolveAvatarUrl(
    senderBase || senderProfile,
    senderSeed
  );

  const senderIsCurrentUser =
    (currentUserId?.toString?.() || currentUserId) === senderId;

  const formattedTime = messageDetails?.createdAt
    ? new Date(messageDetails.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const deliveryStatus = senderIsCurrentUser
    ? messageDetails?.read
      ? "Read"
      : "Sent"
    : "";

  const bubbleClasses = senderIsCurrentUser
    ? "chat-bubble max-w-xl bg-gradient-to-r from-indigo-500/90 to-purple-500/90 text-white shadow-[0_18px_35px_-25px_rgba(99,102,241,0.9)]"
    : "chat-bubble max-w-xl border border-white/10 bg-white/10 text-white backdrop-blur-sm shadow-[0_18px_40px_-30px_rgba(15,23,42,0.8)]";

  const attachments = Array.isArray(messageDetails?.attachments)
    ? messageDetails.attachments
    : [];
  const hasAttachments = attachments.length > 0;
  const hasText = Boolean(messageDetails?.message?.trim());
  const isPending = Boolean(messageDetails?.pending);

  return (
    <div
      ref={messageRef}
      className={`chat ${senderIsCurrentUser ? "chat-end" : "chat-start"}`}
    >
      <div className="chat-image avatar">
        <div className="w-10 rounded-full">
          <img
            alt="Conversation avatar"
            src={senderIsCurrentUser ? currentUserAvatar : senderAvatar}
          />
        </div>
      </div>
      <div className="chat-header">
        {formattedTime && (
          <time className="text-xs opacity-50">{formattedTime}</time>
        )}
      </div>
      {(hasText || hasAttachments) && (
        <div className={bubbleClasses}>
          {isGroupConversation && !senderIsCurrentUser && senderProfile?.name && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">
              {senderProfile.name}
            </p>
          )}
          {hasText && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {isTranslating ? "Translating…" : translatedMessage || messageDetails.message}
            </p>
          )}
          {hasAttachments && (
            <div className="mt-3 flex flex-col gap-3">
              {attachments.map((attachment) => {
                const fullUrl = normalizeMediaUrl(attachment.url);
                if (!fullUrl) return null;
                if (attachment.type === "image") {
                  return (
                    <div
                      key={attachment.url}
                      className="relative max-h-64 w-full overflow-hidden rounded-2xl border border-white/10"
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setPreviewAttachment({
                          url: fullUrl,
                          label: normalizeFilename(attachment.originalName || "Image"),
                          meta: attachment.originalName,
                          type: "image",
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setPreviewAttachment({
                            url: fullUrl,
                            label: normalizeFilename(attachment.originalName || "Image"),
                            meta: attachment.originalName,
                            type: "image",
                          });
                        }
                      }}
                    >
                      <img
                        src={fullUrl}
                        alt={attachment.originalName || "image"}
                        className="max-h-64 w-full object-cover"
                      />
                      {isPending && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs uppercase tracking-wide text-white">
                          Uploading…
                        </div>
                      )}
                    </div>
                  );
                }
                if (attachment.type === "video") {
                  return (
                    <video
                      key={attachment.url}
                      src={fullUrl}
                      controls
                      className="max-h-64 w-full rounded-2xl border border-white/10"
                    />
                  );
                }
                const rawLabel = attachment.originalName || "Download file";
                const label = normalizeFilename(rawLabel);
                const extension = getFileExtension(attachment);
                const lowerMime = attachment.mimeType?.toLowerCase?.();
                const isPdf =
                  extension === "pdf" ||
                  (lowerMime ? lowerMime.includes("pdf") : false);
                const readableSize = formatFileSize(attachment.size);
                const typeLabel = isPdf
                  ? "PDF document"
                  : extension
                  ? `${extension.toUpperCase()} file`
                  : "Document";
                const metaLine = [typeLabel, readableSize].filter(Boolean).join(" • ");

                if (isPdf) {
                  return (
                    <div
                      key={attachment.url}
                      className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 text-white shadow-inner shadow-black/30"
                      onClick={() =>
                        setPreviewAttachment({
                          url: fullUrl,
                          label,
                          meta: metaLine,
                          type: "pdf",
                        })
                      }
                    >
                      <div className="relative h-48 w-full overflow-hidden bg-black/40">
                        <iframe
                          title={`Preview ${label}`}
                          src={`${fullUrl}#toolbar=0&navpanes=0`}
                          className="h-full w-full"
                          loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
                      </div>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-xs font-semibold uppercase tracking-wide text-red-200">
                          PDF
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{label}</p>
                          {metaLine && (
                            <p className="mt-1 text-xs text-white/60">{metaLine}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/70">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPreviewAttachment({
                                  url: fullUrl,
                                  label,
                                  meta: metaLine,
                                });
                              }}
                              className="rounded-full border border-white/15 px-3 py-1 transition hover:border-primary/40 hover:text-primary"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openOriginalFile(fullUrl);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 transition hover:border-primary/40 hover:text-primary"
                            >
                              <FiExternalLink /> Open
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                downloadFile(fullUrl, label);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 transition hover:border-primary/40 hover:text-primary"
                            >
                              <FiDownload /> Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={attachment.url}
                    className="flex w-full flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-inner shadow-black/30"
                    onClick={() =>
                      setPreviewAttachment({
                        url: fullUrl,
                        label,
                        meta: metaLine,
                        type: "document",
                      })
                    }
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                        <FiFileText />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">{label}</p>
                        {metaLine && (
                          <p className="mt-1 text-xs text-white/60">{metaLine}</p>
                        )}
                      </div>
                    </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-white/70">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          downloadFile(fullUrl, label);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 transition hover:border-primary/40 hover:text-primary"
                      >
                        <FiDownload /> Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {senderIsCurrentUser && (
        <div className="chat-footer mt-1 flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/60">
          {deliveryStatus}
        </div>
      )}

      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
              aria-label="Close preview"
            >
              ✕
            </button>
            <h3 className="pr-10 text-lg font-semibold text-white">{previewAttachment.label || "Preview"}</h3>
            {previewAttachment.meta && (
              <p className="mt-1 text-sm text-white/60">{previewAttachment.meta}</p>
            )}
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white">
              {previewAttachment.type === "image" ? (
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.label || "attachment"}
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : previewAttachment.type === "document" ? (
                <iframe
                  title={`Preview ${previewAttachment.label || "attachment"}`}
                  src={buildViewerUrl(
                    previewAttachment.url,
                    previewAttachment.label,
                    "application/msword",
                    undefined
                  )}
                  className="h-[70vh] w-full"
                />
              ) : (
                <iframe
                  title={`Preview ${previewAttachment.label || "attachment"}`}
                  src={`${previewAttachment.url}#toolbar=0`}
                  className="h-[70vh] w-full"
                />
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
              <span>{previewAttachment.label}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    downloadFile(
                      previewAttachment.url,
                      previewAttachment.label || "attachment"
                    );
                  }}
                  className="transition hover:text-primary"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openOriginalFile(previewAttachment.url);
                  }}
                  className="transition hover:text-primary"
                >
                  Open in new tab
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Message;
