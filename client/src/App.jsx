import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, NavLink, useNavigate, useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { API, api, token } from "./api";
import Management from "./Management";
import PublicPortal from "./PublicPortal";
import {
  Activity, Award, CalendarDays, ChartNoAxesCombined, CheckCircle2, ChevronRight,
  ClipboardList, Clock3, FileText, Home, LogOut, Menu, Plus, Search, Settings,
  ShieldCheck, Trophy, Users, X, Zap, UserRound, Bell, Download
} from "lucide-react";

const logo = "/src/association-logo.png";
const roleLabel = r => ({admin:"Administrator",judge:"Judge",chief_judge:"Chief Judge",marshal:"Stage Marshal",volunteer:"Volunteer",display:"Display Manager"}[r] || r);
function App(){
  const [user,setUser] = useState(()=>JSON.parse(localStorage.getItem("ym_user")||"null"));
  const [sidebar,setSidebar] = useState(false);
  const nav = useNavigate(), loc = useLocation();
  const signOut=()=>{localStorage.removeItem("ym_token");localStorage.removeItem("ym_user");setUser(null);nav("/login");};
  useEffect(()=>{if(token()){api("/auth/me").then(d=>{setUser(d.user);localStorage.setItem("ym_user",JSON.stringify(d.user))}).catch(e=>{if(e.status===401||e.status===403){localStorage.removeItem("ym_token");localStorage.removeItem("ym_user");setUser(null)}})}},[]);
  if(!user && loc.pathname === "/scoreboard") return <PublicScoreboardPage/>;
  if(!user && loc.pathname!=="/login" && !loc.pathname.startsWith("/public")) return <Login onLogin={u=>setUser(u)}/>;
  if(loc.pathname.startsWith("/public")) return <PublicPortal/>;
  if(loc.pathname==="/login") return <Login onLogin={u=>setUser(u)}/>;
  const links=[
    ["Overview","/",Home],["Competitions","/competitions",Trophy],["Participants","/participants",Users],
    ["Competition Management","/management",ClipboardList],["Judge Scoring","/scoring",Activity],
    ["Live Scoreboard","/scoreboard",ChartNoAxesCombined],["Results & Reports","/results",Award]
  ];
  const visibleLinks=links.filter(([label,path])=>(path!=="/management"||["admin","judge","chief_judge","marshal","volunteer"].includes(user.role))&&(path!=="/scoring"||["admin","judge"].includes(user.role)));
  return <div className="shell">
    <aside className={`sidebar ${sidebar?"show":""}`}>
      <div className="brand"><img src={logo}/><div><b>YOGAMETRIX</b><small>Score • Perform • Excel</small></div><button className="mobile-close" onClick={()=>setSidebar(false)}><X size={18}/></button></div>
      <div className="workspace"><span className="avatar">YM</span><div><b>TNPQRYTWA</b><small>Association workspace</small></div></div>
      <p className="nav-caption">WORKSPACE</p>
      <nav>{visibleLinks.map(([label,path,Icon])=><NavLink key={path} to={path} end={path==="/"} onClick={()=>setSidebar(false)}><Icon size={18}/>{label}{path==="/scoreboard"&&<span className="live-dot"/>}</NavLink>)}</nav>
      <p className="nav-caption">PREFERENCES</p>
      <nav><NavLink to="/settings"><Settings size={18}/>Settings</NavLink></nav>
      <div className="sidebar-bottom"><div className="help-card"><ShieldCheck size={18}/><b>Competition ready</b><small>Manage your event from one place.</small></div><div className="profile"><span className="avatar">{user.name?.slice(0,1)||"U"}</span><div><b>{user.name}</b><small>{roleLabel(user.role)}</small></div><button title="Sign out" onClick={signOut}><LogOut size={17}/></button></div></div>
    </aside>
    {sidebar&&<div className="scrim" onClick={()=>setSidebar(false)}/>}
    <main className="main">
      <header className="topbar"><button className="menu-btn" onClick={()=>setSidebar(true)}><Menu/></button><div className="crumb">Workspace <ChevronRight size={14}/> <b>{visibleLinks.find(x=>x[1]===loc.pathname)?.[0]||"Settings"}</b></div><div className="top-actions"><span className="online"><i/> System online</span><button className="icon-btn" aria-label="Notifications"><Bell size={18}/></button><span className="top-avatar" title={user.name}>{user.name?.slice(0,1)}</span><button className="btn small secondary top-logout" onClick={signOut}><LogOut size={15}/> Logout</button></div></header>
      <div className="page"><Routes>
        <Route path="/" element={<Dashboard/>}/><Route path="/competitions" element={<Competitions user={user}/>}/>
        <Route path="/participants" element={<Participants user={user}/>}/><Route path="/management" element={<Management user={user}/>}/><Route path="/scoring" element={<Scoring user={user}/>}/>
        <Route path="/scoreboard" element={<Scoreboard/>}/><Route path="/results" element={<Results user={user}/>}/>
        <Route path="/settings" element={<SettingsPage user={user}/>}/><Route path="*" element={<Dashboard/>}/>
      </Routes></div>
    </main>
  </div>
}

