import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createStatusThunk,
  fetchMyStatusesThunk,
  fetchStatusFeedThunk,
} from "../../store/slice/status/status.thunk";
import toast from "react-hot-toast";
import { normalizeMediaUrl, resolveAvatarUrl } from "../../utils/avatar";
import { normalizeFilename } from "../../utils/filename";

const resolveMediaUrl = normalizeMediaUrl;

const StatusCard = ({ status, isMine }) => {
  if (!status) return null;

  const user = status.userId || {};
  const attachments = Array.isArray(status.attachments)
    ? status.attachments
    : [];
  const primaryAttachment = attachments[0];
  const createdAt = status.createdAt
    ? new Date(status.createdAt).toLocaleString()
    : "Just now";

  const mediaPreview = () => {
    if (!primaryAttachment) return null;
    const url = resolveMediaUrl(primaryAttachment.url);
    if (primaryAttachment.type === "image") {
      return (
        <img
          src={url}
          alt={primaryAttachment.originalName || "status"}
          className="h-32 w-full rounded-xl object-cover"
        />
      );
    }
    if (primaryAttachment.type === "video") {
      return (
        <video
          src={url}
          controls
          className="h-32 w-full rounded-xl object-cover"
        />
      );
    }
    const label = normalizeFilename(primaryAttachment.originalName || "Attachment");
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={label || undefined}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white"
      >
        📄 {label}
      </a>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-lg shadow-black/20 backdrop-blur">
      <div className="flex items-center gap-3">
        <img
          src={resolveAvatarUrl(
            user,
            user.username || user.name || "status"
          )}
          alt={user.name || "User"}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div>
          <p className="text-sm font-semibold text-white">
            {isMine ? "You" : user.name || "Unknown"}
          </p>
          <p className="text-xs text-white/50">{createdAt}</p>
        </div>
      </div>
      {status.content && (
        <p className="mt-3 text-sm text-white/80 whitespace-pre-wrap">
          {status.content}
        </p>
      )}
      {primaryAttachment && <div className="mt-3">{mediaPreview()}</div>}
    </div>
  );
};

const StatusPanel = () => {
  const dispatch = useDispatch();
  const {
    feed,
    mine,
    loadingFeed,
    loadingMine,
    creating,
    feedLoaded,
    mineLoaded,
  } = useSelector((state) => state.status);

  const [showComposer, setShowComposer] = useState(false);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [visibility, setVisibility] = useState("public");

  useEffect(() => {
    if (!feedLoaded) {
      dispatch(fetchStatusFeedThunk());
    }
    if (!mineLoaded) {
      dispatch(fetchMyStatusesThunk());
    }
  }, [dispatch, feedLoaded, mineLoaded]);

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 3) {
      toast("Maximum 3 files per status", { icon: "ℹ️" });
    }
    setFiles(selected.slice(0, 3));
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!content.trim() && files.length === 0) {
      toast.error("Add text or media to post a status");
      return;
    }

    const result = await dispatch(
      createStatusThunk({ content: content.trim(), attachments: files, visibility })
    );

    if (createStatusThunk.fulfilled.match(result)) {
      toast.success("Status posted");
      setContent("");
      setFiles([]);
      setShowComposer(false);
      dispatch(fetchStatusFeedThunk());
    } else {
      toast.error(result.payload || "Unable to post status");
    }
  };

  const isEmpty = !loadingFeed && !loadingMine && feed.length === 0 && mine.length === 0;

  const renderFilesPreview = useMemo(
    () =>
      files.map((file, index) => (
        <div
          key={`${file.name}-${index}`}
          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
        >
          <span className="truncate">{file.name}</span>
          <button
            type="button"
            onClick={() => handleRemoveFile(index)}
            className="text-white/60 transition hover:text-red-400"
          >
            ✕
          </button>
        </div>
      )),
    [files]
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold text-white">Status</h2>
          <p className="text-xs text-white/50">
            Share updates with your contacts. Status expires after 24 hours.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm rounded-full bg-primary text-white hover:bg-primary/80"
          onClick={() => setShowComposer(true)}
        >
          New Status
        </button>
      </div>

      {loadingMine && (
        <div className="flex items-center justify-center py-10">
          <span className="loading loading-spinner text-primary" />
        </div>
      )}

      {mine.length > 0 && (
        <section>
          <h3 className="text-xs uppercase tracking-wide text-white/40">
            My status
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((status) => (
              <StatusCard key={status._id} status={status} isMine />
            ))}
          </div>
        </section>
      )}

      <section className="flex-1 overflow-y-auto">
        <h3 className="text-xs uppercase tracking-wide text-white/40">
          Recent updates
        </h3>
        {loadingFeed ? (
          <div className="flex items-center justify-center py-10">
            <span className="loading loading-spinner text-primary" />
          </div>
        ) : feed.length === 0 ? (
          <p className="mt-6 text-sm text-white/50">
            No recent updates yet. Check back later.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((status) => (
              <StatusCard key={status._id} status={status} />
            ))}
          </div>
        )}
      </section>

      {isEmpty && (
        <div className="flex flex-1 items-center justify-center text-center text-white/50">
          No statuses to show yet. Tap "New Status" to share something.
        </div>
      )}

      {showComposer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Create status</h3>
                <p className="text-xs text-white/50">
                  Share a quick text or media update.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost text-white"
                onClick={() => setShowComposer(false)}
              >
                Close
              </button>
            </div>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="What's on your mind?"
              className="textarea textarea-bordered h-32 w-full bg-white/5 text-sm text-white"
            />

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center text-sm text-white/60 transition hover:border-primary/40 hover:text-white">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="text-xs uppercase tracking-wide">Add media</span>
              <span className="text-[11px] text-white/40">
                Up to 3 images or videos
              </span>
            </label>

            {files.length > 0 && <div className="space-y-2">{renderFilesPreview}</div>}

            <div>
              <label className="text-xs uppercase tracking-wide text-white/40">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value)}
                className="select select-bordered mt-1 w-full bg-white/5 text-sm text-white"
              >
                <option value="public">Everyone</option>
                <option value="contacts" disabled>
                  My contacts (coming soon)
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="btn w-full bg-primary text-white hover:bg-primary/80"
              disabled={creating}
            >
              {creating ? "Posting..." : "Share"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StatusPanel;
