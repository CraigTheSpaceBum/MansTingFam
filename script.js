/* ======================================================
   NOSTRCORD v2 — Full Nostr Event Format
   ====================================================== */

const LS_PREFIX = "nostrcord_v2_";
const RELAYS = ["wss://relay.damus.io", "wss://nostr.wine"];

/* ===== STATE ===== */
let servers = JSON.parse(localStorage.getItem(LS_PREFIX + "servers")) || [
  {id:1,name:"Nostr Hub",icon:"NH",channels:["general"],members:[
    {name:"alice", status:"npub1qxyz1234567890abcdef", avatar:"https://i.pravatar.cc/35?img=12"},
    {name:"bob", status:"Playing World Of Warcraft", avatar:"https://i.pravatar.cc/35?img=22"},
    {name:"charlie", status:"npub1qabcdef0987654321", avatar:"https://i.pravatar.cc/35?img=32"}
  ]}
];
let currentServer = servers[0];
let currentChannel = "general";
let messages = JSON.parse(localStorage.getItem(LS_PREFIX + "messages")) || {};
let feed = JSON.parse(localStorage.getItem(LS_PREFIX + "feed")) || [];
let contacts = JSON.parse(localStorage.getItem(LS_PREFIX + "contacts")) || [];
let notifications = JSON.parse(localStorage.getItem(LS_PREFIX + "notifications")) || [];
let profile = JSON.parse(localStorage.getItem(LS_PREFIX + "profile")) || {
  displayName:"NostrBot",
  npub:"npub1qyouexample0000000000000000",
  banner:"",
  avatar:"https://i.pravatar.cc/256?img=64",
  lightning:"lnurl1example",
  followers: 42,
  following: 128
};
let isProfileView = false;

/* ===== SAVE ===== */
function saveState() {
  localStorage.setItem(LS_PREFIX + "servers", JSON.stringify(servers));
  localStorage.setItem(LS_PREFIX + "messages", JSON.stringify(messages));
  localStorage.setItem(LS_PREFIX + "feed", JSON.stringify(feed));
  localStorage.setItem(LS_PREFIX + "contacts", JSON.stringify(contacts));
  localStorage.setItem(LS_PREFIX + "notifications", JSON.stringify(notifications));
  localStorage.setItem(LS_PREFIX + "profile", JSON.stringify(profile));
}

/* ===== UTILITIES ===== */
function nowSec() { return Math.floor(Date.now()/1000); }
function escapeHtml(s){ return s ? s.replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])) : ""; }

/* ===== NOSTR HELPERS ===== */
function createNostrEvent(kind, content, tags=[]) {
  return {
    id: crypto.randomUUID(),
    kind,
    pubkey: profile.npub,
    created_at: nowSec(),
    tags,
    content
  };
}

/* ===== RENDER UI ===== */
function renderServers() {
  const el = document.getElementById("servers");
  el.innerHTML = servers.map(s=>`<div class="server" title="${s.name}" onclick="switchServer(${s.id})">${s.icon}</div>`).join("") +
    `<div class="add-server" onclick="addServer()">+</div>`;
}

function renderChannels() {
  const el = document.getElementById("channels");
  if(isProfileView) {
    el.innerHTML = `<div class="server-name">Notifications</div>` +
      (notifications.length
        ? notifications.map(n=>`<div class="notification">${escapeHtml(n)}</div>`).join("")
        : `<div class="notification small">No notifications</div>`);
    return;
  }
  el.innerHTML = `<div class="server-name">${currentServer.name}</div>` +
    currentServer.channels.map(c=>`<div class="channel ${c===currentChannel?'active':''}" onclick="switchChannel('${c}')"># ${c}</div>`).join("") +
    `<div class="add-channel" onclick="addChannel()">+ Add Channel</div>`;
}

