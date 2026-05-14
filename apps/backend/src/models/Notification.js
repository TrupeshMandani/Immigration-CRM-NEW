/**
 * @deprecated Superseded by the Postgres `notifications` table
 * (apps/backend/src/db/schema/notifications.ts) introduced in Prompt 13.
 * All new code must use notifications.service.ts + notifications.routes.ts.
 * Retained only for any in-flight MongoDB data until a migration script
 * (Prompt 14+) backfills into Postgres.
 */
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientRole: { type: String, enum: ["admin", "student"], required: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId },
    actorName: { type: String },
    taskId: { type: mongoose.Schema.Types.ObjectId },
    taskTitle: { type: String },
    taskSummary: { type: String },
    type: {
      type: String,
      enum: ["TASK_COMPLETED"],
      required: true,
    },
    status: {
      type: String,
      enum: ["UNREAD", "READ"],
      default: "UNREAD",
      index: true,
    },
    meta: mongoose.Schema.Types.Mixed,
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index(
  { recipientUserId: 1, status: 1, createdAt: -1 },
  { name: "recipient_status_created" }
);

module.exports = mongoose.model("Notification", notificationSchema);
