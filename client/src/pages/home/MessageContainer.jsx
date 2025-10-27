import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Message from "./Message";
import { useDispatch, useSelector } from "react-redux";
import {
  FiInbox,
  FiMessageSquare,
  FiPhoneCall,
  FiVideo,
  FiInfo,
  FiTrash2,
  FiArrowLeft,
} from "react-icons/fi";
import {
  getMessageThunk,
  markMessagesReadThunk,
} from "../../store/slice/message/message.thunk";
import {
  addMessage,
  markMessagesAsRead,
  resetMessages,
} from "../../store/slice/message/message.slice";
import { upsertConversation } from "../../store/slice/conversation/conversation.slice";
import {
  deleteConversationThunk,
  fetchConversationsThunk,
} from "../../store/slice/conversation/conversation.thunk";
import { getSocket } from "../../lib/socket";
import { setTypingStatus } from "../../store/slice/user/user.slice";
import toast from "react-hot-toast";
import SendMessage from "./SendMessage";
import CallOverlay from "../../components/CallOverlay";
import { createCallLogThunk } from "../../store/slice/call/call.thunk";
import {
  addTempLog,
  updateTempLog,
} from "../../store/slice/call/call.slice";
import { normalizeMediaUrl, resolveAvatarUrl } from "../../utils/avatar";

const PAGE_SIZE = 20;

