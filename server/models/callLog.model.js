import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    calleeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    mode: {
      type: String,
      enum: ["voice", "video"],
      default: "voice",
    },
    direction: {
      type: String,
      enum: ["outgoing", "incoming"],
      default: "outgoing",
    },
    status: {
      type: String,
      enum: [
        "dialing",
        "ringing",
        "ongoing",
        "completed",
        "missed",
        "rejected",
        "cancelled",
      ],
      default: "completed",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("CallLog", callLogSchema);
