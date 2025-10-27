import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiPhoneCall, FiVideo } from "react-icons/fi";
import { fetchCallLogsThunk } from "../../store/slice/call/call.thunk";
import { useEffect } from "react";
import { resolveAvatarUrl } from "../../utils/avatar";

const getDirectionLabel = (direction, status) => {
  if (status === "missed") return direction === "incoming" ? "Missed" : "No answer";
  if (status === "rejected") return "Declined";
  if (status === "cancelled") return direction === "outgoing" ? "Cancelled" : "Cancelled";
  return direction === "outgoing" ? "Outgoing" : "Incoming";
};

const getStatusMeta = (status) => {
  const labelMap = {
    dialing: "Dialing",
    ringing: "Ringing",
    ongoing: "On call",
    completed: "Completed",
    missed: "Missed",
    rejected: "Declined",
    cancelled: "Cancelled",
  };

  const colorMap = {
    dialing: "text-blue-300",
    ringing: "text-amber-300",
    ongoing: "text-emerald-300",
    completed: "text-emerald-300",
    missed: "text-red-400",
    rejected: "text-red-300",
    cancelled: "text-white/60",
  };

  return {
    label: labelMap[status] || status,
    className: colorMap[status] || "text-white/70",
  };
};

const CallHistoryPanel = () => {
  const dispatch = useDispatch();
  const { logs, loading, loaded } = useSelector((state) => state.callLogs);
  const { userProfile } = useSelector((state) => state.user);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!loaded) {
      dispatch(fetchCallLogsThunk());
    }
  }, [dispatch, loaded]);

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return logs;

    return logs.filter((log) => {
      const otherUser =
        log.callerId?._id === userProfile?._id ? log.calleeId : log.callerId;
      const name = otherUser?.name?.toLowerCase() || "";
      const username = otherUser?.username?.toLowerCase() || "";
      return name.includes(term) || username.includes(term);
    });
  }, [logs, query, userProfile?._id]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 backdrop-blur">
        <h2 className="text-lg font-semibold text-white">Call history</h2>
        <p className="text-xs text-white/50">
          Review your recent voice and video calls.
        </p>
        <div className="mt-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search calls"
            className="input input-bordered w-full rounded-full border-white/15 bg-white/10 text-sm text-white placeholder:text-white/40"
          />
        </div>
      </div>

      <section className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <span className="loading loading-spinner text-primary" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-white/50">
            No calls yet. Start a voice or video call to see it here.
          </div>
        ) : (
          <ul className="space-y-3">
          {filteredLogs.map((log) => {
            const isCaller = log.callerId?._id === userProfile?._id;
            const otherUser = isCaller ? log.calleeId : log.callerId;
            const directionLabel = getDirectionLabel(log.direction, log.status);
            const startedAt = log.startedAt
              ? new Date(log.startedAt).toLocaleString()
              : "";
            const durationLabel = log.duration
              ? `${Math.max(1, Math.round(log.duration / 1000))} sec`
              : "";
            const statusMeta = getStatusMeta(log.status);
            const avatarUrl = resolveAvatarUrl(
              otherUser,
              otherUser?.username || otherUser?.name || "call"
            );

            return (
              <li
                key={log._id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white shadow-lg shadow-black/15"
              >
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl}
                      alt={otherUser?.name || "Contact"}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">
                        {otherUser?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-white/60">
                        {directionLabel} · {startedAt}
                      </p>
                      {durationLabel && (
                        <p className="text-[11px] text-white/40">
                          Duration: {durationLabel}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    {log.mode === "video" ? (
                      <FiVideo size={18} />
                    ) : (
                      <FiPhoneCall size={18} />
                    )}
                    <span
                      className={`text-xs uppercase tracking-wide ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default CallHistoryPanel;
