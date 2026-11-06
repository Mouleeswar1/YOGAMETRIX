import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  User, Competition, Participant, Asana, Assignment, Score, Result, AgeGroup, Stage, Group,
  ParticipantGroup, Registration, AuditLog, Feedback, Certificate
} from "../models/index.js";
import { protect, allow } from "../middleware/auth.js";

const router = Router();
const safeUser = u => ({ id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, centerName: u.centerName });
const tokenFor = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: "12h" });
const audit = (req, action, entity, entityId, before=null, after=null, reason="") =>
  AuditLog.create({ actor:req.user?._id, competition:req.body?.competition || req.params?.competitionId,
    action, entity, entityId:String(entityId || ""), before, after, reason, ip:req.ip });
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

// Attach the current, non-rejected judge submissions to each result. The
// included flag mirrors the competition's high/low exclusion rule.
const withJudgeBreakdown = async rows => {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) return list;
  const competitionId = String(list[0].competition?._id || list[0].competition);
  const participantIds = [...new Set(list.map(r => String(r.participant?._id || r.participant)))];
  const asanaIds = [...new Set(list.map(r => String(r.asana?._id || r.asana)))];
  const [scores, competition] = await Promise.all([
    Score.find({
      competition: competitionId,
      participant: { $in: participantIds },
      asana: { $in: asanaIds },
      status: { $in: ["submitted", "approved"] }
    }).populate("judge", "name"),
    Competition.findById(competitionId).select("scoringRules")
  ]);
  const rules = competition?.scoringRules || {};
  const grouped = new Map();
  for (const score of scores) {
    const key = `${score.participant}:${score.asana}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(score);
  }
  return list.map(result => {
    const key = `${result.participant?._id || result.participant}:${result.asana?._id || result.asana}`;
    const ordered = [...(grouped.get(key) || [])].sort((a, b) =>
      a.marks - b.marks || String(a.judge?.name || "").localeCompare(String(b.judge?.name || ""))
    );
    const lowIndex = rules.dropLowest === false ? -1 : 0;
    const highIndex = rules.dropHighest === false ? -1 : ordered.length - 1;
    return {
      ...result.toObject(),
      judgeScores: ordered.map((score, index) => ({
        judgeId: score.judge?._id || score.judge,
        judgeName: score.judge?.name || "Judge",
        marks: score.marks,
        status: score.status,
        included: index !== lowIndex && index !== highIndex,
        excludedAs: index === lowIndex ? "lowest" : index === highIndex ? "highest" : null
      }))
    };
  });
};

const recalculateResult = async (competitionId, participantId, asanaId) => {
  const competition = await Competition.findById(competitionId);
  if (!competition) return null;
  const rules = competition.scoringRules || {};
  const required = rules.requiredJudges || 3;
  const scores = await Score.find({
    competition: competitionId, participant: participantId, asana: asanaId,
    status: { $in: ["submitted", "approved"] }
  });
  if (scores.length < required) return null;
  const values = scores.map(score => score.marks).sort((a,b)=>a-b);
  const start = rules.dropLowest === false ? 0 : 1;
  const end = rules.dropHighest === false ? values.length : values.length - 1;
  const included = values.slice(start, Math.max(start,end));
  const total = Number(included.reduce((sum,value)=>sum+value,0).toFixed(2));
  return Result.findOneAndUpdate(
    { competition:competitionId, participant:participantId, asana:asanaId },
    {
      judgeCount:values.length, includedMarks:included,
      excludedLowest:rules.dropLowest===false?null:values[0],
      excludedHighest:rules.dropHighest===false?null:values.at(-1),
      total, approved:!rules.approvalRequired, published:false, status:"provisional"
    },
    { upsert:true, new:true, setDefaultsOnInsert:true }
  );
};

// Public endpoints are deliberately registered before protect.
router.get("/public/competitions", asyncRoute(async (_req,res) =>
  res.json(await Competition.find({ status:{ $in:["registration","live","completed"] } }).select("name city venue startDate endDate status description").sort({startDate:-1}))));
router.get("/public/results/:competitionId/chest/:chestNumber", asyncRoute(async (req,res) => {
  const p = await Participant.findOne({ competition:req.params.competitionId, chestNumber:req.params.chestNumber, registrationStatus:"approved" }).select("fullName chestNumber gender ageGroup");
  if (!p) return res.status(404).json({message:"No published participant result found for this chest number"});
  const rows = await Result.find({ competition:req.params.competitionId, participant:p._id, published:true })
    .populate("asana","name sequence").select("competition participant asana total rank status");
  res.json({ participant:p, results:await withJudgeBreakdown(rows) });
}));
router.post("/public/feedback", asyncRoute(async (req,res) => {
  const {name,email,subject,message}=req.body;
  if (!message?.trim()) return res.status(400).json({message:"Message is required"});
  await Feedback.create({name,email,subject,message});
  res.status(201).json({message:"Feedback submitted"});
}));

// Public live scoreboard: published results only; no login required.
router.get("/scoreboard/:competitionId", asyncRoute(async (req,res)=>{
  const rows = await Result.find({competition:req.params.competitionId,approved:true,published:true})
    .populate("participant","fullName chestNumber ageGroup")
    .populate("asana","name sequence")
    .sort({total:-1});
  res.json(await withJudgeBreakdown(rows));
}));

router.post("/auth/login", asyncRoute(async (req,res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (!user || !user.active || !(await bcrypt.compare(password || "", user.password)))
    return res.status(401).json({ message: "Invalid email or password" });
  res.json({ token: tokenFor(user), user: safeUser(user) });
}));
router.get("/auth/me", protect, (req,res) => res.json({ user: safeUser(req.user) }));

router.use(protect);
router.get("/dashboard", asyncRoute(async (req,res) => {
  const [competitions, participants, judges, scores, pendingRegistrations, pendingResults] = await Promise.all([
    Competition.countDocuments(), Participant.countDocuments(), User.countDocuments({ role:"judge",active:true }),
    Score.countDocuments(), Registration.countDocuments({status:"pending"}), Result.countDocuments({approved:false})
  ]);
  const recent = await Competition.find().sort({createdAt:-1}).limit(5);
  res.json({stats:{competitions,participants,judges,scores,pendingRegistrations,pendingResults},recent});
}));

// Competitions and configuration
router.get("/competitions", asyncRoute(async (_req,res)=>res.json(await Competition.find().sort({createdAt:-1}))));
router.post("/competitions", allow("admin"), asyncRoute(async (req,res)=>{
  const item=await Competition.create(req.body); await audit(req,"create","Competition",item._id,null,item.toObject()); res.status(201).json(item);
}));
router.patch("/competitions/:id", allow("admin"), asyncRoute(async (req,res)=>{
  const before=await Competition.findById(req.params.id); if(!before)return res.status(404).json({message:"Competition not found"});
  const item=await Competition.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});
  await audit(req,"update","Competition",item._id,before.toObject(),item.toObject()); res.json(item);
}));
router.delete("/competitions/:id", allow("admin"), asyncRoute(async (req,res)=>{
  const item=await Competition.findByIdAndDelete(req.params.id); if(!item)return res.status(404).json({message:"Competition not found"});
  await audit(req,"delete","Competition",item._id,item.toObject(),null); res.json({message:"Competition deleted"});
}));

// Age groups, stages and competition groups
router.get("/age-groups", asyncRoute(async (req,res)=>res.json(await AgeGroup.find(req.query.competition?{competition:req.query.competition}:{}).sort({minAge:1}))));
router.post("/age-groups", allow("admin"), asyncRoute(async (req,res)=>res.status(201).json(await AgeGroup.create(req.body))));
router.patch("/age-groups/:id", allow("admin"), asyncRoute(async (req,res)=>{const x=await AgeGroup.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!x)return res.status(404).json({message:"Age group not found"});res.json(x)}));
router.delete("/age-groups/:id", allow("admin"), asyncRoute(async (req,res)=>{await AgeGroup.findByIdAndDelete(req.params.id);res.json({message:"Age group deleted"})}));

router.get("/stages", asyncRoute(async (req,res)=>res.json(await Stage.find(req.query.competition?{competition:req.query.competition}:{}).sort({order:1}))));
router.post("/stages", allow("admin"), asyncRoute(async (req,res)=>res.status(201).json(await Stage.create(req.body))));
router.patch("/stages/:id", allow("admin","marshal"), asyncRoute(async (req,res)=>{const x=await Stage.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!x)return res.status(404).json({message:"Stage not found"});res.json(x)}));

router.get("/groups", asyncRoute(async (req,res)=>res.json(await Group.find(req.query.competition?{competition:req.query.competition}:{}).populate("stage ageGroup marshal chiefJudge").sort({order:1}))));
router.post("/groups", allow("admin"), asyncRoute(async (req,res)=>res.status(201).json(await Group.create(req.body))));
router.patch("/groups/:id", allow("admin","marshal"), asyncRoute(async (req,res)=>{const x=await Group.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!x)return res.status(404).json({message:"Group not found"});res.json(x)}));
router.post("/groups/:id/participants", allow("admin","marshal","volunteer"), asyncRoute(async (req,res)=>{
  const {participant}=req.body; const g=await Group.findById(req.params.id); if(!g)return res.status(404).json({message:"Group not found"});
  const row=await ParticipantGroup.findOneAndUpdate({participant,group:g._id},{competition:g.competition,participant,group:g._id},{upsert:true,new:true,setDefaultsOnInsert:true});
  res.status(201).json(row);
}));

// User and official management
router.get("/users", allow("admin"), asyncRoute(async (_req,res)=>res.json((await User.find().select("-password").sort({name:1})).map(safeUser))));
router.post("/users", allow("admin"), asyncRoute(async (req,res)=>{
  const {name,email,password,role,phone,centerName}=req.body;
  if(!name||!email||!password||!role)return res.status(400).json({message:"Name, email, password and role are required"});
  const user=await User.create({name,email,password:await bcrypt.hash(password,12),role,phone,centerName});
  res.status(201).json(safeUser(user));
}));
router.patch("/users/:id", allow("admin"), asyncRoute(async (req,res)=>{
  const update={...req.body}; delete update.password;
  const user=await User.findByIdAndUpdate(req.params.id,update,{new:true,runValidators:true}).select("-password");
  if(!user)return res.status(404).json({message:"User not found"}); res.json(safeUser(user));
}));
router.post("/users/:id/reset-password", allow("admin"), asyncRoute(async (req,res)=>{
  if(!req.body.password || req.body.password.length<10)return res.status(400).json({message:"Use a password of at least 10 characters"});
  const user=await User.findByIdAndUpdate(req.params.id,{password:await bcrypt.hash(req.body.password,12)});
  if(!user)return res.status(404).json({message:"User not found"}); await audit(req,"password-reset","User",user._id); res.json({message:"Password updated"});
}));
router.get("/judges", allow("admin","chief_judge","marshal"), asyncRoute(async (_req,res)=>res.json((await User.find({role:{$in:["judge","chief_judge"]},active:true}).select("name email role")).map(safeUser))));
router.post("/judges", allow("admin"), asyncRoute(async (req,res)=>{
  const {name,email,password,role="judge"}=req.body;
  if(!name||!email||!password)return res.status(400).json({message:"Name, email and password are required"});
  const user=await User.create({name,email,password:await bcrypt.hash(password,12),role});
  res.status(201).json(safeUser(user));
}));
router.post("/assignments", allow("admin","marshal"), asyncRoute(async (req,res)=>{
  const {competition,judge,group=null,stage=null}=req.body;
  const item=await Assignment.findOneAndUpdate({competition,judge,group,stage},req.body,{upsert:true,new:true,setDefaultsOnInsert:true});
  await audit(req,"assign-official","Assignment",item._id,null,item.toObject()); res.json(item);
}));
router.get("/assignments", allow("admin","chief_judge","marshal","judge"), asyncRoute(async (req,res)=>{
  const f={}; if(req.query.competition)f.competition=req.query.competition;
  if(req.user.role==="judge")f.judge=req.user._id;
  res.json(await Assignment.find(f).populate("judge","name email role").populate("group stage"));
}));

// Participants and registrations
router.get("/participants", asyncRoute(async (req,res)=>{
  const filter={}; if(req.query.competition)filter.competition=req.query.competition;
  if(req.user.role==="yoga_center")filter.yogaCenterUser=req.user._id;
  if(req.user.role==="participant")filter.email=req.user.email;
  res.json(await Participant.find(filter).populate("competition","name").sort({createdAt:-1}));
}));
router.post("/participants", allow("admin","marshal","volunteer","yoga_center"), asyncRoute(async (req,res)=>{
  const payload={...req.body}; if(req.user.role==="yoga_center"){payload.yogaCenterUser=req.user._id;payload.yogaCentre=req.user.centerName||req.user.name;payload.registrationStatus="pending";}
  const item=await Participant.create(payload);
  await Registration.create({competition:item.competition,participant:item._id,submittedBy:req.user._id,status:item.registrationStatus==="approved"?"approved":"pending"});
  res.status(201).json(item);
}));
router.patch("/participants/:id", allow("admin","marshal","volunteer"), asyncRoute(async (req,res)=>{
  const item=await Participant.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});
  if(!item)return res.status(404).json({message:"Participant not found"}); res.json(item);
}));
router.delete("/participants/:id", allow("admin"), asyncRoute(async (req,res)=>{await Participant.findByIdAndDelete(req.params.id);res.json({message:"Participant deleted"})}));
router.get("/registrations", allow("admin","marshal","volunteer"), asyncRoute(async (req,res)=>{
  const f={}; if(req.query.competition)f.competition=req.query.competition; if(req.query.status)f.status=req.query.status;
  res.json(await Registration.find(f).populate("participant").populate("competition","name").populate("submittedBy","name email").sort({createdAt:-1}));
}));
router.patch("/registrations/:id/review", allow("admin","marshal"), asyncRoute(async (req,res)=>{
  const {status,verificationNotes}=req.body; if(!["approved","rejected"].includes(status))return res.status(400).json({message:"Status must be approved or rejected"});
  const r=await Registration.findByIdAndUpdate(req.params.id,{status,verificationNotes,reviewedBy:req.user._id,reviewedAt:new Date()},{new:true}).populate("participant");
  if(!r)return res.status(404).json({message:"Registration not found"});
  if(r.participant)await Participant.findByIdAndUpdate(r.participant._id,{registrationStatus:status,verificationStatus:status==="approved"?"verified":"rejected"});
  await audit(req,"registration-review","Registration",r._id,null,{status,verificationNotes}); res.json(r);
}));

// Asanas and scoring
router.get("/asanas", asyncRoute(async (req,res)=>res.json(await Asana.find(req.query.competition?{competition:req.query.competition}:{}).populate("group","name").sort({sequence:1}))));
router.post("/asanas", allow("admin"), asyncRoute(async (req,res)=>res.status(201).json(await Asana.create(req.body))));
router.patch("/asanas/:id", allow("admin"), asyncRoute(async (req,res)=>{const x=await Asana.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});if(!x)return res.status(404).json({message:"Asana not found"});res.json(x)}));

router.post("/scores", allow("judge","admin"), asyncRoute(async (req,res)=>{
  const {competition,participant,asana,marks,remarks=""}=req.body;
  const numeric=Number(marks);
  if(![competition,participant,asana].every(Boolean)||!Number.isFinite(numeric)||numeric<0||numeric>10)return res.status(400).json({message:"Provide competition, participant, asana and marks from 0 to 10"});
  const assignment=req.user.role==="judge"?await Assignment.findOne({competition,judge:req.user._id}):true;
  if(!assignment)return res.status(403).json({message:"You are not assigned to this competition"});
  const item=await Score.findOneAndUpdate({competition,participant,asana,judge:req.user._id},{marks:numeric,remarks,status:"submitted",submittedAt:new Date()},{upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true});
  const comp=await Competition.findById(competition); const rules=comp?.scoringRules||{};
  const needed=rules.requiredJudges||3;
  const scores=await Score.find({competition,participant,asana,status:{$in:["submitted","approved"]}});
  let result=null;
  if(scores.length>=needed){
    const vals=scores.map(s=>s.marks).sort((a,b)=>a-b);
    const start=rules.dropLowest===false?0:1, end=rules.dropHighest===false?vals.length:vals.length-1;
    const included=vals.slice(start,Math.max(start,end));
    const total=Number(included.reduce((a,b)=>a+b,0).toFixed(2));
    result=await Result.findOneAndUpdate({competition,participant,asana},{judgeCount:vals.length,includedMarks:included,excludedLowest:rules.dropLowest===false?null:vals[0],excludedHighest:rules.dropHighest===false?null:vals.at(-1),total,approved:!rules.approvalRequired,published:false,status:"provisional"},{upsert:true,new:true,setDefaultsOnInsert:true});
    req.app.get("io").to(`competition:${competition}`).emit("score:update",{resultId:result._id,competition,participant,asana,total,approved:result.approved});
  }
  req.app.get("io").to(`competition:${competition}`).emit("score:submission",{competition,participant,asana,submitted:scores.length,required:needed});
  await audit(req,"score-submit","Score",item._id,null,{marks:numeric,remarks});
  res.status(201).json({score:item,submitted:scores.length,required:needed,result});
}));
router.get("/scores/mine", allow("judge"), asyncRoute(async (req,res)=>res.json(await Score.find({judge:req.user._id}).populate("participant","fullName chestNumber").populate("asana","name").sort({updatedAt:-1}).limit(200))));
router.get("/scores", allow("admin","chief_judge","marshal"), asyncRoute(async (req,res)=>{
  const f={}; for(const k of ["competition","participant","asana","status"])if(req.query[k])f[k]=req.query[k];
  res.json(await Score.find(f).populate("judge","name").populate("participant","fullName chestNumber").populate("asana","name").sort({createdAt:-1}));
}));
router.patch("/scores/:id", allow("admin","chief_judge"), asyncRoute(async (req,res)=>{
  const old=await Score.findById(req.params.id); if(!old)return res.status(404).json({message:"Score not found"});
  if(!req.body.reason?.trim())return res.status(400).json({message:"A correction reason is required"});
  const updated=await Score.findByIdAndUpdate(req.params.id,{marks:req.body.marks,remarks:req.body.remarks,updatedBy:req.user._id},{new:true,runValidators:true});
  const result = await recalculateResult(updated.competition,updated.participant,updated.asana);
  await audit(req,"score-correction","Score",updated._id,old.toObject(),updated.toObject(),req.body.reason);
  if (result) req.app.get("io").to(`competition:${updated.competition}`).emit("score:update",{resultId:result._id,competition:updated.competition,participant:updated.participant,asana:updated.asana,total:result.total,approved:result.approved});
  res.json({score:updated,result});
}));
router.get("/results", asyncRoute(async (req,res)=>{
  const filter={}; if(req.query.competition)filter.competition=req.query.competition;
  if(req.user.role==="judge"||req.user.role==="display")filter.published=true;
  if(req.query.status==="published")filter.published=true;
  const rows = await Result.find(filter).populate("participant","fullName chestNumber ageGroup").populate("asana","name sequence").populate("competition","name").sort({total:-1});
  res.json(await withJudgeBreakdown(rows));
}));
router.patch("/results/:id/approve", allow("chief_judge","admin"), asyncRoute(async (req,res)=>{
  const item=await Result.findByIdAndUpdate(req.params.id,{approved:true,status:"approved"},{new:true}).populate("participant","fullName chestNumber").populate("asana","name");
  if(!item)return res.status(404).json({message:"Result not found"});
  await audit(req,"result-approve","Result",item._id); req.app.get("io").to(`competition:${item.competition}`).emit("score:approved",{resultId:item._id,total:item.total}); res.json(item);
}));
router.patch("/results/:id/publish", allow("admin","chief_judge"), asyncRoute(async (req,res)=>{
  const item=await Result.findOneAndUpdate({_id:req.params.id,approved:true},{published:true,status:"published"},{new:true});
  if(!item)return res.status(404).json({message:"Approved result not found"});
  await audit(req,"result-publish","Result",item._id); req.app.get("io").to(`competition:${item.competition}`).emit("result:published",{resultId:item._id}); res.json(item);
}));
// Marshal stage operations
router.post("/marshal/groups/:id/start", allow("admin","marshal"), asyncRoute(async (req,res)=>{
  const g=await Group.findByIdAndUpdate(req.params.id,{status:"active"},{new:true}); if(!g)return res.status(404).json({message:"Group not found"});
  req.app.get("io").to(`competition:${g.competition}`).emit("stage:started",{groupId:g._id}); res.json(g);
}));
router.post("/marshal/groups/:id/complete", allow("admin","marshal"), asyncRoute(async (req,res)=>{
  const g=await Group.findByIdAndUpdate(req.params.id,{status:"completed"},{new:true}); if(!g)return res.status(404).json({message:"Group not found"});
  req.app.get("io").to(`competition:${g.competition}`).emit("stage:completed",{groupId:g._id}); res.json(g);
}));
router.post("/marshal/participants/:id/postpone", allow("admin","marshal"), asyncRoute(async (req,res)=>{
  const p=await Participant.findByIdAndUpdate(req.params.id,{notes:req.body.reason||"Postponed"},{new:true}); if(!p)return res.status(404).json({message:"Participant not found"});
  req.app.get("io").to(`competition:${p.competition}`).emit("participant:postponed",{participantId:p._id,reason:req.body.reason||""}); res.json(p);
}));

// Certificates: HTML print view is provided; a signed/approved template must be configured by the association.
router.post("/certificates", allow("admin","chief_judge"), asyncRoute(async (req,res)=>{
  const {competition,participant,certificateNo}=req.body;
  if(!competition||!participant||!certificateNo)return res.status(400).json({message:"competition, participant and certificateNo are required"});
  const cert=await Certificate.create({competition,participant,certificateNo,template:req.body.template,metadata:req.body.metadata});
  res.status(201).json(cert);
}));
router.get("/certificates", allow("admin","chief_judge"), asyncRoute(async (req,res)=>{
  const f={}; if(req.query.competition)f.competition=req.query.competition;
  res.json(await Certificate.find(f).populate("participant","fullName chestNumber").populate("competition","name").sort({issuedAt:-1}));
}));
router.get("/reports/summary", allow("admin","chief_judge"), asyncRoute(async (_req,res)=>{
  const [participants,scores,results,registrations]=await Promise.all([Participant.countDocuments(),Score.countDocuments(),Result.countDocuments(),Registration.countDocuments()]);
  res.json({participants,scores,results,registrations});
}));
router.get("/reports/participants.csv", allow("admin","chief_judge","marshal"), asyncRoute(async (req,res)=>{
  const f={}; if(req.query.competition)f.competition=req.query.competition;
  const rows=await Participant.find(f).populate("competition","name").sort({chestNumber:1});
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const lines=[["Competition","Chest Number","Name","Gender","DOB","Age Group","Yoga Centre","Phone","Registration"].join(","),
    ...rows.map(p=>[p.competition?.name,p.chestNumber,p.fullName,p.gender,p.dateOfBirth?.toISOString?.().slice(0,10),p.ageGroup,p.yogaCentre,p.phone,p.registrationStatus].map(q).join(","))];
  res.setHeader("Content-Type","text/csv; charset=utf-8"); res.setHeader("Content-Disposition",'attachment; filename="yogametrix-participants.csv"'); res.send(lines.join("\r\n"));
}));
router.get("/audit-logs", allow("admin"), asyncRoute(async (req,res)=>{
  const f={}; if(req.query.competition)f.competition=req.query.competition;
  res.json(await AuditLog.find(f).populate("actor","name email").sort({createdAt:-1}).limit(500));
}));
router.get("/feedback", allow("admin"), asyncRoute(async (_req,res)=>res.json(await Feedback.find().sort({createdAt:-1}).limit(300))));
router.patch("/feedback/:id", allow("admin"), asyncRoute(async (req,res)=>{
  const f=await Feedback.findByIdAndUpdate(req.params.id,{status:req.body.status||"reviewed"},{new:true}); if(!f)return res.status(404).json({message:"Feedback not found"}); res.json(f);
}));

export default router;