function Login({onLogin}){
 const [email,setEmail]=useState("admin@yogametrix.in"),[password,setPassword]=useState("Admin@123"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const nav=useNavigate();
 async function submit(e){e.preventDefault();setBusy(true);setError("");try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email,password})});localStorage.setItem("ym_token",d.token);localStorage.setItem("ym_user",JSON.stringify(d.user));onLogin(d.user);nav("/");}catch(err){setError(err.message)}finally{setBusy(false)}}
 return <div className="login-page"><div className="login-art"><div className="art-glow"/><img src={logo}/><div className="art-copy"><span className="eyebrow">TNPQRYTWA • DIGITAL PLATFORM</span><h1>Precision in<br/><em>Every Asana.</em></h1><p>One connected platform for competitions, judging and performance.</p><div className="art-points"><span><CheckCircle2/> Accurate scoring</span><span><Zap/> Fast live updates</span><span><ShieldCheck/> Trusted workflows</span></div></div></div><div className="login-panel"><div className="login-box"><img className="login-logo" src={logo}/><span className="eyebrow">WELCOME BACK</span><h2>Sign in to YOGAMETRIX</h2><p className="muted">Access your competition workspace.</p><form onSubmit={submit}><label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>{error&&<div className="error">{error}</div>}<button className="btn primary full" disabled={busy}>{busy?"Signing in…":"Sign in"} <ChevronRight size={17}/></button></form><div className="demo-note"><b>Demo access</b><span>admin@yogametrix.in · Admin@123</span><span>judge1@yogametrix.in · Judge@123</span><span>chief@yogametrix.in · Chief@123</span></div><div className="public-login-links"><a href="/scoreboard">Live scoreboard</a><a href="/public-results">Check public results</a><a href="/public-feedback">Send feedback</a></div><small className="copyright">© {new Date().getFullYear()} TNPQRYTWA · YOGAMETRIX</small></div></div></div>
}

