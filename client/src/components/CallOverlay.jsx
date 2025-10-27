import { useEffect, useRef } from "react";
import { resolveAvatarUrl } from "../utils/avatar";

const statusTextMap = {
  calling: "Calling…",
  incoming: "Incoming call",
  connecting: "Connecting…",
  connected: "Connected",
  ended: "Call ended",
};

const CallOverlay = ({
  isOpen,
  mode,
  status,
  isCaller,
  remoteUser,
  localStream,
  remoteStream,
  onHangup,
  onAccept,
  onReject,
}) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!isOpen) return null;

  const isVideo = mode === "video";
  const displayName = remoteUser?.name || remoteUser?.username || "Unknown";
  const avatarUrl = resolveAvatarUrl(
    remoteUser,
    remoteUser?.username || remoteUser?.name
  );

  const callDirectionLabel = isCaller ? "Outgoing" : "Incoming";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#050b22]/95 p-6 shadow-2xl text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-white/50">
              {isVideo ? "Video Call" : "Voice Call"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{displayName}</h2>
            <p className="text-sm text-white/60">
              {(statusTextMap[status] || "Connecting") + ` · ${callDirectionLabel}`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost cursor-pointer text-white"
            onClick={onHangup}
          >
            Hang up
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="relative min-h-[12rem] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            {isVideo ? (
              remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/40">
                  Waiting for remote video…
                </div>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-24 w-24 rounded-full border-4 border-white/20 object-cover"
                />
                <p className="text-sm text-white/70">{displayName}</p>
              </div>
            )}
          </div>

          <div className="relative min-h-[12rem] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            {isVideo ? (
              localStream ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/40">
                  Your camera preview
                </div>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-white/60">
                <p className="text-sm">Microphone active</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          {status === "incoming" && (
            <>
              <button
                type="button"
                className="btn cursor-pointer bg-red-500 text-white hover:bg-red-600"
                onClick={onReject}
              >
                Decline
              </button>
              <button
                type="button"
                className="btn cursor-pointer bg-emerald-500 text-white hover:bg-emerald-600"
                onClick={onAccept}
              >
                Accept
              </button>
            </>
          )}
          {status !== "incoming" && (
            <button
              type="button"
              className="btn btn-error cursor-pointer text-white"
              onClick={onHangup}
            >
              End call
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;
