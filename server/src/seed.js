import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Competition, Participant, Asana, Assignment } from "./models/index.js";

await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([
  User.deleteMany({ email: { $in:[
    "admin@yogametrix.in","judge1@yogametrix.in","judge2@yogametrix.in",
    "judge3@yogametrix.in","chief@yogametrix.in"
  ] } }),
  Competition.deleteMany({ name:"YOGAMETRIX Demo Championship" })
]);
const [admin,judge1,judge2,judge3,chief] = await User.create([
  { name:"YOGAMETRIX Administrator",email:"admin@yogametrix.in",password:await bcrypt.hash("Admin@123",12),role:"admin" },
  { name:"Demo Judge 1",email:"judge1@yogametrix.in",password:await bcrypt.hash("Judge@123",12),role:"judge" },
  { name:"Demo Judge 2",email:"judge2@yogametrix.in",password:await bcrypt.hash("Judge@123",12),role:"judge" },
  { name:"Demo Judge 3",email:"judge3@yogametrix.in",password:await bcrypt.hash("Judge@123",12),role:"judge" },
  { name:"Chief Judge",email:"chief@yogametrix.in",password:await bcrypt.hash("Chief@123",12),role:"chief_judge" }
]);
const competition = await Competition.create({
  name:"YOGAMETRIX Demo Championship",venue:"Association Sports Hall",city:"Tamil Nadu",
  startDate:new Date(),status:"live",description:"Demo event for testing the scoring workflow."
});
const participants = await Participant.create([
  { competition:competition._id,fullName:"Ananya Kumar",chestNumber:"YM001",gender:"Female",ageGroup:"Under 14" },
  { competition:competition._id,fullName:"Arjun Raj",chestNumber:"YM002",gender:"Male",ageGroup:"Under 17" },
  { competition:competition._id,fullName:"Kavya S",chestNumber:"YM003",gender:"Female",ageGroup:"Open" }
]);
const asana = await Asana.create({ competition:competition._id,name:"Vrikshasana (Tree Pose)",sequence:1,maxMarks:10 });
await Assignment.create([judge1,judge2,judge3].map(judge=>({
  competition:competition._id,judge:judge._id,groupName:"Demo Group",stageName:"Stage 1"
})));
console.log("Seeded demo data:",admin.email,judge1.email,judge2.email,judge3.email,chief.email,participants.length,asana.name);
await mongoose.disconnect();