function PageTitle({eyebrow,title,sub,action}){return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{sub}</p></div>{action}</div>}
function Dashboard(){
 const [data,setData]=useState(null),[err,setErr]=useState("");
 useEffect(()=>{api("/dashboard").then(setData).catch(e=>setErr(e.message))},[]);
 const stats=[["Total competitions",data?.stats.competitions??"—",CalendarDays,"teal"],["Registered participants",data?.stats.participants??"—",Users,"green"],["Active judges",data?.stats.judges??"—",ShieldCheck,"blue"],["Score submissions",data?.stats.scores??"—",Activity,"gold"]];
 return <><PageTitle eyebrow="OVERVIEW" title="Good day. Namaste 🙏" sub="Here’s what’s happening across your yoga competitions." action={<span className="date-chip"><Clock3 size={15}/>{new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>}/>
 {err&&<div className="error">{err}</div>}<div className="welcome-banner"><div><span className="eyebrow light">TNPQRYTWA • YOGA COMPETITION MANAGEMENT</span><h2>Score with precision.<br/><em>Perform with purpose.</em></h2><p>Everything your competition needs, thoughtfully connected.</p></div><img src={logo}/><div className="banner-orb"/></div>
 <div className="stats-grid">{stats.map(([l,v,I,c])=><div className="stat-card" key={l}><div className={`stat-icon ${c}`}><I size={19}/></div><span>{l}</span><strong>{v}</strong><small><i className="tiny-green"/> Live platform data</small></div>)}</div>
 <div className="content-grid"><section className="panel"><div className="panel-head"><div><h3>Recent competitions</h3><p>Your latest event activity</p></div><a href="/competitions">View all <ChevronRight size={15}/></a></div>{!data?.recent?.length?<Empty text="No competitions yet. Create your first event to get started."/>:<div className="list">{data.recent.map(c=><div className="list-row" key={c._id}><div className="row-icon"><Trophy/></div><div className="row-main"><b>{c.name}</b><small>{c.venue||"Venue not set"} · {c.city||"—"}</small></div><Status value={c.status}/></div>)}</div>}</section><section className="panel quick-panel"><div className="panel-head"><div><h3>Quick actions</h3><p>Move your event forward</p></div></div><div className="quick-links"><Quick to="/competitions" I={Plus} title="Create competition" sub="Set up a new event"/><Quick to="/participants" I={UserRound} title="Register participant" sub="Add a yoga athlete"/><Quick to="/scoring" I={Activity} title="Enter judge scores" sub="Submit asana marks"/><Quick to="/scoreboard" I={ChartNoAxesCombined} title="Open live scoreboard" sub="View approved scores"/></div></section></div></>
}
function Quick({to,I,title,sub}){return <a className="quick-link" href={to}><span><I size={18}/></span><div><b>{title}</b><small>{sub}</small></div><ChevronRight size={16}/></a>}
function Status({value}){return <span className={`status ${value}`}>{value}</span>}
function Empty({text}){return <div className="empty"><ClipboardList size={25}/><p>{text}</p></div>}

function Competitions({user}){
 const [items,setItems]=useState([]),[show,setShow]=useState(false),[edit,setEdit]=useState(null),[form,setForm]=useState({name:"",venue:"",city:"",status:"registration",description:"",startDate:"",endDate:"",scoringRules:{requiredJudges:3,dropHighest:true,dropLowest:true,approvalRequired:true,maxMarks:10}}),[msg,setMsg]=useState("");
 const blank=()=>({name:"",venue:"",city:"",status:"registration",description:"",startDate:"",endDate:"",scoringRules:{requiredJudges:3,dropHighest:true,dropLowest:true,approvalRequired:true,maxMarks:10}});
 const load=()=>api("/competitions").then(setItems).catch(e=>setMsg(e.message));useEffect(()=>{load()},[]);
 async function save(e){e.preventDefault();try{const payload={...form,startDate:form.startDate||null,endDate:form.endDate||null};await api(edit?`/competitions/${edit._id}`:"/competitions",{method:edit?"PATCH":"POST",body:JSON.stringify(payload)});setShow(false);setEdit(null);setForm(blank());load()}catch(e){setMsg(e.message)}}
 async function remove(x){if(confirm(`Delete competition “${x.name}”?`)){try{await api(`/competitions/${x._id}`,{method:"DELETE"});load()}catch(e){setMsg(e.message)}}}
 function openEdit(x){setEdit(x);setForm({...blank(),...x,startDate:x.startDate?String(x.startDate).slice(0,10):"",endDate:x.endDate?String(x.endDate).slice(0,10):"",scoringRules:{...blank().scoringRules,...x.scoringRules}});setShow(true)}
 return <><PageTitle eyebrow="EVENT MANAGEMENT" title="Competitions" sub="Create and manage events, dates, status and scoring rules." action={user.role==="admin"&&<button className="btn primary" onClick={()=>{setEdit(null);setForm(blank());setShow(true)}}><Plus size={17}/> New competition</button>}/>{msg&&<div className="error">{msg}</div>}<div className="panel"><div className="panel-head"><div><h3>All competitions</h3><p>{items.length} events in your workspace</p></div><span className="tag">EVENT REGISTER</span></div>{!items.length?<Empty text="No events found. Create a competition to begin."/>:<div className="table-wrap"><table><thead><tr><th>Competition</th><th>Venue</th><th>Start date</th><th>Status</th>{user.role==="admin"&&<th>Actions</th>}</tr></thead><tbody>{items.map(x=><tr key={x._id}><td><b>{x.name}</b><small className="cell-sub">{x.city}</small></td><td>{x.venue||"—"}</td><td>{x.startDate?new Date(x.startDate).toLocaleDateString():"—"}</td><td><Status value={x.status}/></td>{user.role==="admin"&&<td><button className="icon-btn" onClick={()=>openEdit(x)}><Settings size={15}/></button><button className="icon-btn" onClick={()=>remove(x)}><X size={15}/></button></td>}</tr>)}</tbody></table></div>}</div>{show&&<Modal title={edit?"Edit competition":"Create competition"} close={()=>setShow(false)}><form onSubmit={save} className="form-grid"><Field label="Competition name"><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="Venue"><input value={form.venue||""} onChange={e=>setForm({...form,venue:e.target.value})}/></Field><Field label="City"><input value={form.city||""} onChange={e=>setForm({...form,city:e.target.value})}/></Field><Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="draft">Draft</option><option value="registration">Registration</option><option value="live">Live</option><option value="completed">Completed</option></select></Field><Field label="Start date"><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></Field><Field label="End date"><input type="date" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></Field><Field label="Required judges"><input type="number" min="1" value={form.scoringRules.requiredJudges} onChange={e=>setForm({...form,scoringRules:{...form.scoringRules,requiredJudges:Number(e.target.value)}})}/></Field><Field label="Maximum marks"><input type="number" min="1" value={form.scoringRules.maxMarks} onChange={e=>setForm({...form,scoringRules:{...form.scoringRules,maxMarks:Number(e.target.value)}})}/></Field><Field label="Drop highest mark"><select value={String(form.scoringRules.dropHighest)} onChange={e=>setForm({...form,scoringRules:{...form.scoringRules,dropHighest:e.target.value==="true"}})}><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="Drop lowest mark"><select value={String(form.scoringRules.dropLowest)} onChange={e=>setForm({...form,scoringRules:{...form.scoringRules,dropLowest:e.target.value==="true"}})}><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="Chief Judge approval required"><select value={String(form.scoringRules.approvalRequired)} onChange={e=>setForm({...form,scoringRules:{...form.scoringRules,approvalRequired:e.target.value==="true"}})}><option value="true">Yes</option><option value="false">No</option></select></Field><Field label="Description" wide><textarea value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})}/></Field><button className="btn primary">{edit?"Save changes":"Save competition"}</button></form></Modal>}</>
}
function Participants({user}){
 const [items,setItems]=useState([]),[events,setEvents]=useState([]),[show,setShow]=useState(false),[edit,setEdit]=useState(null),[q,setQ]=useState(""),[msg,setMsg]=useState("");
 const blank={competition:"",fullName:"",chestNumber:"",gender:"Other",dateOfBirth:"",ageGroup:"",yogaCentre:"",phone:"",email:"",verificationStatus:"pending",registrationStatus:"approved",notes:""};const [form,setForm]=useState(blank);
 const load=()=>api("/participants").then(setItems).catch(e=>setMsg(e.message));useEffect(()=>{load();api("/competitions").then(setEvents).catch(()=>{})},[]);
 async function save(e){e.preventDefault();try{const payload={...form,dateOfBirth:form.dateOfBirth||null};await api(edit?`/participants/${edit._id}`:"/participants",{method:edit?"PATCH":"POST",body:JSON.stringify(payload)});setShow(false);setEdit(null);setForm(blank);load()}catch(e){setMsg(e.message)}}
 async function remove(p){if(confirm(`Delete participant ${p.fullName}?`)){try{await api(`/participants/${p._id}`,{method:"DELETE"});load()}catch(e){setMsg(e.message)}}}
 const filtered=items.filter(p=>(p.fullName+" "+p.chestNumber+" "+p.ageGroup).toLowerCase().includes(q.toLowerCase()));
 return <><PageTitle eyebrow="ATHLETE DIRECTORY" title="Participants" sub="Register athletes, update records and monitor verification." action={["admin","marshal","volunteer","yoga_center"].includes(user.role)&&<button className="btn primary" onClick={()=>{setEdit(null);setForm({...blank,registrationStatus:user.role==="admin"?"approved":"pending"});setShow(true)}}><Plus size={17}/> Add participant</button>}/>{msg&&<div className="error">{msg}</div>}<div className="panel"><div className="panel-head"><div><h3>Registered participants</h3><p>{items.length} athlete records</p></div><div className="search"><Search size={16}/><input placeholder="Search name or chest no." value={q} onChange={e=>setQ(e.target.value)}/></div></div>{!filtered.length?<Empty text="No participants match your search."/>:<div className="table-wrap"><table><thead><tr><th>Participant</th><th>Chest no.</th><th>Competition</th><th>Age group</th><th>DOB</th><th>Registration</th>{["admin","marshal","volunteer"].includes(user.role)&&<th>Actions</th>}</tr></thead><tbody>{filtered.map(p=><tr key={p._id}><td><b>{p.fullName}</b><small className="cell-sub">{p.yogaCentre||"Independent"}</small></td><td><span className="tag">{p.chestNumber}</span></td><td>{p.competition?.name||"—"}</td><td>{p.ageGroup||"—"}</td><td>{p.dateOfBirth?new Date(p.dateOfBirth).toLocaleDateString():"—"}</td><td><Status value={p.registrationStatus}/></td>{["admin","marshal","volunteer"].includes(user.role)&&<td><button className="icon-btn" onClick={()=>{setEdit(p);setForm({...blank,...p,competition:p.competition?._id||p.competition,dateOfBirth:p.dateOfBirth?String(p.dateOfBirth).slice(0,10):""});setShow(true)}}><Settings size={15}/></button>{user.role==="admin"&&<button className="icon-btn" onClick={()=>remove(p)}><X size={15}/></button>}</td>}</tr>)}</tbody></table></div>}</div>{show&&<Modal title={edit?"Edit participant":"Register participant"} close={()=>setShow(false)}><form onSubmit={save} className="form-grid"><Field label="Competition" wide><select required value={form.competition} onChange={e=>setForm({...form,competition:e.target.value})}><option value="">Select competition</option>{events.map(e=><option value={e._id} key={e._id}>{e.name}</option>)}</select></Field><Field label="Full name"><input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></Field><Field label="Chest number"><input required value={form.chestNumber} onChange={e=>setForm({...form,chestNumber:e.target.value})}/></Field><Field label="Gender"><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option>Female</option><option>Male</option><option>Other</option></select></Field><Field label="Date of birth"><input type="date" value={form.dateOfBirth} onChange={e=>setForm({...form,dateOfBirth:e.target.value})}/></Field><Field label="Age group"><input value={form.ageGroup||""} onChange={e=>setForm({...form,ageGroup:e.target.value})} placeholder="e.g. Under 14"/></Field><Field label="Yoga centre"><input value={form.yogaCentre||""} onChange={e=>setForm({...form,yogaCentre:e.target.value})}/></Field><Field label="Phone"><input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Email"><input type="email" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></Field>{user.role!=="yoga_center"&&<><Field label="Registration status"><select value={form.registrationStatus} onChange={e=>setForm({...form,registrationStatus:e.target.value})}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></Field><Field label="Verification status"><select value={form.verificationStatus} onChange={e=>setForm({...form,verificationStatus:e.target.value})}><option value="pending">Pending</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></Field></>}<Field label="Notes" wide><textarea value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})}/></Field><button className="btn primary">{edit?"Save participant":"Register participant"}</button></form></Modal>}</>
}
function Scoring({user}){
 const [events,setEvents]=useState([]),[people,setPeople]=useState([]),[asanas,setAsanas]=useState([]),[event,setEvent]=useState(""),[form,setForm]=useState({participant:"",asana:"",marks:"8",remarks:""}),[msg,setMsg]=useState(""),[mine,setMine]=useState([]);
 useEffect(()=>{api("/competitions").then(d=>{setEvents(d);if(d[0])setEvent(d[0]._id)}).catch(e=>setMsg(e.message));if(user.role==="judge")api("/scores/mine").then(setMine).catch(()=>{})},[]);
 useEffect(()=>{if(event){api(`/participants?competition=${event}`).then(setPeople);api(`/asanas?competition=${event}`).then(setAsanas)}},[event]);
 async function submit(e){e.preventDefault();try{const d=await api("/scores",{method:"POST",body:JSON.stringify({...form,competition:event,marks:Number(form.marks)})});setMsg(`Score saved. ${d.submitted}/${d.required} judges submitted for this asana.${d.result?" Final score calculated and awaiting approval.":""}`);if(user.role==="judge")api("/scores/mine").then(setMine)}catch(e){setMsg(e.message)}}
 return <><PageTitle eyebrow="JUDGING WORKSPACE" title="Judge scoring" sub="Submit accurate marks for each participant and asana."/><div className="score-layout"><section className="panel"><div className="panel-head"><div><h3>Score entry</h3><p>Marks are saved to the competition record.</p></div><span className="tag">0–10 MARKS</span></div><form className="score-form" onSubmit={submit}><Field label="Competition"><select required value={event} onChange={e=>setEvent(e.target.value)}>{events.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></Field><Field label="Participant"><select required value={form.participant} onChange={e=>setForm({...form,participant:e.target.value})}><option value="">Choose participant</option>{people.map(p=><option key={p._id} value={p._id}>{p.chestNumber} · {p.fullName}</option>)}</select></Field><Field label="Asana"><select required value={form.asana} onChange={e=>setForm({...form,asana:e.target.value})}><option value="">Choose asana</option>{asanas.map(a=><option key={a._id} value={a._id}>{a.name}</option>)}</select></Field><Field label="Marks (0–10)"><input type="number" min="0" max="10" step=".1" required value={form.marks} onChange={e=>setForm({...form,marks:e.target.value})}/></Field><Field label="Remarks (optional)"><textarea value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} placeholder="Reason for notable deduction…"/></Field><button className="btn primary full"><CheckCircle2 size={17}/> Submit score</button>{msg&&<div className="notice">{msg}</div>}</form></section><section className="panel"><div className="panel-head"><div><h3>Scoring guidelines</h3><p>YOGAMETRIX scoring workflow</p></div><Award color="var(--gold)"/></div><div className="guideline"><span>01</span><div><b>Evaluate the asana</b><small>Assess the participant according to the event's judging criteria.</small></div></div><div className="guideline"><span>02</span><div><b>Submit individual marks</b><small>Each judge submits their own mark independently.</small></div></div><div className="guideline"><span>03</span><div><b>Automatic calculation</b><small>Once the configured panel has submitted, highest and lowest marks are excluded.</small></div></div><div className="guideline"><span>04</span><div><b>Chief Judge approval</b><small>Final scores remain unpublished until approved.</small></div></div></section></div>{user.role==="judge"&&<div className="panel mt"><div className="panel-head"><div><h3>My recent submissions</h3><p>Your latest saved marks</p></div></div>{mine.length? <div className="table-wrap"><table><thead><tr><th>Participant</th><th>Asana</th><th>Marks</th><th>Updated</th></tr></thead><tbody>{mine.map(s=><tr key={s._id}><td>{s.participant?.fullName}</td><td>{s.asana?.name}</td><td><b>{s.marks}</b></td><td>{new Date(s.updatedAt).toLocaleString()}</td></tr>)}</tbody></table></div>:<Empty text="No scores submitted yet."/ >}</div>}</>
}
function PublicScoreboardPage(){
 return <div className="public-portal public-scoreboard-portal">
   <header><div><b>YOGAMETRIX</b><small>Official live competition scoreboard</small></div><a href="/login">Official login <ChevronRight size={14}/></a></header>
   <main className="public-scoreboard-main"><Scoreboard/></main>
 </div>;
}
function Scoreboard(){
 const [events,setEvents]=useState([]),[event,setEvent]=useState(""),[rows,setRows]=useState([]),[connected,setConnected]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
   api("/public/competitions").then(d=>{setEvents(d);if(d[0])setEvent(d[0]._id)}).catch(e=>setError(e.message));
 },[]);
 useEffect(()=>{
   if(!event)return;
   let active=true;
   const socket=io(API.replace(/\/api$/,""),{transports:["websocket","polling"]});
   socket.on("connect",()=>{setConnected(true);socket.emit("competition:join",event)});
   socket.on("disconnect",()=>setConnected(false));
   const load=()=>api(`/scoreboard/${event}`).then(d=>{if(active){setRows(d);setError("")}}).catch(e=>{if(active)setError(e.message)});
   socket.on("score:approved",load);socket.on("result:published",load);socket.on("score:update",load);
   load();
   const timer=setInterval(load,15000);
   return()=>{active=false;clearInterval(timer);socket.emit("competition:leave",event);socket.disconnect()};
 },[event]);
 const ranked=useMemo(()=>{
   const groups=rows.reduce((acc,r)=>{
     const id=r.participant?._id||"unknown";
     if(!acc[id])acc[id]={participant:r.participant,items:[],total:0};
     acc[id].items.push(r);acc[id].total+=Number(r.total||0);return acc;
   },{});
   return Object.values(groups).map(g=>({...g,items:g.items.sort((x,y)=>(x.asana?.sequence||0)-(y.asana?.sequence||0))}))
     .sort((x,y)=>y.total-x.total);
 },[rows]);
 return <>
   <PageTitle eyebrow="LIVE DISPLAY" title="Live Scoreboard" sub="Published asana scores, judge-wise marks and cumulative participant totals." action={<span className={`connection ${connected?"connected":""}`}><i/>{connected?"Live connection":"Auto-refreshing"}</span>}/>
   <div className="scoreboard-hero"><div><span className="eyebrow light">YOGAMETRIX • OFFICIAL RESULTS</span><h2>Every effort.<br/><em>Every score.</em></h2><p>Judge-wise transparency and cumulative scoring.</p></div><Trophy size={78}/></div>
   <div className="panel">
     <div className="panel-head"><div><h3>Competition results</h3><p>Only approved and published results are shown.</p></div><select className="compact-select" value={event} onChange={e=>setEvent(e.target.value)}><option value="">Select competition</option>{events.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></div>
     {error&&<div className="error">{error}</div>}
     {!ranked.length?<Empty text="No published scores are available for this competition yet."/>:
       <div className="scoreboard-participants">{ranked.map((group,index)=><section className="scoreboard-participant" key={group.participant?._id||index}>
         <div className="scoreboard-participant-head">
           <div><span className="rank-label">RANK {index+1}</span><h3>{group.participant?.fullName||"Participant"}</h3><p>Chest No. {group.participant?.chestNumber||"—"} · {group.participant?.ageGroup||"Age group not set"} · {group.items.length} asana(s)</p></div>
           <div className="scoreboard-grand-total"><small>Cumulative total</small><strong>{group.total.toFixed(2)}</strong></div>
         </div>
         <div className="table-wrap"><table><thead><tr><th>Asana</th><th>Judge-wise marks</th><th>Final asana score</th></tr></thead><tbody>
           {group.items.map(r=><tr key={r._id}><td><b>{r.asana?.name||"Asana"}</b><small className="cell-sub">Sequence {r.asana?.sequence??"—"}</small></td>
             <td><div className="judge-mark-list">{(r.judgeScores||[]).map((j,i)=><span className={`judge-mark ${j.included?"included":"excluded"}`} key={j.judgeId||i}><b>{j.judgeName}</b><strong>{Number(j.marks).toFixed(2)}</strong><small>{j.excludedAs?`Excluded · ${j.excludedAs}`:"Included"}</small></span>)}</div></td>
             <td><span className="score-pill">{Number(r.total||0).toFixed(2)}</span></td></tr>)}
         </tbody></table></div>
       </section>)}</div>
     }
   </div>
 </>;
}
function Results({user}){
 const [rows,setRows]=useState([]),[events,setEvents]=useState([]),[event,setEvent]=useState(""),[message,setMessage]=useState("");
 const load=()=>api(`/results${event?`?competition=${event}`:""}`).then(setRows).catch(e=>setMessage(e.message));
 useEffect(()=>{api("/competitions").then(d=>{setEvents(d);if(d[0])setEvent(d[0]._id)}).catch(e=>setMessage(e.message))},[]);
 useEffect(()=>{load()},[event]);
 async function approve(id){try{await api(`/results/${id}/approve`,{method:"PATCH"});load()}catch(e){setMessage(e.message)}}
 async function publish(id){try{await api(`/results/${id}/publish`,{method:"PATCH"});load()}catch(e){setMessage(e.message)}}
 const canManage=["admin","chief_judge"].includes(user.role);
 return <><PageTitle eyebrow="PERFORMANCE INSIGHTS" title="Results & reports" sub="Review calculated scores, approve them and publish official results."/><div className="panel"><div className="panel-head"><div><h3>Score scrutiny</h3><p>Calculated scores and approval/publication status</p></div><select className="compact-select" value={event} onChange={e=>setEvent(e.target.value)}>{events.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></div>{message&&<div className="error">{message}</div>}{!rows.length?<Empty text="No calculated results available. Results appear after the required judges submit marks."/>:<div className="table-wrap"><table><thead><tr><th>Participant</th><th>Asana</th><th>Judges</th><th>Final score</th><th>Status</th>{canManage&&<th>Action</th>}</tr></thead><tbody>{rows.map(r=><tr key={r._id}><td><b>{r.participant?.fullName}</b><small className="cell-sub">{r.participant?.chestNumber}</small></td><td>{r.asana?.name}</td><td>{r.judgeCount}</td><td><b>{Number(r.total).toFixed(2)}</b></td><td><Status value={r.published?"published":r.approved?"approved":"pending"}/></td>{canManage&&<td>{!r.approved?<button className="btn small primary" onClick={()=>approve(r._id)}>Approve</button>:!r.published?<button className="btn small primary" onClick={()=>publish(r._id)}>Publish</button>:<span className="tag">Official</span>}</td>}</tr>)}</tbody></table></div>}</div><div className="report-note"><FileText/><div><b>Reporting note</b><p>Detailed PDF/Excel export templates and certificate generation can be added to match the association's approved formats.</p></div></div></>
}
function SettingsPage({user}){return <><PageTitle eyebrow="PREFERENCES" title="Settings" sub="Workspace and account information."/><div className="panel settings-card"><div className="setting-row"><span className="setting-icon"><UserRound/></span><div><b>{user.name}</b><small>{user.email}</small></div><span className="tag">{roleLabel(user.role)}</span></div><div className="setting-row"><span className="setting-icon"><ShieldCheck/></span><div><b>Role-based access</b><small>Your account can access features assigned to its role.</small></div><Status value="active"/></div><div className="setting-row"><span className="setting-icon"><Zap/></span><div><b>Lightweight interface</b><small>Built with native CSS, small icons and minimal client dependencies.</small></div><Status value="active"/></div></div></>}
function Field({label,children,wide}){return <label className={`field ${wide?"wide":""}`}><span>{label}</span>{children}</label>}
function Modal({title,close,children}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={close}><X/></button></div>{children}</div></div>}
export default App;
