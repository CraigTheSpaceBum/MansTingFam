(function(global){
  const ns = {};

  function attach(){
    const container = document.querySelector('.profile-actions');
    if(!container) return false;
    const btnSettings = Array.from(container.querySelectorAll('button')).find(b => (b.title||'').toLowerCase()==='settings');
    if(!btnSettings) return false;
    let btnLogout = Array.from(container.querySelectorAll('button')).find(b => (b.title||'').toLowerCase()==='logout');
    if(!btnLogout){
      btnLogout = document.createElement('button');
      btnLogout.title = 'Logout';
      btnLogout.textContent = '🚪';
      btnLogout.style.marginLeft = '8px';
      btnSettings.insertAdjacentElement('afterend', btnLogout);
    }
    btnSettings.addEventListener('click', showSettings);
    btnLogout.addEventListener('click', ()=>{ window.NostrAuth.logout(); location.reload(); });
    return true;
  }

  function ensureAttached(){
    if (attach()) return;
    const mo = new MutationObserver(()=>{ attach(); });
    mo.observe(document.documentElement, { childList:true, subtree:true });
  }

  function showSettings(){
    const old = document.getElementById('nostrSettingsModal'); if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'nostrSettingsModal';
    modal.style = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;';

    const m = (window.NostrProfile.current && window.NostrProfile.current.metaCache && window.NostrProfile.current.metaCache[window.NostrAuth.state.pub]) || {};

    modal.innerHTML = `
      <div style="background:#0f1115;color:#e6e6e6;width:720px;max-width:95vw;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.6);padding:22px;position:relative;">
        <button id="nostrSettingsClose" aria-label="Close" title="Close" style="position:absolute;top:10px;right:10px;background:#222;border:none;color:#aaa;border-radius:10px;width:32px;height:32px;cursor:pointer;">✕</button>
        <h2 style="margin:0 0 12px 0;">Settings</h2>

        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:260px;">
            <h3 style="margin:0 0 8px 0;">Profile</h3>
            <label>Display Name</label>
            <input id="pf_display" style="width:100%;padding:8px;margin-bottom:6px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;" value="${m.display_name||''}">
            <label>Name (username)</label>
            <input id="pf_name" style="width:100%;padding:8px;margin-bottom:6px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;" value="${m.name||''}">
            <label>About</label>
            <textarea id="pf_about" rows="3" style="width:100%;padding:8px;margin-bottom:6px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;">${m.about||''}</textarea>
            <label>Picture URL</label>
            <input id="pf_picture" style="width:100%;padding:8px;margin-bottom:6px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;" value="${m.picture||''}">
            <label>Banner URL</label>
            <input id="pf_banner" style="width:100%;padding:8px;margin-bottom:6px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;" value="${m.banner||''}">
            <label>Website</label>
            <input id="pf_website" style="width:100%;padding:8px;margin-bottom:6px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;" value="${m.website||''}">
            <label>Lightning Address (lud16)</label>
            <input id="pf_lud16" style="width:100%;padding:8px;margin-bottom:6px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;" value="${m.lud16||''}">
            <div style="text-align:right;margin-top:8px;">
              <button id="pf_save" style="padding:8px 12px;border:none;border-radius:8px;background:#5a6cff;color:#fff;cursor:pointer;">Save Profile</button>
            </div>
          </div>

          <div style="flex:1;min-width:260px;">
            <h3 style="margin:0 0 8px 0;">Keys</h3>
            <div>npub</div>
            <div id="npubBox" style="background:#151821;border:1px solid #333;border-radius:8px;padding:8px;word-break:break-all;margin-bottom:8px;">${window.NostrAuth.state.npub||'—'}</div>
            <button id="copyNpub" style="padding:6px 10px;border:none;border-radius:8px;background:#444;color:#fff;cursor:pointer;margin-bottom:10px;">Copy npub</button>
            <div>nsec</div>
            <div id="nsecHidden" style="background:#151821;border:1px solid #333;border-radius:8px;padding:8px;word-break:break-all;margin-bottom:8px;">••••••••••••••••••••••</div>
            <div id="nsecShown" style="display:none;background:#151821;border:1px solid #333;border-radius:8px;padding:8px;word-break:break-all;margin-bottom:8px;">${window.NostrAuth.state.nsec||'—'}</div>
            <div style="display:flex;gap:8px;">
              <button id="revealNsec" style="padding:6px 10px;border:none;border-radius:8px;background:#5a6cff;color:#fff;cursor:pointer;">Reveal nsec</button>
              <button id="copyNsec" style="padding:6px 10px;border:none;border-radius:8px;background:#444;color:#fff;cursor:pointer;">Copy nsec</button>
            </div>

            <h3 style="margin:14px 0 8px 0;">Relays</h3>
            <div id="relaysList" style="max-height:180px;overflow:auto;border:1px solid #333;border-radius:8px;padding:8px;background:#151821;"></div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <input id="newRelayUrl" placeholder="wss://..." style="flex:1;padding:8px;background:#151821;border:1px solid #333;border-radius:8px;color:#fff;">
              <button id="addRelay" style="padding:8px 12px;border:none;border-radius:8px;background:#2b9c4a;color:#fff;cursor:pointer;">Add</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    function refreshRelays(){
      const box=document.getElementById('relaysList'); box.innerHTML='';
      const urls=Object.keys(window.NostrAuth.state.relayMap||{});
      urls.forEach(u=>{
        const row=document.createElement('div'); row.style='display:flex;gap:8px;align-items:center;justify-content:space-between;border-bottom:1px solid #222;padding:6px 0;';
        row.innerHTML=`<div style="word-break:break-all;">${u}</div>
          <div style="display:flex;gap:6px;">
            <button data-url="${u}" class="toggle" style="padding:4px 8px;border:none;border-radius:8px;background:#444;color:#fff;cursor:pointer;">${window.NostrAuth.state.relayMap[u] ? 'Disconnect' : 'Connect'}</button>
            <button data-url="${u}" class="remove" style="padding:4px 8px;border:none;border-radius:8px;background:#a33;color:#fff;cursor:pointer;">Remove</button>
          </div>`;
        box.appendChild(row);
      });
      box.querySelectorAll('button.toggle').forEach(b=>b.onclick=()=>{ window.NostrAuth.toggleRelay(b.dataset.url); refreshRelays(); });
      box.querySelectorAll('button.remove').forEach(b=>b.onclick=()=>{ window.NostrAuth.removeRelay(b.dataset.url); refreshRelays(); });
    }

    document.getElementById('nostrSettingsClose').onclick=()=>modal.remove();
    document.getElementById('copyNpub').onclick=()=>{ navigator.clipboard.writeText(window.NostrAuth.state.npub||'').then(()=>alert('Copied npub')); };
    document.getElementById('revealNsec').onclick=()=>{ nsecHidden.style.display='none'; nsecShown.style.display='block'; };
    document.getElementById('copyNsec').onclick=()=>{ navigator.clipboard.writeText(window.NostrAuth.state.nsec||'').then(()=>alert('Copied nsec')); };
    document.getElementById('addRelay').onclick=()=>{ const url=newRelayUrl.value.trim(); if(!url) return; window.NostrAuth.addRelay(url); newRelayUrl.value=''; refreshRelays(); };
    document.getElementById('pf_save').onclick=()=>{
      const formVals = {
        display_name: document.getElementById('pf_display').value,
        name:         document.getElementById('pf_name').value,
        about:        document.getElementById('pf_about').value,
        picture:      document.getElementById('pf_picture').value,
        banner:       document.getElementById('pf_banner').value,
        website:      document.getElementById('pf_website').value,
        lud16:        document.getElementById('pf_lud16').value
      };
      window.NostrProfile.save(formVals);
      alert('Profile update published.');
    };

    refreshRelays();
  }

  ns.init = function(){
    if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', ensureAttached); }
    else { ensureAttached(); }
  };

  global.NostrSettings = ns;
})(window);
