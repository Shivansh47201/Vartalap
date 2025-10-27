import mongoose from "mongoose";

const statusAttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ["image", "video", "audio", "document", "other"],
      default: "image",
    },
    originalName: String,
    mimeType: String,
    size: Number,
    fileName: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const statusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    attachments: [statusAttachmentSchema],
    visibility: {
      type: String,
      enum: ["public", "contacts"],
      default: "public",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Status", statusSchema);
