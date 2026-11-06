import "dotenv/config";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import api from "./routes/api.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", methods:["GET","POST","PATCH"] } });
app.set("io", io);
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit:"5mb" }));
app.use(morgan("tiny"));
app.use("/api", rateLimit({ windowMs: 60_000, limit: 300 }));
app.get("/api/health", (_req,res)=>res.json({ ok:true, service:"YOGAMETRIX API" }));
app.use("/api", api);
app.use((err,_req,res,_next)=> {
  console.error(err);
  if (err.code === 11000) return res.status(409).json({ message:"A record with these details already exists" });
  res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Server error" : err.message });
});
io.on("connection", socket => {
  socket.on("competition:join", async (id, ack) => {
    // Room membership is intentionally limited to a valid competition identifier.
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) return ack?.({ ok:false, message:"Invalid competition" });
    socket.join(`competition:${id}`);
    ack?.({ ok:true });
  });
  socket.on("competition:leave", id => socket.leave(`competition:${id}`));
});
const port = process.env.PORT || 5000;
await mongoose.connect(process.env.MONGODB_URI);
server.listen(port, ()=>console.log(`YOGAMETRIX API listening on ${port}`));
