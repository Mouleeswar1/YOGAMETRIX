import mongoose from "mongoose";
const { Schema, model } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin","judge","chief_judge","marshal","volunteer","display","participant","yoga_center"], default: "volunteer" },
  active: { type: Boolean, default: true },
  phone: String, centerName: String
}, { timestamps: true });

const competitionSchema = new Schema({
  name: { type: String, required: true, trim: true },
  venue: String, city: String, startDate: Date, endDate: Date,
  status: { type: String, enum: ["draft","registration","live","completed"], default: "draft" },
  description: String, registrationOpens: Date, registrationCloses: Date,
  scoringRules: {
    requiredJudges: { type: Number, default: 3, min: 1 },
    dropHighest: { type: Boolean, default: true },
    dropLowest: { type: Boolean, default: true },
    approvalRequired: { type: Boolean, default: true },
    maxMarks: { type: Number, default: 10, min: 1 }
  }
}, { timestamps: true });

const ageGroupSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  name: { type: String, required: true }, minAge: { type: Number, min: 0 }, maxAge: { type: Number, min: 0 },
  gender: { type: String, enum: ["Any","Male","Female","Other"], default: "Any" }, active: { type: Boolean, default: true }
}, { timestamps: true });
ageGroupSchema.index({ competition: 1, name: 1 }, { unique: true });

const stageSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  name: { type: String, required: true }, order: { type: Number, default: 1 },
  status: { type: String, enum: ["pending","active","completed","paused"], default: "pending" }, venue: String
}, { timestamps: true });

const groupSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  stage: { type: Schema.Types.ObjectId, ref: "Stage" }, ageGroup: { type: Schema.Types.ObjectId, ref: "AgeGroup" },
  name: { type: String, required: true }, order: { type: Number, default: 1 },
  marshal: { type: Schema.Types.ObjectId, ref: "User" }, chiefJudge: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending","active","completed","paused"], default: "pending" }
}, { timestamps: true });

const participantSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  fullName: { type: String, required: true, trim: true }, chestNumber: { type: String, required: true },
  gender: { type: String, enum: ["Male","Female","Other"], default: "Other" }, dateOfBirth: Date,
  ageGroup: String, ageGroupRef: { type: Schema.Types.ObjectId, ref: "AgeGroup" },
  yogaCentre: String, yogaCenterUser: { type: Schema.Types.ObjectId, ref: "User" },
  phone: String, email: String, photoUrl: String, documentUrls: [String],
  verificationStatus: { type: String, enum: ["pending","verified","rejected"], default: "pending" },
  registrationStatus: { type: String, enum: ["pending","approved","rejected"], default: "approved" },
  notes: String
}, { timestamps: true });
participantSchema.index({ competition: 1, chestNumber: 1 }, { unique: true });

const participantGroupSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  participant: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
  group: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  chestNumber: String
}, { timestamps: true });
participantGroupSchema.index({ participant: 1, group: 1 }, { unique: true });

const asanaSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  name: { type: String, required: true }, sequence: { type: Number, default: 1 },
  maxMarks: { type: Number, default: 10 }, group: { type: Schema.Types.ObjectId, ref: "Group" },
  imageUrl: String, instructions: String
}, { timestamps: true });

const assignmentSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  judge: { type: Schema.Types.ObjectId, ref: "User", required: true },
  group: { type: Schema.Types.ObjectId, ref: "Group" }, stage: { type: Schema.Types.ObjectId, ref: "Stage" },
  groupName: String, stageName: String, role: { type: String, enum: ["judge","chief_judge","marshal"], default: "judge" }
}, { timestamps: true });
assignmentSchema.index({ competition: 1, judge: 1, group: 1, stage: 1 }, { unique: true, sparse: true });

const registrationSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  participant: { type: Schema.Types.ObjectId, ref: "Participant" },
  submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  verificationNotes: String, documents: [String], submittedAt: { type: Date, default: Date.now },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" }, reviewedAt: Date
}, { timestamps: true });

const scoreSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  participant: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
  judge: { type: Schema.Types.ObjectId, ref: "User", required: true },
  asana: { type: Schema.Types.ObjectId, ref: "Asana", required: true },
  marks: { type: Number, required: true, min: 0, max: 10 }, remarks: String,
  status: { type: String, enum: ["submitted","approved","rejected"], default: "submitted" },
  submittedAt: { type: Date, default: Date.now }, updatedBy: { type: Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });
scoreSchema.index({ competition: 1, participant: 1, asana: 1, judge: 1 }, { unique: true });

const resultSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  participant: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
  asana: { type: Schema.Types.ObjectId, ref: "Asana", required: true },
  judgeCount: Number, includedMarks: [Number], excludedHighest: Number, excludedLowest: Number,
  total: Number, approved: { type: Boolean, default: false }, published: { type: Boolean, default: false },
  rank: Number, status: { type: String, enum: ["provisional","approved","published"], default: "provisional" }
}, { timestamps: true });
resultSchema.index({ competition: 1, participant: 1, asana: 1 }, { unique: true });

const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User" }, competition: { type: Schema.Types.ObjectId, ref: "Competition" },
  action: { type: String, required: true }, entity: String, entityId: String,
  before: Schema.Types.Mixed, after: Schema.Types.Mixed, reason: String, ip: String
}, { timestamps: true });

const feedbackSchema = new Schema({ name: String, email: String, subject: String, message: { type: String, required: true }, status: { type: String, default: "new" } }, { timestamps: true });
const certificateSchema = new Schema({
  competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true },
  participant: { type: Schema.Types.ObjectId, ref: "Participant", required: true },
  certificateNo: { type: String, required: true, unique: true }, template: String, issuedAt: { type: Date, default: Date.now }, metadata: Schema.Types.Mixed
}, { timestamps: true });

export const User = model("User", userSchema);
export const Competition = model("Competition", competitionSchema);
export const AgeGroup = model("AgeGroup", ageGroupSchema);
export const Stage = model("Stage", stageSchema);
export const Group = model("Group", groupSchema);
export const Participant = model("Participant", participantSchema);
export const ParticipantGroup = model("ParticipantGroup", participantGroupSchema);
export const Asana = model("Asana", asanaSchema);
export const Assignment = model("Assignment", assignmentSchema);
export const Registration = model("Registration", registrationSchema);
export const Score = model("Score", scoreSchema);
export const Result = model("Result", resultSchema);
export const AuditLog = model("AuditLog", auditLogSchema);
export const Feedback = model("Feedback", feedbackSchema);
export const Certificate = model("Certificate", certificateSchema);