function renderMembers() {
  const el = document.getElementById("members");
  if(isProfileView) {
    el.innerHTML = `
      <div style="padding:8px">
        <div style="display:flex;gap:8px;align-items:center">
          <input id="contactSearch" placeholder="Search or paste npub" style="flex:1;padding:8px;border-radius:6px;border:1px solid #2f3136;background:transparent;color:var(--text)"/>
          <button onclick="addContactFromInput()" style="padding:8px;border-radius:6px;background:var(--accent);color:white;border:none;cursor:pointer">Add</button>
        </div>
        <div style="margin-top:8px">
          <button onclick="simulateScanQR()" style="padding:8px;border-radius:6px;background:var(--input-bg);color:var(--text-dim);border:none;cursor:pointer">Scan QR (simulate)</button>
        </div>
      </div>
      <div style="padding:8px;font-size:13px;color:var(--text-dim)">Contacts</div>
      <div id="contactsList"></div>
    `;
    renderContactsList();
    return;
  }
  el.innerHTML = currentServer.members.map(u=>`
    <div class="member">
      <div class="member-top">
        <img src="${u.avatar}" class="avatar"/>
        <div class="member-name">@${u.name}</div>
      </div>
      <div class="member-status small">${u.status}</div>
    </div>
  `).join('');
}

