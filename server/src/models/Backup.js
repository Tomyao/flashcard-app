import mongoose from "mongoose";

const backupSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Backup =
  mongoose.models.Backup || mongoose.model("Backup", backupSchema);