const DEFAULT_CALL_STATE = {
  isOpen: false,
  mode: null,
  status: "idle",
  isCaller: false,
  remoteUser: null,
};

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const MessageContainer = ({ isMobile = false, isVisible = true, onBack }) => {
  const dispatch = useDispatch();
  const { userProfile, typingStatus, onlineUsers } = useSelector(
    (state) => state.user
  );
  const { conversations, selectedConversationId } = useSelector(
    (state) => state.conversation
  );
  const { messages, isFetching, moreLoading, hasMore, nextCursor } =
    useSelector((state) => state.message);
  const [showDetails, setShowDetails] = useState(false);
  const [callState, setCallState] = useState(DEFAULT_CALL_STATE);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const remoteUserIdRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const callTimeoutRef = useRef(null);
  const callStateRef = useRef(DEFAULT_CALL_STATE);
  const previousConversationIdRef = useRef(null);
  const callMetaRef = useRef(null);
  const callConnectedRef = useRef(false);
  const messageListRef = useRef(null);
  const scrollMemoryRef = useRef({ height: 0, top: 0 });
  const shouldMaintainScrollPosition = Boolean(scrollMemoryRef.current.height);

  const activeConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    return conversations.find((conv) => conv?._id === selectedConversationId);
  }, [conversations, selectedConversationId]);

  const isGroupConversation = Boolean(activeConversation?.isGroup);
  const otherMember = useMemo(() => {
    if (!activeConversation || isGroupConversation) return null;
    return activeConversation.members?.find(
      (member) => member?._id !== userProfile?._id
    );
  }, [activeConversation, isGroupConversation, userProfile?._id]);

  const conversationAvatar = useMemo(() => {
    if (isGroupConversation) {
      const seed = activeConversation?.name || "Group";
      const groupAvatar = normalizeMediaUrl(activeConversation?.avatar);
      return (
        groupAvatar ||
        `https://api.dicebear.com/6.x/identicon/svg?seed=${encodeURIComponent(
          seed
        )}`
      );
    }

    const fallbackSeed = otherMember?.username || otherMember?.name || "friend";
    return resolveAvatarUrl(otherMember, fallbackSeed);
  }, [activeConversation?.avatar, isGroupConversation, otherMember]);

  const conversationTitle = useMemo(() => {
    if (isGroupConversation) {
      return activeConversation?.name || "Group conversation";
    }
    return otherMember?.name || "Conversation";
  }, [activeConversation?.name, isGroupConversation, otherMember?.name]);

  const conversationSubtitle = useMemo(() => {
    if (isGroupConversation) {
      return `${activeConversation?.members?.length || 0} members`;
    }
    const otherMemberId = otherMember?._id;
    const isTyping = Boolean(otherMemberId && typingStatus?.[otherMemberId]);
    const isOnline = otherMemberId
      ? onlineUsers?.some((id) => id?.toString?.() === otherMemberId?.toString?.())
      : false;
    if (isTyping) return "Typing…";
    if (isOnline) return "Online";
    return otherMember?.username ? `@${otherMember.username}` : "Offline";
  }, [
    activeConversation?.members?.length,
    isGroupConversation,
    otherMember?._id,
    otherMember?.username,
    typingStatus,
    onlineUsers,
  ]);

  const handleDeleteConversation = async (conversationId) => {
    if (!conversationId) return;
    const confirmDelete = window.confirm(
      "Delete this conversation for everyone? This cannot be undone."
    );
    if (!confirmDelete) return;

    const result = await dispatch(
      deleteConversationThunk({ conversationId })
    );

    if (deleteConversationThunk.fulfilled.match(result)) {
      toast.success("Conversation deleted");
      dispatch(resetMessages());
    } else {
      toast.error(result.payload || "Unable to delete conversation");
    }
  };

  const getMemberAvatar = (member) => {
    if (!member) return resolveAvatarUrl(null, "user");

    const memberId = member?._id?.toString?.();
    const currentId = userProfile?._id?.toString?.();

    if (memberId && currentId && memberId === currentId) {
      return resolveAvatarUrl(
        userProfile,
        userProfile?.username || userProfile?.name,
        { preferDefaultFallback: true }
      );
    }

    return resolveAvatarUrl(member, member?.username || member?.name);
  };

  const findMemberById = useCallback((memberId) => {
    if (!memberId) return null;
    const targetId = memberId.toString();
    const fromActive = activeConversation?.members?.find((member) =>
      member?._id?.toString?.() === targetId
    );
    if (fromActive) return fromActive;
    for (const conversation of conversations || []) {
      const member = conversation?.members?.find(
        (item) => item?._id?.toString?.() === targetId
      );
      if (member) return member;
    }
    return null;
  }, [activeConversation, conversations]);

  const loadOlderMessages = useCallback(() => {
    if (!activeConversation?._id) return;
    if (!hasMore || moreLoading || isFetching) return;
    if (!nextCursor) return;

    const container = messageListRef.current;
    if (container) {
      scrollMemoryRef.current = {
        height: container.scrollHeight,
        top: container.scrollTop,
      };
    }

    dispatch(
      getMessageThunk({
        conversationId: activeConversation._id,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      })
    );
  }, [
    activeConversation?._id,
    hasMore,
    moreLoading,
    isFetching,
    nextCursor,
    dispatch,
  ]);

  const handleScroll = useCallback(
    (event) => {
      if (!hasMore || moreLoading || isFetching) return;
      if (event.currentTarget.scrollTop <= 80) {
        loadOlderMessages();
      }
    },
    [hasMore, moreLoading, isFetching, loadOlderMessages]
  );

  const resetCallTimer = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const resetCallMetadata = useCallback(() => {
    callMetaRef.current = null;
    callConnectedRef.current = false;
  }, []);

  const finalizeCallLog = useCallback(
    (statusOverride) => {
      const meta = callMetaRef.current;
      if (!meta || !meta.remoteUserId || !userProfile?._id) {
        resetCallMetadata();
        return;
      }

      const status =
        statusOverride ||
        (callConnectedRef.current
          ? "completed"
          : meta.direction === "incoming"
          ? "missed"
          : "cancelled");

      const startedAt = meta.startedAt || new Date().toISOString();
      const endedAt = new Date().toISOString();
      const duration = callConnectedRef.current
        ? Math.max(
            0,
            new Date(endedAt).getTime() -
              new Date(meta.connectedAt || meta.startedAt || Date.now()).getTime()
          )
        : 0;

      if (meta.tempId) {
        dispatch(
          updateTempLog({
            tempId: meta.tempId,
            updates: {
              status,
              endedAt,
              duration,
              pending: false,
            },
          })
        );
      }

      dispatch(
        createCallLogThunk({
          otherUserId: meta.remoteUserId,
          conversationId: meta.conversationId,
          mode: meta.mode || "voice",
          direction: meta.direction || "outgoing",
          status,
          startedAt,
          endedAt,
          duration,
          tempId: meta.tempId,
        })
      );

      resetCallMetadata();
    },
    [dispatch, userProfile?._id, resetCallMetadata]
  );

  const stopStream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
  };

  const cleanupCall = useCallback(({ showEnded = false } = {}) => {
    const snapshot = callStateRef.current;
    const lastRemoteUser = snapshot?.remoteUser || null;

    if (callMetaRef.current) {
      if (!callMetaRef.current.remoteUserId && lastRemoteUser?._id) {
        callMetaRef.current.remoteUserId = lastRemoteUser._id;
      }
      if (!callMetaRef.current.conversationId) {
        callMetaRef.current.conversationId = selectedConversationId;
      }
      if (!callMetaRef.current.mode && snapshot?.mode) {
        callMetaRef.current.mode = snapshot.mode;
      }

      let computedStatus = null;
      if (callConnectedRef.current) {
        computedStatus = "completed";
      } else if (snapshot?.status === "incoming" && snapshot?.isCaller === false) {
        computedStatus = "missed";
      } else if (snapshot?.status === "incoming" && snapshot?.isCaller) {
        computedStatus = "rejected";
      } else if (snapshot?.status === "calling" && snapshot?.isCaller) {
        computedStatus = "cancelled";
      }

      finalizeCallLog(computedStatus || undefined);
    } else {
      resetCallMetadata();
    }

    resetCallTimer();
    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch {
        /* ignore */
      }
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current = null;
    }

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);

    pendingOfferRef.current = null;
    pendingIceCandidatesRef.current = [];
    remoteUserIdRef.current = null;
    callIdRef.current = null;

    if (showEnded) {
      setCallState({
        ...DEFAULT_CALL_STATE,
        isOpen: true,
        status: "ended",
        remoteUser: lastRemoteUser,
      });
      callTimeoutRef.current = setTimeout(() => {
        setCallState({ ...DEFAULT_CALL_STATE });
        callTimeoutRef.current = null;
      }, 1200);
    } else {
      setCallState({ ...DEFAULT_CALL_STATE });
    }
  }, [selectedConversationId, finalizeCallLog, resetCallMetadata]);

  const flushPendingCandidates = useCallback(async (peer) => {
    if (!peer) return;
    const queued = pendingIceCandidatesRef.current;
    if (!queued || !queued.length) return;
    pendingIceCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await peer.addIceCandidate(candidate);
      } catch (error) {
        console.error("Failed to apply buffered ICE candidate", error);
      }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const socket = getSocket();
    if (!socket) {
      toast.error("Socket connection unavailable");
      return null;
    }

    if (typeof RTCPeerConnection === "undefined") {
      toast.error("Real-time calling is not supported here");
      return null;
    }

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peer.onicecandidate = (event) => {
      if (!event.candidate || !remoteUserIdRef.current) return;
      socket.emit("call:ice-candidate", {
        to: remoteUserIdRef.current,
        candidate: event.candidate,
        callId: callIdRef.current,
        conversationId:
          pendingOfferRef.current?.conversationId || selectedConversationId,
      });
    };

    peer.ontrack = (event) => {
      const [stream] = event.streams || [];
      if (stream) {
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      }
    };

    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === "connected") {
        callConnectedRef.current = true;
        if (callMetaRef.current) {
          callMetaRef.current.connectedAt = new Date().toISOString();
          if (callMetaRef.current.tempId) {
            dispatch(
              updateTempLog({
                tempId: callMetaRef.current.tempId,
                updates: {
                  status: "ongoing",
                },
              })
            );
          }
        }
        setCallState((prev) => ({ ...prev, status: "connected" }));
      } else if (state === "connecting") {
        setCallState((prev) => ({ ...prev, status: "connecting" }));
      } else if (["failed", "disconnected", "closed"].includes(state)) {
        if (state === "failed") {
          toast.error("Call connection failed");
        }
        cleanupCall();
      }
    };

    peerConnectionRef.current = peer;
    return peer;
  }, [cleanupCall, selectedConversationId, dispatch]);

  const startCall = useCallback(
    async (mode) => {
      if (isGroupConversation) {
        toast("Group calling is coming soon", { icon: "ℹ️" });
        return;
      }

    if (!otherMember?._id) {
      toast.error("Select someone to call first");
      return;
    }

    if (
      callStateRef.current?.isOpen &&
      callStateRef.current.status !== "idle" &&
      callStateRef.current.status !== "ended"
    ) {
      toast("You are already in a call", { icon: "ℹ️" });
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error("Calling is not supported in this browser");
      return;
    }

    const socket = getSocket();
    if (!socket) {
      toast.error("Socket connection unavailable");
      return;
    }

      resetCallMetadata();

      try {
        resetCallMetadata();

        const constraints =
          mode === "video"
            ? { audio: true, video: { facingMode: "user" } }
            : { audio: true };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);
        setRemoteStream(null);
        remoteStreamRef.current = null;

        setCallState({
          ...DEFAULT_CALL_STATE,
          isOpen: true,
          mode,
          status: "calling",
          isCaller: true,
          remoteUser: otherMember,
        });

        const peer = createPeerConnection();
        if (!peer) {
          throw new Error("Unable to create peer connection");
        }

        stream.getTracks().forEach((track) => peer.addTrack(track, stream));

        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        const callId = `${Date.now()}-${userProfile?._id || "caller"}`;
        callIdRef.current = callId;
        remoteUserIdRef.current = otherMember._id;

        callMetaRef.current = {
          tempId: `temp-${Date.now()}`,
          callId,
          remoteUserId: otherMember._id,
          mode,
          direction: "outgoing",
          startedAt: new Date().toISOString(),
          conversationId: selectedConversationId,
        };
        callConnectedRef.current = false;

        if (callMetaRef.current.tempId) {
          dispatch(
            addTempLog({
              _id: callMetaRef.current.tempId,
              tempId: callMetaRef.current.tempId,
              callerId: {
                _id: userProfile?._id,
                name: userProfile?.name,
                username: userProfile?.username,
                avatar: userProfile?.avatar,
              },
              calleeId: otherMember,
              mode,
              direction: "outgoing",
              status: "dialing",
              startedAt: callMetaRef.current.startedAt,
              pending: true,
            })
          );
        }

        socket.emit("call:offer", {
          to: otherMember._id,
          offer,
          mode,
          callId,
          conversationId: selectedConversationId,
          caller: {
            _id: userProfile?._id,
            name: userProfile?.name,
            username: userProfile?.username,
            avatar: userProfile?.avatar,
          },
        });

        setCallState((prev) => ({ ...prev, status: "calling" }));
      } catch (error) {
        console.error("Failed to start call", error);
        toast.error(error?.message || "Unable to place call");
      cleanupCall();
    }
  },
  [
    isGroupConversation,
    otherMember,
    userProfile?._id,
    userProfile?.avatar,
    userProfile?.name,
    userProfile?.username,
    createPeerConnection,
    selectedConversationId,
    cleanupCall,
    resetCallMetadata,
    dispatch,
  ]
);

  const acceptCall = useCallback(async () => {
    if (!pendingOfferRef.current?.offer) {
      cleanupCall();
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      toast.error("Calling is not supported in this browser");
      cleanupCall();
      return;
    }

    const socket = getSocket();
    if (!socket) {
      toast.error("Socket connection unavailable");
      cleanupCall();
      return;
    }

    try {
      const constraints =
        callState.mode === "video"
          ? { audio: true, video: { facingMode: "user" } }
          : { audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      callMetaRef.current = {
        callId: callIdRef.current,
        remoteUserId: remoteUserIdRef.current,
        mode: callState.mode || "voice",
        direction: "incoming",
        startedAt: new Date().toISOString(),
        conversationId:
          pendingOfferRef.current?.conversationId || selectedConversationId,
      };
      callConnectedRef.current = false;

      const peer = createPeerConnection();
      if (!peer) {
        throw new Error("Unable to create peer connection");
      }

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      await peer.setRemoteDescription(pendingOfferRef.current.offer);

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      await flushPendingCandidates(peer);

      socket.emit("call:answer", {
        to: remoteUserIdRef.current,
        answer,
        callId: callIdRef.current,
        conversationId:
          pendingOfferRef.current?.conversationId || selectedConversationId,
      });

      setCallState((prev) => ({ ...prev, status: "connecting" }));
    } catch (error) {
      console.error("Failed to accept call", error);
      toast.error(error?.message || "Unable to accept call");
      cleanupCall();
    }
  }, [callState.mode, cleanupCall, createPeerConnection, flushPendingCandidates, selectedConversationId]);

  const rejectCall = useCallback(() => {
    const socket = getSocket();
    if (socket && remoteUserIdRef.current) {
      socket.emit("call:reject", {
        to: remoteUserIdRef.current,
        callId: callIdRef.current,
        conversationId:
          pendingOfferRef.current?.conversationId || selectedConversationId,
        reason: "Call rejected",
      });
    }
    finalizeCallLog("rejected");
    cleanupCall();
  }, [cleanupCall, selectedConversationId, finalizeCallLog]);

  const hangupCall = useCallback(() => {
    const socket = getSocket();
    if (socket && remoteUserIdRef.current) {
      socket.emit("call:end", {
        to: remoteUserIdRef.current,
        callId: callIdRef.current,
        conversationId:
          pendingOfferRef.current?.conversationId || selectedConversationId,
      });
    }
    cleanupCall();
  }, [cleanupCall, selectedConversationId]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userProfile?._id) return;

    const handleIncomingOffer = (payload = {}) => {
      const { from, offer, mode, callId, conversationId, caller } = payload;
      if (!from || !offer) return;

      const fromId = from.toString?.() || from;
      if (fromId === (userProfile?._id?.toString?.() || userProfile?._id)) {
        return;
      }

      if (
        callStateRef.current?.isOpen &&
        callStateRef.current.status !== "idle" &&
        callStateRef.current.status !== "ended"
      ) {
        socket.emit("call:reject", {
          to: fromId,
          callId,
          conversationId,
          reason: "User is busy",
        });
        return;
      }

      remoteUserIdRef.current = fromId;
      callIdRef.current = callId || `${Date.now()}-${fromId}`;
      pendingOfferRef.current = { offer, conversationId };
      pendingIceCandidatesRef.current = [];

      const tempId = `temp-${Date.now()}`;
      callMetaRef.current = {
        tempId,
        callId: callIdRef.current,
        remoteUserId: fromId,
        mode: mode || "voice",
        direction: "incoming",
        startedAt: new Date().toISOString(),
        conversationId: conversationId || selectedConversationId,
      };
      callConnectedRef.current = false;

      setLocalStream(null);
      localStreamRef.current = null;
      setRemoteStream(null);
      remoteStreamRef.current = null;

      const remoteUser = caller || findMemberById(fromId) || { _id: fromId };

      if (callMetaRef.current.tempId) {
        dispatch(
          addTempLog({
            _id: tempId,
            tempId,
            callerId: caller || remoteUser,
            calleeId: {
              _id: userProfile?._id,
              name: userProfile?.name,
              username: userProfile?.username,
              avatar: userProfile?.avatar,
            },
            mode: mode || "voice",
            direction: "incoming",
            status: "ringing",
            startedAt: callMetaRef.current.startedAt,
            pending: true,
          })
        );
      }

      setCallState({
        ...DEFAULT_CALL_STATE,
        isOpen: true,
        mode: mode || "voice",
        status: "incoming",
        isCaller: false,
        remoteUser,
      });
    };

    const handleIncomingAnswer = async (payload = {}) => {
      const { answer, callId } = payload;
      if (!answer) return;
      if (callIdRef.current && callId && callId !== callIdRef.current) return;
      const peer = peerConnectionRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(answer);
        await flushPendingCandidates(peer);
        setCallState((prev) => ({ ...prev, status: "connecting" }));
      } catch (error) {
        console.error("Failed to process answer", error);
        toast.error("Call failed to connect");
        cleanupCall();
      }
    };

    const handleIncomingCandidate = async (payload = {}) => {
      const { candidate, callId } = payload;
      if (!candidate) return;
      if (callIdRef.current && callId && callId !== callIdRef.current) return;
      if (typeof RTCIceCandidate === "undefined") return;
      const rtcCandidate = new RTCIceCandidate(candidate);
      const peer = peerConnectionRef.current;
      if (peer) {
        try {
          await peer.addIceCandidate(rtcCandidate);
        } catch (error) {
          console.error("Failed to add ICE candidate", error);
        }
      } else {
        pendingIceCandidatesRef.current.push(rtcCandidate);
      }
    };

    const handleCallEnd = (payload = {}) => {
      const { callId } = payload;
      if (callIdRef.current && callId && callId !== callIdRef.current) return;
      toast("Call ended", { icon: "ℹ️" });
      cleanupCall();
    };

    const handleCallReject = (payload = {}) => {
      const { callId, reason } = payload;
      if (callIdRef.current && callId && callId !== callIdRef.current) return;
      toast(reason || "Call declined", { icon: "ℹ️" });
      finalizeCallLog("rejected");
      cleanupCall();
    };

    socket.on("call:offer", handleIncomingOffer);
    socket.on("call:answer", handleIncomingAnswer);
    socket.on("call:ice-candidate", handleIncomingCandidate);
    socket.on("call:end", handleCallEnd);
    socket.on("call:reject", handleCallReject);

    return () => {
      socket.off("call:offer", handleIncomingOffer);
      socket.off("call:answer", handleIncomingAnswer);
      socket.off("call:ice-candidate", handleIncomingCandidate);
      socket.off("call:end", handleCallEnd);
      socket.off("call:reject", handleCallReject);
    };
  }, [
    userProfile?._id,
    conversations,
    findMemberById,
    cleanupCall,
    flushPendingCandidates,
    selectedConversationId,
    finalizeCallLog,
    dispatch,
    userProfile?.avatar,
    userProfile?.name,
    userProfile?.username,
  ]);

  useEffect(() => {
    if (
      previousConversationIdRef.current &&
      previousConversationIdRef.current !== selectedConversationId &&
      callStateRef.current?.isOpen &&
      callStateRef.current.status !== "idle" &&
      callStateRef.current.status !== "ended"
    ) {
      hangupCall();
    }
    previousConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId, hangupCall]);

  useEffect(() => {
    return () => {
      if (
        callStateRef.current?.isOpen &&
        callStateRef.current.status !== "idle" &&
        remoteUserIdRef.current
      ) {
        hangupCall();
      } else {
        cleanupCall();
      }
    };
  }, [cleanupCall, hangupCall]);

  useEffect(() => {
    if (selectedConversationId) {
      dispatch(resetMessages());
      dispatch(
        getMessageThunk({
          conversationId: selectedConversationId,
          limit: PAGE_SIZE,
        })
      );
    } else {
      dispatch(resetMessages());
    }
    setShowDetails(false);
    scrollMemoryRef.current = { height: 0, top: 0 };
  }, [dispatch, selectedConversationId]);

  useEffect(() => {
    if (moreLoading) return;
    if (!scrollMemoryRef.current.height) return;
    const container = messageListRef.current;
    if (!container) return;
    const { height, top } = scrollMemoryRef.current;
    const delta = container.scrollHeight - height;
    container.scrollTop = Math.max(0, top + delta);
    scrollMemoryRef.current = { height: 0, top: 0 };
  }, [messages, moreLoading]);

  useEffect(() => {
    if (selectedConversationId && userProfile?._id) {
      dispatch(markMessagesReadThunk({ conversationId: selectedConversationId }));
    }
  }, [dispatch, selectedConversationId, userProfile?._id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userProfile?._id) return;

    const handleIncomingMessage = (incomingMessage) => {
      if (!incomingMessage) return;

      const conversationId =
        incomingMessage.conversationId?.toString?.() ||
        incomingMessage.conversationId;
      const senderId =
        incomingMessage.senderId?._id || incomingMessage.senderId?.toString?.() ||
        incomingMessage.senderId;

      if (!conversationId) return;

      const belongsToActiveConversation =
        conversationId === selectedConversationId;
      const sentByCurrentUser = senderId === userProfile._id;
      const shouldMarkUnread = !belongsToActiveConversation && !sentByCurrentUser;

      if (belongsToActiveConversation) {
        dispatch(addMessage(incomingMessage));

        if (senderId !== userProfile._id) {
          dispatch(
            markMessagesAsRead({ messageIds: [incomingMessage?._id] })
          );
          dispatch(markMessagesReadThunk({ conversationId }));
        }
      }

      const conversationExists = conversations.some(
        (conv) => conv?._id === conversationId
      );

      if (conversationExists) {
        dispatch(
          upsertConversation({
            _id: conversationId,
            lastMessage: incomingMessage,
            updatedAt: incomingMessage.createdAt,
            hasUnread: shouldMarkUnread,
          })
        );
      } else {
        dispatch(fetchConversationsThunk());
      }

      if (shouldMarkUnread) {
        const senderName =
          incomingMessage?.senderId?.name || "New message";
        toast(`${senderName}: ${incomingMessage?.message || "Message"}`, {
          icon: "💬",
        });
      }

      if (senderId && senderId !== userProfile._id) {
        dispatch(setTypingStatus({ userId: senderId, isTyping: false }));
      }
    };

    const handleMessagesRead = (payload) => {
      const { messageIds, readerId, conversationId } = payload || {};
      if (!Array.isArray(messageIds) || !messageIds.length) return;
      if (conversationId !== selectedConversationId) return;

      if (readerId === userProfile._id) {
        dispatch(markMessagesAsRead({ messageIds }));
      }
    };

    socket.on("message:new", handleIncomingMessage);
    socket.on("message:read", handleMessagesRead);

    return () => {
      socket.off("message:new", handleIncomingMessage);
      socket.off("message:read", handleMessagesRead);
    };
  }, [dispatch, selectedConversationId, userProfile?._id, conversations]);

  const isTypingOtherMember = useMemo(() => {
    if (!activeConversation || isGroupConversation) return false;
    const otherMemberId = otherMember?._id;
    return Boolean(otherMemberId && typingStatus?.[otherMemberId]);
  }, [activeConversation, isGroupConversation, otherMember?._id, typingStatus]);

  if (isMobile && !isVisible) {
    return null;
  }

  if (!activeConversation) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full text-center bg-white/[0.04] border border-white/10 rounded-3xl px-10 py-14 shadow-2xl backdrop-blur-sm">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
            <FiMessageSquare size={32} />
          </div>
          <h2 className="text-3xl font-semibold tracking-wide">Welcome to Vartalap</h2>
          <p className="mt-3 text-base text-white/70">
            Select a conversation on the left to begin chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isVisible ? "flex" : "hidden lg:flex"} relative z-10 flex h-full min-h-0 flex-1 flex-col`}
    >
      <div className="border-b border-white/10 px-4 pb-4 pt-5 lg:px-6 lg:pt-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[0_18px_45px_-25px_rgba(87,84,231,0.55)] backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex items-center gap-3 lg:gap-4">
            {isMobile && onBack && (
              <button
                type="button"
                className="mr-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-primary/60 hover:text-primary lg:hidden"
                onClick={onBack}
              >
                <FiArrowLeft size={18} />
              </button>
            )}
            <div className="relative">
              <img
                src={conversationAvatar}
                alt={conversationTitle}
                className="h-14 w-14 rounded-full border border-white/15 object-cover shadow-inner"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-wide">
                {conversationTitle}
              </h2>
              <p className="text-xs text-white/60">{conversationSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex items-center gap-3 text-white/70 lg:justify-end">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                onClick={() => startCall("voice")}
                title={
                  isGroupConversation
                  ? "Group voice calls are coming soon"
                  : "Start voice call"
              }
              disabled={isGroupConversation || !otherMember?._id}
            >
              <FiPhoneCall size={18} />
            </button>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 transition hover:border-primary/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                onClick={() => startCall("video")}
                title={
                  isGroupConversation
                  ? "Group video calls are coming soon"
                  : "Start video call"
              }
              disabled={isGroupConversation || !otherMember?._id}
            >
              <FiVideo size={18} />
            </button>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-white/10 bg-white/[0.04] p-2 transition hover:border-primary/60 hover:text-primary"
                onClick={() => setShowDetails(true)}
                title="Conversation details"
              >
                <FiInfo size={18} />
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full border border-white/10 bg-white/[0.04] p-2 transition hover:border-red-500/70 hover:text-red-400"
                onClick={() => handleDeleteConversation(activeConversation?._id)}
                title="Delete conversation"
              >
                <FiTrash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(87,84,231,0.08),_transparent_65%)] px-4 py-4 pb-32 sm:pb-28 lg:px-6 lg:py-6"
      >
        {isFetching ? (
          <div className="flex h-full items-center justify-center">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : Array.isArray(messages) && messages.length > 0 ? (
          <>
            {moreLoading && (
              <div className="flex justify-center pb-3 text-xs text-white/60">
                <span className="loading loading-spinner text-primary" />
              </div>
            )}
            {messages.map((messageDetails, index) => (
              <Message
                key={messageDetails?._id}
                messageDetails={messageDetails}
                currentUserId={userProfile?._id}
                members={activeConversation?.members}
                currentUserProfile={userProfile}
                isGroupConversation={isGroupConversation}
                shouldScrollIntoView={
                  !shouldMaintainScrollPosition && index === messages.length - 1
                }
              />
            ))}
            {isTypingOtherMember && (
              <div className="mt-3 text-sm text-primary/80">
                {otherMember?.name || "Someone"} is typing...
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-sm text-white/60">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-primary">
                <FiInbox size={28} />
              </div>
              <h3 className="text-lg font-semibold text-white">No messages yet</h3>
              <p className="mt-2 text-sm">
                Start the conversation by sending your first message.
              </p>
            </div>
          </div>
        )}
      </div>

      <SendMessage
        activeConversation={activeConversation}
        otherMember={otherMember}
        isGroupConversation={isGroupConversation}
      />

      <CallOverlay
        isOpen={callState.isOpen}
        mode={callState.mode}
        status={callState.status}
        isCaller={callState.isCaller}
        remoteUser={callState.remoteUser}
        localStream={localStream}
        remoteStream={remoteStream}
        onHangup={hangupCall}
        onAccept={acceptCall}
        onReject={rejectCall}
      />

      {showDetails && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-white">Conversation Details</h3>
                <p className="text-sm text-white/60">
                  {isGroupConversation ? "Group chat" : "Direct message"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost text-white"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">Overview</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-white/60">Conversation</p>
                    <p className="text-base font-semibold text-white">
                      {conversationTitle}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Messages</p>
                    <p className="text-base font-semibold text-white">
                      {messages.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Created</p>
                    <p className="text-base font-semibold text-white">
                      {activeConversation?.createdAt
                        ? new Date(activeConversation.createdAt).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">Members</p>
                <div className="mt-3 space-y-3">
                  {(activeConversation?.members || []).map((member) => {
                    const avatarUrl = getMemberAvatar(member);
                    const isCurrent = member?._id === userProfile?._id;
                    return (
                      <div
                        key={member?._id}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2"
                      >
                        <img
                          src={avatarUrl}
                          alt={member?.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="flex-1 text-sm text-white">
                          <p className="font-semibold">
                            {member?.name || "Member"}
                            {isCurrent && " (You)"}
                          </p>
                          <p className="text-xs text-white/50">
                            @{member?.username || "username"}
                          </p>
                          {member?.email && (
                            <p className="text-xs text-white/40">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
