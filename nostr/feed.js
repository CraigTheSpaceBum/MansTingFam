(function(global){
  const ns = {}; let myPub=null, loadingOlder=false, fetchingNew=false, untilTs=null, sinceTs=null;
  const cache=new Map(), children=new Map(), roots=new Set(), meta={};
  function spinner(show){ const el=document.getElementById('nostrSpinner'); if(el) el.style.display = show ? 'flex' : 'none'; }
  function ensureFeedContainer(){
    let c = document.querySelector('#profileFeed, .profile-feed, #feed, .feed');
    if (!c){ c = document.createElement('div'); c.id='profileFeed'; c.className='nostr-feed-container'; const anchor=document.querySelector('#profilePage, .profile-page')||document.body; anchor.appendChild(c); }
    else { c.classList.add('nostr-feed-container'); }
    return c;
  }
  function composerMarkup(){ return '<div id="nostrComposer" class="nostr-composer" style="margin-top:10px;"><div class="nostr-inline"><img id="composerAvatar" class="avatar" style="display:none;"><textarea id="composerText" rows="3" placeholder="What’s happening? Post" style="flex:1;padding:10px;border-radius:10px;border:1px solid #333;background:#151821;color:#fff;"></textarea><button id="composerPost" style="padding:10px 16px;border:none;border-radius:10px;background:#5a6cff;color:#fff;cursor:pointer;">Post</button></div></div>'; }
  function insertComposerUnderProfile(){
    document.querySelectorAll('textarea[placeholder*="post to your Nostr feed" i]').forEach(el=>{ const wrap=el.closest('.feed-composer, .composer, .nostr-composer'); if(wrap) wrap.remove(); else el.remove(); });
    const old=document.getElementById('nostrComposer'); if(old) old.remove();
    const profileHeader=document.querySelector('#profileHeader, .profile-header, #profileSummary, .profile-summary');
    const feed=ensureFeedContainer();
    const tmp=document.createElement('div'); tmp.innerHTML=composerMarkup(); const node=tmp.firstElementChild;
    if(profileHeader && profileHeader.parentElement){ profileHeader.parentElement.insertBefore(node, profileHeader.nextSibling); } else { feed.prepend(node); }
    const selfMeta=(window.NostrProfile.current && window.NostrProfile.current.metaCache && window.NostrProfile.current.metaCache[myPub])||{};
    if(selfMeta && selfMeta.picture){ const a=document.getElementById('composerAvatar'); a.src=selfMeta.picture; a.style.display='block'; }
    document.getElementById('composerPost').onclick=async()=>{ const text=String(document.getElementById('composerText').value||'').trim(); if(!text) return; spinner(true); try{ await window.NostrAuth.publishNote(text); const evt={ id:'local-'+Date.now(), kind:1, content:text, pubkey:myPub, created_at:Math.floor(Date.now()/1000), tags:[] }; cache.set(evt.id, evt); roots.add(evt.id); if(!sinceTs || evt.created_at>sinceTs) sinceTs=evt.created_at; renderAll(); document.getElementById('composerText').value=''; window.scrollTo({ top:0, behavior:'smooth' }); }catch(e){} finally{ spinner(false); } };
  }
  function ensureMeta(pub){ if(meta[pub]) return; window.NostrProfile.getMeta && window.NostrProfile.getMeta(pub,(m)=>{ meta[pub]=m||{}; renderAll(); }); }
  function noteParent(evt){ const t=(evt.tags||[]).find(x=>x[0]==='e'); return t? t[1] : null; }
  function indexEvent(evt){ if(!evt||!evt.id) return; if(cache.has(evt.id)) return; cache.set(evt.id,evt); ensureMeta(evt.pubkey); const p=noteParent(evt); if(p){ if(!children.has(p)) children.set(p,[]); children.get(p).push(evt); } else { roots.add(evt.id); } if(!sinceTs || evt.created_at>sinceTs) sinceTs=evt.created_at; }
  function postHtml(evt, depth=0){
    const m=meta[evt.pubkey]||{}; const avatar=m.picture? `<img src="${m.picture}" class="avatar" />` : `<img src="https://i.pravatar.cc/64?u=${evt.pubkey}" class="avatar" />`; const display=m.display_name||m.name||(evt.pubkey.slice(0,8)+'…'); const date=new Date(evt.created_at*1000).toLocaleString(); const content=(evt.content||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<div class="nostr-postcard" style="position:relative;margin-left:${depth? (12+depth*18):12}px;">${depth>0?'<div class="nostr-threadline" style="left:'+(depth*18)+'px"></div>':''}<div class="nostr-inline">${avatar}<div style="flex:1"><div class="nostr-meta"><span class="nostr-name">${display}</span> · <span>${date}</span></div><div class="nostr-content">${content}</div><div class="nostr-actions"><button data-id="${evt.id}" class="likeBtn" title="Like">❤️</button><button data-id="${evt.id}" class="replyBtn" title="Reply">💬</button><button data-id="${evt.id}" class="reBtn" title="Repost">🔁</button><button data-id="${evt.id}" class="zapBtn" title="Zap">⚡</button></div></div></div></div>`;
  }
  function renderThread(rootId, depth=0, htmlParts=[]){ const evt=cache.get(rootId); if(!evt) return; htmlParts.push(postHtml(evt,depth)); const kids=(children.get(rootId)||[]).sort((a,b)=> a.created_at - b.created_at); kids.forEach(k=>renderThread(k.id, depth+1, htmlParts)); return htmlParts; }
  function bindActions(container){ container.querySelectorAll('.likeBtn').forEach(b=> b.onclick=()=>{ const e=cache.get(b.dataset.id); if(e) window.NostrAuth.publishLike(e); }); container.querySelectorAll('.reBtn').forEach(b=> b.onclick=()=>{ const e=cache.get(b.dataset.id); if(e) window.NostrAuth.publishRepost(e); }); container.querySelectorAll('.replyBtn').forEach(b=> b.onclick=()=>{ const e=cache.get(b.dataset.id); if(e) showReplyComposer(e); }); container.querySelectorAll('.zapBtn').forEach(b=> b.onclick=()=>{ const e=cache.get(b.dataset.id); const m=meta[e.pubkey]||{}; const lud16=m.lud16||m.lud06||''; window.NostrAuth.openZap(lud16,21); }); }
  function showReplyComposer(parentEvt){ const id='nostrReplyLayer'; const old=document.getElementById(id); if(old) old.remove(); const layer=document.createElement('div'); layer.id=id; layer.style='position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;'; layer.innerHTML=`<div style="background:#0f1115;color:#e6e6e6;width:520px;max-width:92vw;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.6);padding:22px;position:relative;"><button id="replyClose" aria-label="Close" title="Close" style="position:absolute;top:10px;right:10px;background:#222;border:none;color:#aaa;border-radius:10px;width:32px;height:32px;cursor:pointer;">✕</button><h3 style="margin:0 0 10px 0;">Reply</h3><textarea id="replyText" rows="4" style="width:100%;padding:10px;border-radius:10px;border:1px solid #333;background:#151821;color:#fff;margin-bottom:10px;"></textarea><div style="display:flex;justify-content:flex-end;gap:8px;"><button id="sendReply" style="padding:10px 14px;border:none;border-radius:10px;background:#5a6cff;color:#fff;cursor:pointer;">Post</button></div></div>`; document.body.appendChild(layer); document.getElementById('replyClose').onclick=()=>layer.remove(); document.getElementById('sendReply').onclick=async()=>{ const txt=String(document.getElementById('replyText').value||'').trim(); if(!txt) return; try{ await window.NostrAuth.publishReply(parentEvt, txt); }catch(e){} layer.remove(); }; }
  function renderAll(){ const c=ensureFeedContainer(); const composer=document.getElementById('nostrComposer'); c.innerHTML=''; if(composer) c.appendChild(composer); const ordered=Array.from(roots).sort((a,b)=> (cache.get(b).created_at - cache.get(a).created_at)); const htmlParts=[]; ordered.forEach(r=>renderThread(r,0,htmlParts)); const wrapper=document.createElement('div'); wrapper.innerHTML=htmlParts.join(''); c.appendChild(wrapper); bindActions(wrapper); }
  function chunk(arr, size){ const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; }
  function fetchMyNotes({initial=false, older=false, newer=false}={}){
    if (!myPub) return;
    const filters=[{ kinds:[1], authors:[myPub], limit:50 }];
    if (older && untilTs) filters[0].until = untilTs;
    if (newer && sinceTs) filters[0].since = sinceTs + 1;
    window.NostrAuth.sub(filters, (evt)=>{ indexEvent(evt); }, ()=>{
      const rootIds=Array.from(roots);
      if(rootIds.length){ chunk(rootIds,50).forEach(ids=>{ window.NostrAuth.sub([{ kinds:[1], '#e': ids, limit:500 }], (re)=>{ indexEvent(re); }, ()=>{ renderAll(); }); }); }
      else { renderAll(); }
      let minTs=untilTs||Math.floor(Date.now()/1000), maxTs=sinceTs||0; cache.forEach(e=>{ if(e.created_at<minTs) minTs=e.created_at; if(e.created_at>maxTs) maxTs=e.created_at; }); untilTs=minTs-1; sinceTs=maxTs; loadingOlder=false; fetchingNew=false;
    });
  }
  function setupScrollRefresh(){ const container=document.scrollingElement||document.documentElement; window.addEventListener('scroll', ()=>{ const y=window.scrollY||container.scrollTop; const h=container.scrollHeight - container.clientHeight; if(y<80 && !fetchingNew){ fetchingNew=true; fetchMyNotes({ newer:true }); } if(h - y < 120 && !loadingOlder){ loadingOlder=true; fetchMyNotes({ older:true }); } }, { passive:true }); }
  ns.init=function(){ myPub=window.NostrAuth.state.pub||null; cache.clear(); children.clear(); roots.clear(); untilTs=null; sinceTs=null; insertComposerUnderProfile(); fetchMyNotes({ initial:true }); setupScrollRefresh(); };
  global.NostrFeed = ns;
})(window);
