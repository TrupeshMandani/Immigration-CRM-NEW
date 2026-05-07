const mongoose = require("mongoose");

const UniSchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  program: { type: String, required: true },
  degreeLevel: { type: String, default: "" }, // Bachelors/Masters/Diploma/etc.
  eligibilityReason: { type: String, default: "" },
  tuitionFee: { type: Number, default: null },
  aiScore: { type: Number, min: 0, max: 1, default: 0.0 },
  website: { type: String, default: "" }
}, { _id: false });

const RecommendationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
      unique: true,
    },
    universities: { type: [UniSchema], default: [] },
    generatedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["openai", "fallback"],
      default: "openai",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recommendation", RecommendationSchema);
