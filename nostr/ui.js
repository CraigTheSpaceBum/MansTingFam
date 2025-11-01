(function(global){
  function hideLegacyLogin(){ const legacy=document.getElementById('loginScreen')||document.querySelector('.login-screen, #login, .login'); if(legacy) legacy.style.display='none'; }
  function showLogin(){
    hideLegacyLogin();
    const old=document.getElementById('nostrLoginModal'); if(old) old.remove();
    const modal=document.createElement('div'); modal.id='nostrLoginModal'; modal.style='position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;';
    modal.innerHTML=`
      <div style="background:#0f1115;color:#e6e6e6;width:460px;max-width:92vw;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.6);padding:22px;position:relative;">
        <button id="nostrLoginClose" aria-label="Close" title="Close" style="position:absolute;top:10px;right:10px;background:#222;border:none;color:#aaa;border-radius:10px;width:32px;height:32px;cursor:pointer;">✕</button>
        <h2 style="margin:0 0 8px 0;">Sign in to Nostr</h2>
        <label style="display:block;margin-bottom:6px;color:#bbb;">NSEC (paste here):</label>
        <input id="loginNsec" type="text" placeholder="nsec1... or hex" style="width:100%;padding:10px;border-radius:10px;border:1px solid #333;background:#151821;color:#fff;margin-bottom:10px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
          <button id="btnLoginNsec" style="padding:10px;border-radius:10px;border:none;background:#5a6cff;color:white;cursor:pointer;">🔐 Login with NSEC</button>
          <button id="btnGenerateKeys" style="padding:10px;border-radius:10px;border:none;background:#2b9c4a;color:white;cursor:pointer;">🗝️ Generate Keys</button>
          <button id="btnExtension" style="padding:10px;border-radius:10px;border:none;background:#444;color:white;cursor:pointer;">🧩 Extension</button>
          <button id="btnDemo" style="padding:10px;border-radius:10px;border:none;background:#444;color:white;cursor:pointer;">🎮 Demo</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('nostrLoginClose').onclick=()=>modal.remove();
    document.getElementById('btnLoginNsec').onclick=()=>{ const v=loginNsec.value.trim(); if(!v) return alert('Paste your nsec or hex first.'); try{ const creds=window.NostrAuth.loginWithNsec(v); afterLogin(creds); modal.remove(); }catch(e){ alert(e.message);} };
    document.getElementById('btnGenerateKeys').onclick=()=>{ const creds=window.NostrAuth.generateKeys(); afterLogin(creds, { blankName:true }); modal.remove(); alert('Generated keys. Use ⚙️ to set your profile.'); };
    document.getElementById('btnExtension').onclick=()=>alert('NIP-07 extensions are not available in Electron by default.');
    document.getElementById('btnDemo').onclick=()=>{ modal.remove(); afterLogin({ npub:'demo-mode' }); };
  }
  function afterLogin(creds, opts={}){ const nameEl=document.querySelector('#displayName, .display-name, .user-name'); if(nameEl && opts.blankName){ nameEl.textContent=''; } window.NostrProfile.load(); window.NostrFeed.init(); window.NostrSettings.init(); }
  function boot(){ window.NostrAuth.initOnLoad(); if(!window.NostrAuth.state.npub){ showLogin(); } else { hideLegacyLogin(); afterLogin({ npub: window.NostrAuth.state.npub }); } }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})(window);
