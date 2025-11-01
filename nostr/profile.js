(function(global){
  const ns = {}; ns.current = { metaCache:{}, followCache:{}, nip05Cache:{} };
  const REFRESH_MS = 10000;
  function parseMeta(evt){ try{ return JSON.parse(evt.content||'{}'); }catch(e){ return {}; } }
  function setText(sel, text){ const el = document.querySelector(sel); if (el) el.textContent = text || ''; }
  function setImage(sel, url){ const el = document.querySelector(sel); if (el){ if (url) el.src = url; else el.removeAttribute('src'); } }
  function setBanner(sel, url){ const el = document.querySelector(sel); if (el) el.style.backgroundImage = url ? `url(${url})` : ''; }
  function setLink(sel, url){ const el = document.querySelector(sel); if (el){ if (url){ el.href=url; el.textContent=url; } else { el.removeAttribute('href'); el.textContent=''; } } }
  async function verifyNip05(pub, nip05){
    try{
      if(!nip05 || !nip05.includes('@')) return { ok:false };
      const [name, domain] = nip05.split('@');
      const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`;
      const res = await fetch(url);
      if(!res.ok) return { ok:false };
      const data = await res.json();
      const pk = (data.names && data.names[name]) || null;
      return { ok: pk && pk.toLowerCase() === pub.toLowerCase() };
    }catch(e){ return { ok:false }; }
  }
  function applyMetaToDom(pub, meta){
    setBanner('#profileBanner, .profile-banner, .user-banner, #bannerImg', meta.banner);
    setImage('#profileAvatar, .profile-avatar, .user-avatar, img.avatar, #profilePicImg', meta.picture);
    setText('#displayName, .display-name, .user-name, #profileDisplayName', meta.display_name || meta.name || '');
    setLink('#profileWebsite a, .profile-website a, a.profile-website, #websiteLink', meta.website);
    setText('#profileAbout, .profile-about, .user-about', meta.about || '');
    const npub = require('nostr-tools').nip19.npubEncode(pub);
    const nip05 = meta.nip05 || '';
    const npubBox = document.querySelector('#profileNpub, #npubBox, .npub');
    const nip05El = document.querySelector('#profileNip05, .profile-nip05, .nip05');
    if (npubBox) npubBox.textContent = nip05 || npub;
    if (nip05El) nip05El.textContent = nip05 || '';
    (async ()=>{ const markEl = document.querySelector('#nip05Mark, .nip05-mark'); const v = await verifyNip05(pub, nip05); if(markEl) markEl.textContent = v.ok ? '✅' : (nip05 ? '❌' : ''); })();
    const mini = document.getElementById('miniAvatar') || document.querySelector('.mini-profile-avatar, .right-mini img');
    if (mini){ mini.src = meta.picture || (`https://i.pravatar.cc/64?u=${encodeURIComponent(npub)}`); mini.style.width='48px'; mini.style.height='48px'; mini.style.borderRadius='10px'; }
    const miniName = document.getElementById('miniName') || document.querySelector('.mini-profile-name, .right-mini .name');
    if (miniName) miniName.textContent = meta.display_name || meta.name || '';
  }
  function fetchMetaOnce(pub, cb){ window.NostrAuth.sub([{ kinds:[0], authors:[pub], limit:1 }], (evt)=>{ const meta=parseMeta(evt); ns.current.metaCache[pub]=meta; cb && cb(meta); }); }
  function loadFollowing(pub){ window.NostrAuth.sub([{ kinds:[3], authors:[pub], limit:1 }], (evt)=>{ const tags = evt.tags || []; const following = tags.filter(t=>t[0]==='p').map(t=>t[1]); ns.current.followCache[pub] = ns.current.followCache[pub] || {}; ns.current.followCache[pub].following = following; updateFollowCounts(pub); }); }
  function loadFollowers(pub){ window.NostrAuth.sub([{ kinds:[3], '#p':[pub] }], (evt)=>{ ns.current.followCache[pub] = ns.current.followCache[pub] || {}; const cur = ns.current.followCache[pub].followers || new Set(); cur.add(evt.pubkey); ns.current.followCache[pub].followers = cur; updateFollowCounts(pub); }, ()=>{ updateFollowCounts(pub); }); }
  function updateFollowCounts(pub){ const data = ns.current.followCache[pub] || {}; const followers = data.followers ? data.followers.size : 0; const following = (data.following || []).length; setText('#followersCount, .followers-count', "Followers: " + String(followers)); setText('#followingCount, .following-count', "Following: " + String(following)); }
  ns.getMeta = function(pub, cb){ fetchMetaOnce(pub, cb); };
  ns.load = function(){ const pub = window.NostrAuth.state.pub; if (pub){ fetchMetaOnce(pub, m=>applyMetaToDom(pub,m)); loadFollowing(pub); loadFollowers(pub); setInterval(()=>{ fetchMetaOnce(pub, m=>applyMetaToDom(pub,m)); loadFollowing(pub); }, REFRESH_MS); } };
  global.NostrProfile = ns;
})(window);