function renderContactsList() {
  const listEl = document.getElementById("contactsList");
  if(!listEl) return;
  listEl.innerHTML = contacts.map((c,i)=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px;margin:6px;border-radius:6px;background:var(--bg-member-box);">
      <img src="${c.avatar}" style="width:36px;height:36px;border-radius:6px"/>
      <div style="flex:1">
        <div style="font-weight:700">${c.name}</div>
        <div class="small" style="word-break:break-all">${c.npub}</div>
      </div>
      <button class="btn-outline" onclick="removeContact(${i})">Remove</button>
    </div>
  `).join('');
}

function renderMessages() {
  const msgs = messages[currentChannel] || [];
  document.getElementById("messages").innerHTML = msgs.map((m,i)=>`
    <div class="message">
      <img src="${m.avatar}" class="avatar"/>
      <div>
        <div><span class="author">${m.author}</span> <span class="small">${new Date(m.time).toLocaleTimeString()}</span></div>
        <div class="content">${escapeHtml(m.text)}</div>
        <div class="msg-actions">
          <button onclick="likeMsg(${i})">❤️ ${m.likes||0}</button>
          <button onclick="replyMsg(${i})">💬</button>
          <button onclick="zapMsg(${i})">⚡ ${m.zaps||0}</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderProfilePage() {
  document.getElementById("bannerImg").src = profile.banner || "https://picsum.photos/1200/200?blur";
  document.getElementById("profilePicImg").src = profile.avatar;
  document.getElementById("profileDisplayName").innerText = profile.displayName;
  document.getElementById("profileNpub").innerText = profile.npub;
  document.getElementById("followersCount").innerHTML = `<strong>${profile.followers}</strong> Followers`;
  document.getElementById("followingCount").innerHTML = `<strong>${profile.following}</strong> Following`;
  document.getElementById("lnAddr").innerText = profile.lightning;

  const feedEl = document.getElementById("feedPosts");
  const sorted = [...feed].sort((a,b)=>b.created_at - a.created_at);
  feedEl.innerHTML = sorted.map(p=>`
    <div class="post">
      <div class="post-head">
        <div style="width:44px;height:44px;border-radius:6px;overflow:hidden"><img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover"/></div>
        <div>
          <div class="post-author">${p.author} <span class="small">${new Date(p.created_at*1000).toLocaleString()}</span></div>
          <div class="small">${p.pubkey}</div>
        </div>
      </div>
      <div class="post-body">${escapeHtml(p.content)}</div>
      <div class="post-actions">
        <button onclick="likeFeed('${p.id}')">❤️ ${p.likes||0}</button>
        <button onclick="shareFeed('${p.id}')">🔗</button>
        <button onclick="zapFeed('${p.id}')">⚡ ${p.zaps||0}</button>
      </div>
    </div>
  `).join('');
}

/* ===== CHANNEL ACTIONS ===== */
function addServer(){ const name=prompt("Server name:"); if(!name)return; servers.push({id:Date.now(),name,icon:name[0].toUpperCase(),channels:["general"],members:[]}); saveState(); renderServers(); renderChannels(); }
function addChannel(){ const name=prompt("Channel name:"); if(!name)return; currentServer.channels.push(name); saveState(); renderChannels(); }
function switchServer(id){ const s=servers.find(x=>x.id===id); if(!s)return; currentServer=s; currentChannel=s.channels[0]||"general"; if(isProfileView) toggleProfileView(); hideStreams(); renderServers(); renderChannels(); renderMembers(); renderMessages(); }
function switchChannel(ch){ currentChannel=ch; renderChannels(); renderMessages(); document.getElementById("chat-header-text").innerText=`#${ch}`; hideStreams(); }

/* ===== MESSAGING ===== */
function sendMessage(){
  const input=document.getElementById("msgInput");
  const text=input.value.trim(); if(!text)return;
  const evt = createNostrEvent(1, text, [["channel", currentChannel]]);
  const msg = {...evt, author:"you", avatar:profile.avatar, likes:0, zaps:0, time:Date.now()};
  messages[currentChannel] = messages[currentChannel] || [];
  messages[currentChannel].push(msg);
  input.value="";
  saveState(); renderMessages();
}
function likeMsg(i){ const m=messages[currentChannel][i]; m.likes++; notifications.unshift(`${m.author} liked your message`); saveState(); renderMessages(); renderChannels(); }
function replyMsg(i){ const r=prompt("Reply:"); if(!r)return; const evt=createNostrEvent(1,r,[["reply",messages[currentChannel][i].id]]); messages[currentChannel].push({...evt,author:"you (reply)",avatar:profile.avatar,likes:0,zaps:0,time:Date.now()}); saveState(); renderMessages(); renderChannels(); }
function zapMsg(i){ const m=messages[currentChannel][i]; m.zaps++; notifications.unshift(`${m.author} zapped ⚡ your message`); saveState(); renderMessages(); renderChannels(); }

/* ===== STREAMS ===== */
function joinStream(type){
  const c=document.getElementById("streams-container");
  c.style.display="flex";
  const box=document.createElement("div");
  box.className="stream-box "+type;
  box.innerHTML=`<div>${type.toUpperCase()}</div><div>@you</div><button class="go-live">GO LIVE</button>`;
  box.onclick=()=>{document.getElementById("main-stream").innerHTML=box.innerHTML;};
  document.getElementById("streams").appendChild(box);
}
function hideStreams(){
  const c=document.getElementById("streams-container");
  c.style.display="none";
  document.getElementById("streams").innerHTML="";
  document.getElementById("main-stream").innerText="No stream selected";
}

/* ===== PROFILE / FEED ===== */
document.getElementById("profileBox").addEventListener("click", toggleProfileView);
function toggleProfileView(){
  isProfileView=!isProfileView;
  const p=document.getElementById("profilePage"),m=document.getElementById("messages"),c=document.getElementById("chatComposer");
  if(isProfileView){ p.classList.remove("hidden"); m.style.display="none"; c.style.display="none"; document.getElementById("chat-header-text").innerText="Your Feed"; renderProfilePage(); }
  else{ p.classList.add("hidden"); m.style.display=""; c.style.display=""; document.getElementById("chat-header-text").innerText=`#${currentChannel}`; renderChannels(); renderMembers(); renderMessages(); }
  renderChannels(); renderMembers();
}

function createPost(){
  const txt=document.getElementById("postText").value.trim(); if(!txt)return;
  const evt = createNostrEvent(1, txt, [["p",profile.npub]]);
  const post = {...evt, author:profile.displayName, avatar:profile.avatar, likes:0, zaps:0};
  feed.push(post);
  notifications.unshift("You posted to your Nostr feed");
  saveState();
  document.getElementById("postText").value="";
  renderProfilePage(); renderChannels();
}
function findPostById(id){ return feed.find(p=>p.id===id); }
function likeFeed(id){ const p=findPostById(id); if(!p)return; p.likes++; saveState(); renderProfilePage(); renderChannels(); }
function zapFeed(id){ const p=findPostById(id); if(!p)return; p.zaps++; saveState(); renderProfilePage(); renderChannels(); }
function shareFeed(id){ alert("Share copied (demo)"); }

/* ===== CONTACTS ===== */
function addContactFromInput(){ const val=document.getElementById("contactSearch").value.trim(); if(!val)return; const npub=val.startsWith("npub")?val:"npub1"+Math.random().toString(36).slice(2,20); contacts.push({name:val,npub,avatar:"https://i.pravatar.cc/40?u="+npub}); saveState(); renderContactsList(); }
function simulateScanQR(){ const npub="npub1"+Math.random().toString(36).slice(2,24); const name="scanned-"+npub.slice(5,10); contacts.push({name,npub,avatar:"https://i.pravatar.cc/40?u="+npub}); notifications.unshift("Added "+name+" via QR scan"); saveState(); renderContactsList(); renderChannels(); }
function removeContact(i){ if(!confirm("Remove contact?"))return; contacts.splice(i,1); saveState(); renderContactsList(); }

/* ===== PROFILE EDIT ===== */
function editProfile(){ const n=prompt("Name:",profile.displayName)||profile.displayName; profile.displayName=n; saveState(); renderProfilePage(); document.getElementById("miniName").innerText=profile.displayName; }

/* ===== INIT ===== */
function init(){
  renderServers();
  renderChannels();
  renderMembers();
  renderMessages();
  renderProfilePage();
  document.getElementById("miniAvatar").src=profile.avatar;
  document.getElementById("miniName").innerText=profile.displayName;
}
init();


// === Login Overlay Controls ===
function hideLogin() {
  const overlay = document.getElementById('loginScreen');
  if (overlay) overlay.style.display = 'none';
}
function loginWithNsec() { hideLogin(); }
function loginWithExtension() { hideLogin(); }
function createNewAccount() { hideLogin(); }

/* === Enhanced Stream Layout & Behavior (append-only; keeps your original code intact) === */
(function(){
  function buildActiveStream(type){
    const main = document.getElementById('main-stream');
    if(!main) return;
    main.innerHTML = '';

    // Dimensions: video 16:9 (640x360), audio 300x300
    if(type === 'video'){
      main.style.width = '640px';
      main.style.height = '360px';
    } else {
      main.style.width = '300px';
      main.style.height = '300px';
    }

    const center = document.createElement('div');
    center.textContent = (type === 'audio' ? 'AUDIO' : 'VIDEO') + ' — @you';
    main.appendChild(center);

    // Floating controls
    const controls = document.createElement('div');
    controls.className = 'stream-controls';

    if(type === 'video'){
      const liveBtn = document.createElement('button');
      liveBtn.className = 'live-btn';
      liveBtn.textContent = 'LIVE';
      liveBtn.onclick = () => {
        liveBtn.classList.toggle('on');
        liveBtn.textContent = liveBtn.classList.contains('on') ? 'LIVE 🔴' : 'LIVE';
      };
      controls.appendChild(liveBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = '✖';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => { if(typeof hideStreams==='function') hideStreams(); };
    controls.appendChild(closeBtn);

    main.appendChild(controls);
  }

  function addSecondaryTile(type){
    const list = document.getElementById('streams');
    if(!list) return;
    const tile = document.createElement('div');
    tile.className = 'stream-box ' + type;
    tile.textContent = type.toUpperCase();
    tile.onclick = () => buildActiveStream(type);
    list.appendChild(tile);
  }

  const originalJoin = window.joinStream;
  window.joinStream = function(type){
    const container = document.getElementById('streams-container');
    const list = document.getElementById('streams');
    const main = document.getElementById('main-stream');
    if(!container || !list || !main){
      // Fallback to original if present
      if(typeof originalJoin==='function') return originalJoin(type);
      return;
    }

    container.style.display = 'flex';
    container.classList.add('streams-row');

    // Active on left
    buildActiveStream(type);

    // Non-active on right (3-row grid, horizontal scroll), tiles scale to active height
    list.innerHTML = '';
    list.classList.add('grid-tiles');
    const activeH = (type === 'video') ? 360 : 300;
    const gap = 10, rows = 3;
    const tile = Math.floor((activeH - gap*(rows-1)) / rows);
    list.style.height = activeH + 'px';
    list.style.setProperty('--tile', tile + 'px');

    // Demo tiles (placeholder)
    ['audio','video','audio','video','audio','video','audio','video'].forEach(t => addSecondaryTile(t));
  };

  // Wrap hideStreams to restore defaults without breaking your original function
  const originalHide = window.hideStreams;
  window.hideStreams = function(){
    const container = document.getElementById('streams-container');
    const list = document.getElementById('streams');
    const main = document.getElementById('main-stream');
    if(list){
      list.innerHTML = '';
      list.classList.remove('grid-tiles');
      list.style.height = '';
      list.style.removeProperty('--tile');
    }
    if(main){
      main.innerHTML = 'No stream selected';
      main.style.width = '';
      main.style.height = '';
    }
    if(container){ container.style.display = 'none'; }
    if(typeof originalHide==='function'){ try{ originalHide(); }catch(e){} }
  };
})();

