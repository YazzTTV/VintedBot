(()=>{var Lt=`
/* VINTEO WIDGET STYLES */

@keyframes vinteo-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes vinteo-fadeIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes vinteo-glow-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

@keyframes vinteo-spin {
  to { transform: rotate(360deg); }
}

@keyframes vinteo-live {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,230,118,0.4); }
  50% { box-shadow: 0 0 0 4px rgba(0,230,118,0); }
}

/* \u2500\u2500 Scrollbar \u2500\u2500 */
#vinteo-panel::-webkit-scrollbar { width: 3px !important; }
#vinteo-panel::-webkit-scrollbar-track { background: transparent !important; }
#vinteo-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1) !important; border-radius: 2px !important; }
#vinteo-panel { scrollbar-width: thin !important; scrollbar-color: rgba(255,255,255,0.1) transparent !important; }

/* \u2500\u2500 Panel base \u2500\u2500 */
#vinteo-panel .vw-popup {
  padding: 0 !important;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
  font-size: 13px !important;
  line-height: 1.5 !important;
  color: #EEEEF5 !important;
  -webkit-font-smoothing: antialiased !important;
  -moz-osx-font-smoothing: grayscale !important;
}

/* \u2500\u2500 Header \u2500\u2500 */
#vinteo-panel .vw-header {
  padding: 20px 22px 16px !important;
  border-bottom: 1px solid rgba(255,255,255,0.04) !important;
  background: linear-gradient(180deg, rgba(0,230,118,0.03) 0%, transparent 100%) !important;
}

#vinteo-panel .vw-header-top {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 16px !important;
}

#vinteo-panel .vw-logo {
  display: flex !important;
  align-items: baseline !important;
  gap: 2px !important;
}

#vinteo-panel .vw-logo-text {
  font-family: 'Syne', sans-serif !important;
  font-weight: 800 !important;
  font-size: 22px !important;
  letter-spacing: -0.03em !important;
  color: #fff !important;
}

#vinteo-panel .vw-logo-dot {
  width: 6px !important;
  height: 6px !important;
  background: #00E676 !important;
  border-radius: 50% !important;
  box-shadow: 0 0 12px rgba(0,230,118,0.6) !important;
  display: inline-block !important;
  margin-left: 1px !important;
}

#vinteo-panel .vw-version {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 9px !important;
  color: #3A3A4C !important;
  padding: 3px 8px !important;
  background: rgba(255,255,255,0.03) !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  border-radius: 6px !important;
}

/* \u2500\u2500 User row \u2500\u2500 */
#vinteo-panel .vw-user-row {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 10px 14px !important;
  background: rgba(255,255,255,0.025) !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  border-radius: 12px !important;
}

#vinteo-panel .vw-user-info {
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 1px !important;
}

#vinteo-panel .vw-user-name {
  font-weight: 600 !important;
  font-size: 13px !important;
  color: #fff !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

#vinteo-panel .vw-user-plan {
  font-size: 10px !important;
  font-weight: 600 !important;
  color: #5A5A6C !important;
  letter-spacing: 0.05em !important;
  text-transform: uppercase !important;
}

/* \u2500\u2500 Tier styles \u2500\u2500 */
#vinteo-panel .vw-tier-premium {
  background: linear-gradient(135deg, rgba(124,110,250,0.12), rgba(124,110,250,0.03)) !important;
  border-color: rgba(124,110,250,0.18) !important;
  box-shadow: 0 0 16px rgba(124,110,250,0.06) !important;
}
#vinteo-panel .vw-tier-premium .vw-user-plan {
  color: #7C6EFA !important;
}

#vinteo-panel .vw-tier-pro {
  background: linear-gradient(135deg, rgba(0,230,118,0.1), rgba(0,230,118,0.02)) !important;
  border-color: rgba(0,230,118,0.18) !important;
  box-shadow: 0 0 16px rgba(0,230,118,0.06) !important;
}
#vinteo-panel .vw-tier-pro .vw-user-plan {
  color: #00E676 !important;
}

#vinteo-panel .vw-user-status {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  font-size: 10px !important;
  color: #5A5A6C !important;
  flex-shrink: 0 !important;
}

#vinteo-panel .vw-live-dot {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: #00E676 !important;
  animation: vinteo-live 2s ease-in-out infinite !important;
}

/* \u2500\u2500 Cards \u2500\u2500 */
#vinteo-panel .vw-card {
  margin: 10px 14px !important;
  padding: 16px 18px !important;
  background: rgba(14,14,22,0.7) !important;
  backdrop-filter: blur(20px) saturate(1.5) !important;
  -webkit-backdrop-filter: blur(20px) saturate(1.5) !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  border-radius: 14px !important;
  animation: vinteo-fadeIn 0.35s ease both !important;
  transition: border-color 0.25s, box-shadow 0.25s !important;
  position: relative !important;
  overflow: hidden !important;
}

#vinteo-panel .vw-card::before {
  content: '' !important;
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: 0 !important;
  height: 1px !important;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent) !important;
  pointer-events: none !important;
}

#vinteo-panel .vw-card:hover {
  border-color: rgba(255,255,255,0.08) !important;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15) !important;
}

#vinteo-panel .vw-card:nth-child(1) { animation-delay: 0s !important; }
#vinteo-panel .vw-card:nth-child(2) { animation-delay: 0.08s !important; }
#vinteo-panel .vw-card:nth-child(3) { animation-delay: 0.16s !important; }

#vinteo-panel .vw-card-header {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin-bottom: 14px !important;
}

#vinteo-panel .vw-card-icon {
  width: 28px !important;
  height: 28px !important;
  border-radius: 8px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}
#vinteo-panel .vw-card-icon svg {
  width: 14px !important;
  height: 14px !important;
}
#vinteo-panel .vw-ci-green  { background: rgba(0,230,118,0.1) !important; color: #00E676 !important; border: 1px solid rgba(0,230,118,0.1) !important; }
#vinteo-panel .vw-ci-purple { background: rgba(124,110,250,0.1) !important; color: #7C6EFA !important; border: 1px solid rgba(124,110,250,0.1) !important; }
#vinteo-panel .vw-ci-blue   { background: rgba(77,159,255,0.1) !important; color: #4D9FFF !important; border: 1px solid rgba(77,159,255,0.1) !important; }

#vinteo-panel .vw-label {
  font-size: 11px !important;
  font-weight: 600 !important;
  color: #7A7A8C !important;
  letter-spacing: 0.03em !important;
}

/* \u2500\u2500 Orbital sync ring \u2500\u2500 */
@keyframes vinteo-orbit-rotate {
  from { transform: rotate(-90deg); }
  to { transform: rotate(270deg); }
}

@keyframes vinteo-orbit-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(0,230,118,0.3)); }
  50% { filter: drop-shadow(0 0 10px rgba(0,230,118,0.6)); }
}

#vinteo-panel .vw-orbit-section {
  display: flex !important;
  align-items: center !important;
  gap: 20px !important;
  margin-bottom: 16px !important;
  padding: 8px 0 !important;
}

#vinteo-panel .vw-orbit-ring {
  width: 90px !important;
  height: 90px !important;
  position: relative !important;
  flex-shrink: 0 !important;
}

#vinteo-panel .vw-orbit-center {
  position: absolute !important;
  inset: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  pointer-events: none !important;
}

#vinteo-panel .vw-orbit-count {
  font-family: 'Syne', sans-serif !important;
  font-weight: 800 !important;
  font-size: 18px !important;
  color: #fff !important;
  line-height: 1 !important;
  max-width: 70px !important;
  text-align: center !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

#vinteo-panel .vw-orbit-label {
  font-size: 9px !important;
  color: #5A5A6C !important;
  text-transform: uppercase !important;
  letter-spacing: 0.12em !important;
  margin-top: 2px !important;
}

#vinteo-panel .vw-orbit-info {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
}

#vinteo-panel .vw-orbit-timer {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 18px !important;
  font-weight: 600 !important;
  color: #00E676 !important;
  line-height: 1.1 !important;
  letter-spacing: 0.02em !important;
}

#vinteo-panel .vw-orbit-sub {
  font-size: 10px !important;
  color: #5A5A6C !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
}

#vinteo-panel .vw-orbit-last {
  font-size: 11px !important;
  color: #3A3A4C !important;
  margin-top: 6px !important;
}

/* \u2500\u2500 Sync button \u2500\u2500 */
#vinteo-panel .vw-btn-sync {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  padding: 11px 16px !important;
  border-radius: 10px !important;
  background: linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,230,118,0.04)) !important;
  border: 1px solid rgba(0,230,118,0.15) !important;
  color: #00E676 !important;
  font-family: 'DM Sans', sans-serif !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: all 0.25s ease !important;
  position: relative !important;
  overflow: hidden !important;
  letter-spacing: 0.02em !important;
  box-sizing: border-box !important;
}

#vinteo-panel .vw-btn-sync svg {
  width: 14px !important;
  height: 14px !important;
  flex-shrink: 0 !important;
}

#vinteo-panel .vw-btn-glow {
  position: absolute !important;
  inset: 0 !important;
  background: radial-gradient(ellipse at center, rgba(0,230,118,0.08), transparent 70%) !important;
  pointer-events: none !important;
  animation: vinteo-glow-pulse 3s ease-in-out infinite !important;
}

#vinteo-panel .vw-btn-sync:hover {
  background: linear-gradient(135deg, rgba(0,230,118,0.2), rgba(0,230,118,0.08)) !important;
  border-color: rgba(0,230,118,0.3) !important;
  box-shadow: 0 0 24px rgba(0,230,118,0.12), 0 4px 16px rgba(0,0,0,0.2) !important;
  transform: translateY(-1px) !important;
}

#vinteo-panel .vw-btn-sync:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

#vinteo-panel .vw-btn-sync.syncing svg {
  animation: vinteo-spin 1s linear infinite !important;
}

#vinteo-panel .vw-sync-status {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 10px !important;
  font-weight: 500 !important;
  color: #5A5A6C !important;
  text-align: center !important;
  min-height: 14px !important;
  margin-top: 6px !important;
}

/* \u2500\u2500 Accounts \u2500\u2500 */
#vinteo-panel .vw-accounts-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
}

#vinteo-panel .vw-account-empty {
  font-size: 11px !important;
  color: #3A3A4C !important;
  text-align: center !important;
  padding: 8px !important;
}

/* \u2500\u2500 Quick links grid \u2500\u2500 */
#vinteo-panel .vw-quick-grid {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 8px !important;
}

#vinteo-panel .vw-qlink {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  padding: 11px 12px !important;
  background: rgba(255,255,255,0.02) !important;
  border: 1px solid rgba(255,255,255,0.04) !important;
  border-radius: 10px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  color: #8A8A9C !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  text-decoration: none !important;
  font-family: 'DM Sans', sans-serif !important;
  box-sizing: border-box !important;
  position: relative !important;
  overflow: hidden !important;
}

#vinteo-panel .vw-qlink-icon {
  width: 24px !important;
  height: 24px !important;
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  transition: transform 0.2s !important;
}
#vinteo-panel .vw-qlink-icon svg { width: 12px !important; height: 12px !important; }

#vinteo-panel .vw-qlink-green .vw-qlink-icon  { background: rgba(0,230,118,0.08) !important; color: #00E676 !important; }
#vinteo-panel .vw-qlink-purple .vw-qlink-icon { background: rgba(124,110,250,0.08) !important; color: #7C6EFA !important; }
#vinteo-panel .vw-qlink-amber .vw-qlink-icon  { background: rgba(245,166,35,0.08) !important; color: #F5A623 !important; }

#vinteo-panel .vw-qlink-label { flex: 1 !important; }
#vinteo-panel .vw-qlink-arrow { color: #2A2A3C !important; transition: all 0.2s !important; flex-shrink: 0 !important; }

#vinteo-panel .vw-qlink:hover {
  background: rgba(255,255,255,0.04) !important;
  border-color: rgba(255,255,255,0.08) !important;
  color: #E0E0EA !important;
  transform: translateY(-1px) !important;
}
#vinteo-panel .vw-qlink:hover .vw-qlink-icon { transform: scale(1.1) !important; }
#vinteo-panel .vw-qlink:hover .vw-qlink-arrow { color: #5A5A6C !important; transform: translateX(2px) !important; }

/* \u2500\u2500 Upsell (free users) \u2500\u2500 */
#vinteo-panel .vw-upsell {
  text-align: center !important;
  padding: 16px 8px !important;
}
#vinteo-panel .vw-upsell-icon {
  width: 48px !important; height: 48px !important; border-radius: 14px !important;
  background: linear-gradient(135deg, rgba(124,110,250,0.12), rgba(124,110,250,0.04)) !important;
  border: 1px solid rgba(124,110,250,0.15) !important;
  display: inline-flex !important; align-items: center !important; justify-content: center !important;
  margin-bottom: 14px !important; color: #7C6EFA !important;
}
#vinteo-panel .vw-upsell-title { font-family: 'Syne', sans-serif !important; font-weight: 700 !important; font-size: 16px !important; color: #fff !important; margin-bottom: 6px !important; }
#vinteo-panel .vw-upsell-desc { font-size: 12px !important; color: #5A5A6C !important; margin-bottom: 18px !important; line-height: 1.6 !important; }
#vinteo-panel .vw-btn-upsell {
  display: inline-flex !important; align-items: center !important; gap: 8px !important;
  padding: 10px 20px !important; border-radius: 10px !important;
  background: linear-gradient(135deg, #7C6EFA, #5B4FD9) !important; color: #fff !important;
  font-size: 13px !important; font-weight: 600 !important; border: none !important;
  cursor: pointer !important; transition: all 0.2s !important; text-decoration: none !important;
  font-family: 'DM Sans', sans-serif !important;
}
#vinteo-panel .vw-btn-upsell:hover { box-shadow: 0 0 24px rgba(124,110,250,0.3) !important; transform: translateY(-1px) !important; }

/* \u2500\u2500 Login state \u2500\u2500 */
#vinteo-panel .vw-login-state {
  text-align: center !important; padding: 20px 8px !important;
}
#vinteo-panel .vw-login-icon {
  width: 48px !important; height: 48px !important; border-radius: 14px !important;
  background: rgba(0,230,118,0.08) !important; border: 1px solid rgba(0,230,118,0.12) !important;
  display: inline-flex !important; align-items: center !important; justify-content: center !important;
  color: #00E676 !important; margin-bottom: 14px !important;
}
#vinteo-panel .vw-login-title { font-family: 'Syne', sans-serif !important; font-weight: 700 !important; font-size: 16px !important; color: #fff !important; margin-bottom: 6px !important; }
#vinteo-panel .vw-login-desc { font-size: 12px !important; color: #5A5A6C !important; margin-bottom: 18px !important; line-height: 1.6 !important; }
#vinteo-panel .vw-btn-login {
  display: inline-flex !important; align-items: center !important; gap: 8px !important;
  padding: 10px 20px !important; border-radius: 10px !important;
  background: linear-gradient(135deg, rgba(0,230,118,0.15), rgba(0,230,118,0.05)) !important;
  border: 1px solid rgba(0,230,118,0.2) !important; color: #00E676 !important;
  font-size: 13px !important; font-weight: 600 !important; cursor: pointer !important;
  transition: all 0.2s !important; text-decoration: none !important; font-family: 'DM Sans', sans-serif !important;
}
#vinteo-panel .vw-btn-login:hover {
  background: linear-gradient(135deg, rgba(0,230,118,0.25), rgba(0,230,118,0.1)) !important;
  box-shadow: 0 0 24px rgba(0,230,118,0.15) !important; transform: translateY(-1px) !important;
}

/* \u2500\u2500 Footer \u2500\u2500 */
#vinteo-panel .vw-footer {
  padding: 12px 22px 16px !important;
  border-top: 1px solid rgba(255,255,255,0.04) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
}

#vinteo-panel .vw-footer-link {
  font-family: 'DM Sans', sans-serif !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  color: #3A3A4C !important;
  cursor: pointer !important;
  background: none !important;
  border: none !important;
  text-decoration: none !important;
  transition: color 0.15s !important;
  padding: 0 !important;
}
#vinteo-panel .vw-footer-link:hover { color: #7A7A8C !important; }
#vinteo-panel .vw-footer-danger:hover { color: #f87171 !important; }

/* \u2500\u2500 Alert banner \u2500\u2500 */
#vinteo-panel .vw-alert { display: none; align-items: flex-start !important; gap: 10px !important; padding: 12px 14px !important; background: rgba(255,77,77,0.08) !important; border: 1px solid rgba(255,77,77,0.2) !important; border-radius: 10px !important; font-size: 12px !important; color: #FF4D4D !important; margin: 10px 14px !important; }
#vinteo-panel .vw-alert.show { display: flex !important; }
#vinteo-panel .vw-alert svg { flex-shrink: 0 !important; margin-top: 1px !important; }
#vinteo-panel .vw-alert-content { flex: 1 !important; }
#vinteo-panel .vw-alert-text { margin-bottom: 8px !important; line-height: 1.4 !important; }
#vinteo-panel .vw-btn-sm { display: inline-flex !important; align-items: center !important; gap: 4px !important; padding: 5px 10px !important; background: #7C6EFA !important; color: #fff !important; border: none !important; border-radius: 6px !important; font-family: 'DM Sans', sans-serif !important; font-size: 11px !important; font-weight: 600 !important; cursor: pointer !important; transition: all 0.15s ease !important; }
#vinteo-panel .vw-btn-sm:hover { background: #8F83FB !important; }

#vinteo-panel .vw-btn { box-sizing: border-box !important; text-decoration: none !important; }
`,M=null,ot=null;function Bt(t){M=t}function vt(t,e,n){if(!M)return;ot&&clearTimeout(ot);let r={success:{color:"#00E676",border:"#00E676"},error:{color:"#FF4D4D",border:"#FF4D4D"},info:{color:"#4D9FFF",border:"#4D9FFF"}},i=r[e]||r.info;M.style.setProperty("color",i.color,"important"),M.style.setProperty("border-left","3px solid "+i.border,"important"),M.textContent=t,M.style.setProperty("display","flex","important"),M.style.setProperty("opacity","1","important"),M.style.setProperty("transform","translateX(-50%)","important"),n&&n>0&&(ot=setTimeout(()=>{M.style.setProperty("opacity","0","important"),M.style.setProperty("transform","translateX(-50%) translateY(-10px)","important"),setTimeout(()=>{M.style.setProperty("display","none","important")},300)},n))}var L=!1,ft=0,gt=0,ht=0,wt=0,O=!1,P=null,rt=null;function yt(){let t=P.getBoundingClientRect(),e=t.left,n=window.innerHeight-t.top+8,r=Math.min(360,window.innerWidth-24);e+r>window.innerWidth-10&&(e=window.innerWidth-r-10),e<10&&(e=10),n>window.innerHeight-60&&(n=window.innerHeight-60),rt.style.setProperty("left",e+"px","important"),rt.style.setProperty("bottom",n+"px","important")}function qt(){let t=P.getBoundingClientRect();chrome.storage.local.set({vinteo_widget_pos:{left:t.left,bottom:window.innerHeight-t.bottom}})}function Ot(){chrome.storage.local.get("vinteo_widget_pos",t=>{if(t.vinteo_widget_pos){let e=t.vinteo_widget_pos;P.style.setProperty("left",Math.max(0,Math.min(window.innerWidth-44,e.left))+"px","important"),P.style.setProperty("bottom",Math.max(0,Math.min(window.innerHeight-44,e.bottom))+"px","important")}})}function bt(t,e){L=!0,O=!1,ft=t,gt=e,ht=P.getBoundingClientRect().left,wt=window.innerHeight-P.getBoundingClientRect().bottom,P.style.setProperty("transition","none","important")}function xt(t,e){if(!L)return;let n=t-ft,r=e-gt;if((Math.abs(n)>3||Math.abs(r)>3)&&(O=!0),!O)return;let i=Math.max(0,Math.min(window.innerWidth-44,ht+n)),o=Math.max(0,Math.min(window.innerHeight-44,wt-r));P.style.setProperty("left",i+"px","important"),P.style.setProperty("bottom",o+"px","important")}function kt(t){L&&(L=!1,P.style.setProperty("transition","all 0.2s ease","important"),O?(qt(),yt()):t())}function Ht(t,e,n){P=t,rt=e,Ot(),t.addEventListener("mousedown",r=>{r.button===0&&(bt(r.clientX,r.clientY),r.preventDefault())}),t.addEventListener("touchstart",r=>{let i=r.touches[0];bt(i.clientX,i.clientY)},{passive:!0}),document.addEventListener("mousemove",r=>{xt(r.clientX,r.clientY)}),document.addEventListener("touchmove",r=>{if(L){let i=r.touches[0];xt(i.clientX,i.clientY)}},{passive:!0}),document.addEventListener("mouseup",r=>{if(L){var i=O;kt(()=>{i||n()})}}),document.addEventListener("touchend",()=>{if(L){var r=O;kt(()=>{r||n()})}}),document.addEventListener("click",r=>{t.contains(r.target)||e.contains(r.target)||e.style.setProperty("display","none","important")}),t.addEventListener("mouseenter",()=>{t.style.setProperty("border-color","rgba(255,255,255,0.14)","important"),t.style.setProperty("transform","scale(1.08)","important")}),t.addEventListener("mouseleave",()=>{t.style.setProperty("border-color","rgba(255,255,255,0.08)","important"),t.style.setProperty("transform","scale(1)","important")})}var Nt="https://vinteo.xyz";function it(){if(window._vinteoCSRF)return window._vinteoCSRF;for(var t=document.querySelectorAll("script"),e=/"CSRF_TOKEN\\?":\\?"([^"\\]+)\\?"/,n=0;n<t.length;n++){var r=(t[n].textContent||"").match(e);if(r&&r[1])return window._vinteoCSRF=r[1],r[1]}var i=document.querySelector('meta[name="csrf-token"]');if(i){var o=i.getAttribute("content");if(o)return window._vinteoCSRF=o,o}return null}async function Rt(){var t=it();if(t)return t;try{await fetch(window.location.origin+"/api/v2/users/current",{credentials:"include",headers:{Accept:"application/json"}})}catch{}return t=it(),t||new Promise(function(e){var n=!1;function r(a){n||(n=!0,clearInterval(i),clearTimeout(o),e(a))}var i=setInterval(function(){var a=it();a&&r(a)},200),o=setTimeout(function(){r(null)},4e3)})}function Jt(){for(var t=document.cookie.split(";"),e=0;e<t.length;e++){var n=t[e].trim();if(n.startsWith("anon_id="))return n.substring(8)}return null}function Ut(t,e){var n={"Content-Type":"application/json",Accept:"application/json","X-Money-Object":"true"};return t&&(n["X-CSRF-Token"]=t),e&&(n["X-Anon-Id"]=e),n}function h(t,e,n){n=n||3e4;var r=new AbortController,i=setTimeout(function(){r.abort()},n);return e=Object.assign({},e,{signal:r.signal}),fetch(t,e).finally(function(){clearTimeout(i)})}async function U(t,e,n){n=n||2;for(var r,i=0;i<=n;i++){try{var o=await h(t,e,3e4);if(o.ok||o.status<500)return o;r=new Error("HTTP "+o.status)}catch(a){r=a}i<n&&await B(Math.pow(2,i+1)*1e3)}throw r}function B(t){return new Promise(function(e){setTimeout(e,t)})}var R=null;async function z(){if(R&&R.csrfToken)return R;var t=await Rt(),e=Jt();return R={csrfToken:t,anonId:e,headers:Ut(t,e),origin:window.location.origin},R}async function Yt(){return new Promise(function(t){try{if(!chrome||!chrome.storage||!chrome.storage.local){t(null);return}chrome.storage.local.get(["vinteo_session"],function(e){if(!e||!e.vinteo_session){t(null);return}try{var n=typeof e.vinteo_session=="string"?JSON.parse(e.vinteo_session):e.vinteo_session;t(n&&n.token?n.token:null)}catch{t(null)}})}catch{t(null)}})}async function Vt(t,e){var n=await Yt();if(!n)throw new Error("No Vinteo session");return e=e||{},e.headers=Object.assign({"Content-Type":"application/json",Authorization:"Bearer "+n},e.headers||{}),h(Nt+t,e,15e3)}async function Xt(t){for(var e=await z(),n=e.origin,r=e.headers,i=[],o=1,a=100;o<=a;){var s=n+"/api/v2/my_orders?type=sold&status=all&per_page=50&page="+o,l;try{l=await h(s,{credentials:"include",headers:r},15e3)}catch{break}if(!l.ok)if(o===1){if(l=await h(n+"/api/v2/my_orders?type=sold&per_page=50&page=1",{credentials:"include",headers:r},15e3),!l.ok)break}else break;var m=await l.json(),d=m.my_orders||m.orders||[];if(d.length===0||(i=i.concat(d),d.length<50))break;o++,await B(100)}if(i.length===0)return{success:!0,count:0};for(var c=[],v=0;v<i.length;v++){var p=i[v];t&&t({current:v+1,total:i.length,title:p.title||""});var w=p.transaction_id||p.id,u={id:w,title:p.title||"",price:p.price?typeof p.price=="object"?p.price.amount:p.price:0,item_id:p.item_id||p.item&&p.item.id,buyer:p.buyer?p.buyer.login||p.buyer.name:"",buyer_id:p.buyer?p.buyer.id:null,buyer_photo:p.buyer&&p.buyer.photo?p.buyer.photo.url||p.buyer.photo.full_size_url:null,photo:p.photo?typeof p.photo=="string"?p.photo:p.photo.url||p.photo.full_size_url:null,status:p.status||"unknown",created_at:p.created_at||p.date,conversation_id:p.user_msg_thread_id||null};try{var C=await h(n+"/api/v2/transactions/"+w,{credentials:"include",headers:r},1e4);if(C.ok){var x=await C.json(),f=x.transaction||x;u.status=f.status||u.status,u.shipping_status=f.shipping_order?f.shipping_order.status:null,u.tracking_code=f.shipment?f.shipment.tracking_code:null,u.conversation_id=f.user_msg_thread_id||u.conversation_id,f.item&&(u.title=f.item.title||u.title,u.item_id=f.item.id||u.item_id,f.item.photo&&(u.photo=f.item.photo.url||f.item.photo.full_size_url||u.photo))}}catch{}try{var k=await h(n+"/api/v2/transactions/"+w+"/shipment/pdf_label",{credentials:"include",headers:r},8e3);if(k.ok){var j=await k.json();u.label_url=j.url||j.label_url||null}}catch{}try{var A=await h(n+"/api/v2/transactions/"+w+"/shipment/journey_summary",{credentials:"include",headers:r},8e3);if(A.ok){var I=await A.json();u.journey=I}}catch{}c.push(u),v<i.length-1&&await B(50)}try{var g=await h(n+"/api/v2/users/current",{credentials:"include",headers:r},1e4),S="unknown",tt=null;if(g.ok){var et=await g.json(),nt=et.user||et;S=nt.login||"unknown",tt=nt.photo?nt.photo.url||nt.photo.full_size_url:null}await Vt("/api/sales/process",{method:"POST",body:JSON.stringify({orders:c,origin:n,login:S,photo:tt,source:"ios-widget"})})}catch{}return{success:!0,count:c.length}}async function Wt(){var t=await z(),e=t.origin,n=t.headers,r=await h(e+"/api/v2/users/current",{credentials:"include",headers:n},1e4);if(!r.ok)throw new Error("Cannot fetch user");for(var i=await r.json(),o=i.user||i,a=o.id,s=o.login,l=[],m=1;m<=50;){var d=e+"/api/v2/wardrobe/"+a+"/items?per_page=96&page="+m+"&order=relevance",c=await h(d,{credentials:"include",headers:n},15e3);if(c.status===429&&(await B(3e4+Math.random()*3e4),c=await h(d,{credentials:"include",headers:n},15e3)),!c.ok)break;var v=await c.json(),p=v.items||[];if(p.length===0||(l=l.concat(p),p.length<96))break;m++,await B(800+Math.random()*700)}return{success:!0,items:l,userId:a,login:s,origin:e}}async function Gt(t){var e=await z(),n=await h(e.origin+"/api/v2/item_upload/items/"+t,{credentials:"include",headers:e.headers},1e4);if(n.ok||(n=await h(e.origin+"/api/v2/items/"+t,{credentials:"include",headers:{Accept:"application/json"}},1e4)),!n.ok)throw new Error("HTTP "+n.status);var r=await n.json();return{success:!0,item:r.item||r}}async function Kt(t,e){var n=await z(),r=n.origin,i=n.headers,o=await h(r+"/api/v2/item_upload/items/"+t,{credentials:"include",headers:i},1e4);if(!o.ok)throw new Error("Cannot fetch item");var a=await o.json();a.item&&(a=a.item);var s=parseFloat(a.price_numeric||a.price)||0,l={title:a.title,description:a.description||"",catalog_id:a.catalog_id,brand_id:a.brand_id,size_id:a.size_id,status_id:a.status_id,color_ids:a.color_ids||(a.color1_id?[a.color1_id,a.color2_id].filter(Boolean):[]),package_size_id:a.package_size_id,price:e,photos:(a.photos||[]).map(function(d){return{id:d.id,orientation:d.orientation||0}})},m=await U(r+"/api/v2/item_upload/drafts/"+t,{method:"PUT",credentials:"include",headers:Object.assign({},i,{"Content-Type":"application/json"}),body:JSON.stringify(l)},1);if(!m.ok)throw new Error("Update failed HTTP "+m.status);return{success:!0,oldPrice:s,newPrice:e}}async function Et(t){var e=await z(),n=e.origin,r=Object.assign({},e.headers,{"Content-Type":"application/json"}),i=await Promise.all([h(n+"/api/v2/items/"+t,{method:"DELETE",credentials:"include",headers:r},1e4).then(function(o){return o.ok}).catch(function(){return!1}),h(n+"/api/v2/items/"+t+"/delete",{method:"POST",credentials:"include",headers:r,body:"{}"},1e4).then(function(o){return o.ok}).catch(function(){return!1}),h(n+"/api/v2/item_upload/drafts/"+t,{method:"DELETE",credentials:"include",headers:r},1e4).then(function(o){return o.ok}).catch(function(){return!1})]);return i[0]||i[1]||i[2]?{success:!0}:{success:!1,error:"Suppression \xE9chou\xE9e"}}async function Qt(t,e){var n=await z(),r=n.origin,i=n.headers,o=e||{},a=await h(r+"/api/v2/item_upload/items/"+t,{credentials:"include",headers:i},15e3);if(a.ok||(a=await h(r+"/api/v2/items/"+t,{credentials:"include",headers:{Accept:"application/json"}},15e3)),!a.ok)throw new Error("Cannot fetch item details");var s=await a.json();s.item&&(s=s.item);for(var l=s.photos||[],m=[],d=0;d<l.length;d++){var c=l[d].full_size_url||l[d].url;if(c){try{var v=await fetch(c).then(function(et){return et.blob()}),p=new FormData;p.append("photo[file]",v,"photo"+d+".jpg"),p.append("photo[type]","item");var w={};n.csrfToken&&(w["X-CSRF-Token"]=n.csrfToken),n.anonId&&(w["X-Anon-Id"]=n.anonId);var u=await h(r+"/api/v2/photos",{method:"POST",credentials:"include",headers:w,body:p},3e4);if(u.ok){var C=await u.json(),x=C.photo?C.photo.id:C.id;x&&m.push({id:x,orientation:0})}}catch{}await B(1500+Math.random()*1e3)}}if(m.length===0)throw new Error("No photos uploaded");var f=parseFloat(s.price_numeric||s.price)||0,k=f;o.priceReduction&&o.priceReduction>0&&(o.priceReductionMode==="percent"?k=f*(1-o.priceReduction/100):k=f-o.priceReduction,k=Math.max(1,Math.round(k*100)/100));var j={title:s.title,description:s.description||"",catalog_id:s.catalog_id,brand_id:s.brand_id,size_id:s.size_id,status_id:s.status_id,color_ids:s.color_ids||(s.color1_id?[s.color1_id,s.color2_id].filter(Boolean):[]),package_size_id:s.package_size_id,photos:m,price:k,currency:"EUR",shipment_type:s.shipment_type},A=await U(r+"/api/v2/item_upload/drafts",{method:"POST",credentials:"include",headers:Object.assign({},i,{"Content-Type":"application/json"}),body:JSON.stringify(j)},1);if(!A.ok){var I="";try{I=await A.text()}catch{}throw new Error("Draft creation failed: "+I.substring(0,100))}var g=await A.json(),S=g.id||g.item&&g.item.id;if(o.deleteAfter!==!1&&(await Et(t),await B(1e3)),!o.draft){var tt=await U(r+"/api/v2/item_upload/drafts/"+S+"/completion",{method:"POST",credentials:"include",headers:Object.assign({},i,{"Content-Type":"application/json"}),body:"{}"},1);if(!tt.ok)return{success:!0,newItemId:S,warning:"Published as draft only"}}return{success:!0,newItemId:S,oldPrice:f,newPrice:k}}async function Zt(){var t=null;try{t=await new Promise(function(i){chrome.storage.local.get("vinteo_sync_state",function(o){i(o.vinteo_sync_state?JSON.parse(o.vinteo_sync_state):{})})})}catch{t={}}var e=[];try{var n=await chrome.storage.local.get("vinteo_accounts_cache");if(n.vinteo_accounts_cache){var r=JSON.parse(n.vinteo_accounts_cache);r.accounts&&(e=r.accounts)}}catch{}return{syncState:t||{},accounts:e,version:"1.3"}}var Y=null,V=null;function Ct(){V||(V=setInterval(function(){try{chrome.runtime.sendMessage({action:"ping"},function(t){!chrome.runtime.lastError&&t&&t.pong&&(Y=!1,clearInterval(V),V=null)})}catch{}},3e4))}function D(t,e){if(Y){at(t).then(function(n){e&&e(n)}).catch(function(n){e&&e({success:!1,error:n.message})});return}try{chrome.runtime.sendMessage(t,function(n){if(chrome.runtime.lastError){Y=!0,Ct(),at(t).then(function(r){e&&e(r)}).catch(function(r){e&&e({success:!1,error:r.message})});return}e&&e(n)})}catch{Y=!0,Ct(),at(t).then(function(n){e&&e(n)}).catch(function(n){e&&e({success:!1,error:n.message})})}}async function at(t){var e=t.action;if(e==="ping")return{pong:!0,ts:Date.now(),iosMode:!0};if(e==="getPopupData")return await Zt();if(e==="triggerSync"||e==="fetchVintedOrdersWithProgress"){var n=await Xt(function(g){window.dispatchEvent(new CustomEvent("vinteo_sync_progress",{detail:g}))});try{chrome.storage.local.set({vinteo_last_auto_sync:Date.now(),vinteo_sync_state:JSON.stringify({lastSync:new Date().toISOString(),totalCount:Math.max(n.count||0,parseInt(localStorage.getItem("_vtc")||"0"))})}),localStorage.setItem("_vtc",String(Math.max(n.count||0,parseInt(localStorage.getItem("_vtc")||"0"))))}catch{}return window.dispatchEvent(new CustomEvent("vinteo_sync_complete",{detail:{count:n.count||0}})),{success:!0,count:n.count}}if(e==="fetchDressing")return await Wt();if(e==="fetchItemDetail")return await Gt(t.itemId);if(e==="fetchWardrobeItems")try{var r=await z(),i=r.origin,o=String(t.vintedUserId||"");if(!o)return{success:!1,error:"missing vintedUserId"};var a="vinteo_statuses_"+i,s=null;try{var l=localStorage.getItem(a);if(l){var m=JSON.parse(l);m&&m.ts&&Date.now()-m.ts<864e5&&Array.isArray(m.statuses)&&(s=m.statuses)}}catch{}if(!s)try{var d=await h(i+"/api/v2/statuses",{credentials:"include",headers:{Accept:"application/json"}},1e4);if(d.ok){var c=await d.json();s=c&&c.statuses||[];try{localStorage.setItem(a,JSON.stringify({ts:Date.now(),statuses:s}))}catch{}}}catch{}for(var v=[],p=96,w=1;w<=20;w++){for(var u,C=0;C<3&&(u=await h(i+"/api/v2/wardrobe/"+o+"/items?page="+w+"&per_page="+p+"&order=newest_first",{credentials:"include",headers:{Accept:"application/json"}},15e3),!(u.ok||u.status!==429&&u.status!==403));C++)await new Promise(function(g){setTimeout(g,1e3*Math.pow(2,C))});if(!u.ok){if(w===1)return{success:!1,error:"HTTP "+u.status};break}var x;try{x=await u.json()}catch{return{success:!1,error:"non-JSON response"}}for(var f=x&&x.items||[],k=0;k<f.length;k++)v.push(f[k]);var j=x&&x.pagination||null;if(j&&typeof j.total_pages=="number"&&w>=j.total_pages||f.length<p)break}return{success:!0,items:v,statuses:s||[],origin:i}}catch(g){return{success:!1,error:g.message}}if(e==="deleteItem")return await Et(t.itemId);if(e==="updateItemPrice")return await Kt(t.itemId,t.newPrice);if(e==="repostItem")return await Qt(t.itemId,t.options);if(e==="publishDraft"){var A=await z(),I=await U(A.origin+"/api/v2/item_upload/drafts/"+t.itemId+"/completion",{method:"POST",credentials:"include",headers:Object.assign({},A.headers,{"Content-Type":"application/json"}),body:"{}"},1);return{success:I.ok}}if(e==="syncSession"||e==="getSession")return await new Promise(function(g){try{chrome.storage.local.get(["vinteo_session"],function(S){if(S.vinteo_session)try{g(JSON.parse(S.vinteo_session))}catch{g(null)}else g(null)})}catch{g(null)}});if(e==="logout"){try{chrome.storage.local.remove("vinteo_session"),chrome.storage.local.set({vinteo_explicit_logout:!0})}catch{}return{success:!0}}return{success:!1,error:"Unsupported on iOS: "+e}}var st=null;function lt(t){st&&clearTimeout(st),st=setTimeout(()=>$t(t),300)}function $t(t){if(!chrome.runtime||!chrome.runtime.id){try{t(null)}catch{}return}try{chrome.storage.local.get(["vinteo_session","vinteo_explicit_logout"],e=>{if(chrome.runtime&&chrome.runtime.lastError){try{t(null)}catch{}return}let n=null;if(e.vinteo_session)try{n=typeof e.vinteo_session=="string"?JSON.parse(e.vinteo_session):e.vinteo_session}catch{}if(n&&n.token){try{chrome.storage.local.remove("vinteo_explicit_logout")}catch{}t(n);try{D({action:"syncSession"},()=>{chrome.runtime&&chrome.runtime.lastError||D({action:"getSession"},r=>{r&&r.token&&t(r)})})}catch{}}else if(e.vinteo_explicit_logout)t(null);else try{D({action:"syncSession"},()=>{if(chrome.runtime&&chrome.runtime.lastError){t(null);return}D({action:"getSession"},r=>{chrome.runtime&&chrome.runtime.lastError?t(null):t(r)})})}catch{t(null)}})}catch{try{t(null)}catch{}}}function te(t){chrome.storage.onChanged.addListener((e,n)=>{if(n!=="local"||!e.vinteo_session)return;let r=e.vinteo_session.newValue;if(r)try{let i=typeof r=="string"?JSON.parse(r):r;if(i&&i.token){try{chrome.storage.local.remove("vinteo_explicit_logout")}catch{}t(i);return}}catch{}t(null)})}function _t(t){t(null);try{chrome.storage.local.remove("vinteo_session")}catch{}try{chrome.storage.local.set({vinteo_explicit_logout:!0})}catch{}try{D({action:"logout"})}catch{}}function F(t,e,n){var r=document.getElementById("vinteo-orbit-progress");r&&r.setAttribute("style","fill:none;stroke:"+t+";stroke-width:3;stroke-linecap:round;stroke-dasharray:"+n+";stroke-dashoffset:"+e+";filter:drop-shadow(0 0 6px "+(t==="#F5A623"?"rgba(245,166,35,0.5)":"rgba(0,230,118,0.4)")+");")}var ee='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',ne='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',pt='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',oe='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',re='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',ie='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',ae='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',se="https://vinteo.xyz";function At(t){if(!t)return"";let e=document.createElement("div");return e.textContent=t,e.innerHTML}function le(t,e){let n=t&&t.token,r=se,i=document.getElementById("vinteo-dot");i&&(n?(i.style.setProperty("background","#00E676","important"),i.style.setProperty("box-shadow","0 0 8px rgba(0,230,118,0.5)","important")):(i.style.setProperty("background","#FF4D4D","important"),i.style.setProperty("box-shadow","0 0 6px rgba(255,77,77,0.4)","important")),i.style.setProperty("animation","vinteo-pulse 2s ease-in-out infinite","important"));let o="";o+='<div class="vw-popup">',o+='<div class="vw-header">',o+='<div class="vw-header-top">',o+='<div class="vw-logo"><span class="vw-logo-text">Vinteo</span><span class="vw-logo-dot"></span></div>';let a=typeof chrome<"u"&&chrome.runtime&&chrome.runtime.getManifest?chrome.runtime.getManifest().version:"2.0";if(o+='<span class="vw-version">v'+a+"</span>",o+="</div>",n){var s=(t.tier||"free").toLowerCase(),l=s==="premium"?" vw-tier-premium":s==="pro"?" vw-tier-pro":"";o+='<div class="vw-user-row'+l+'">',o+='<div class="vw-user-info">',o+='<span class="vw-user-name">'+At(t.displayName||t.username||"")+"</span>",o+='<span class="vw-user-plan">'+At(t.planName||"Free")+"</span>",o+="</div>",o+="</div>"}o+="</div>",n&&t.isPremium?(o+='<div class="vw-card vw-card-sync">',o+='<div class="vw-orbit-section">',o+='<div class="vw-orbit-ring">',o+='<svg viewBox="0 0 120 120" style="width:90px!important;height:90px!important;transform:rotate(-90deg)!important;">',o+='<circle cx="60" cy="60" r="52" style="fill:none!important;stroke:rgba(255,255,255,0.04)!important;stroke-width:3!important;" />',o+='<circle cx="60" cy="60" r="52" id="vinteo-orbit-progress" style="fill:none;stroke:#00E676;stroke-width:3;stroke-linecap:round;stroke-dasharray:326.7;stroke-dashoffset:326.7;filter:drop-shadow(0 0 6px rgba(0,230,118,0.4));" />',o+="</svg>",o+='<div class="vw-orbit-center">',o+='<span class="vw-orbit-count" id="vinteo-sync-count">0</span>',o+='<span class="vw-orbit-label">ventes</span>',o+="</div>",o+="</div>",o+='<div class="vw-orbit-info">',o+='<div class="vw-orbit-timer" id="vinteo-next-sync">--:--</div>',o+='<div class="vw-orbit-sub">prochaine sync</div>',o+='<div class="vw-orbit-last" id="vinteo-last-sync">Jamais sync</div>',o+="</div>",o+="</div>",o+='<button id="vinteo-sync-btn" class="vw-btn vw-btn-sync">',o+='<span class="vw-btn-glow"></span>',o+=ae+' <span id="vinteo-sync-btn-text">Synchroniser</span>',o+="</button>",o+='<div id="vinteo-sync-status" class="vw-sync-status"></div>',o+="</div>",o+='<div class="vw-card vw-card-links">',o+='<div class="vw-card-header"><div class="vw-card-icon vw-ci-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div><span class="vw-label">Acc\xE8s rapide</span></div>',o+='<div class="vw-quick-grid">',o+=X(r+"/dashboard","Dashboard",ne,"green"),o+=X(r+"/dressing","Dressing",ee,"green"),o+=X(r+"/upload","Studio IA",'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',"purple"),o+=X(r+"/purchase","Abonnement",pt,"amber"),o+="</div>",o+="</div>",o+='<div class="vw-footer">',o+='<a href="'+r+'" target="_blank" rel="noopener noreferrer" class="vw-footer-link">vinteo.xyz</a>',o+='<button id="vinteo-logout-btn" class="vw-footer-link vw-footer-danger">D\xE9connexion</button>',o+="</div>"):n?(o+='<div class="vw-card">',o+='<div class="vw-upsell">',o+='<div class="vw-upsell-icon">'+pt+"</div>",o+='<p class="vw-upsell-title">Passez Premium</p>',o+='<p class="vw-upsell-desc">Synchronisation automatique, repost anti-d\xE9tection, statistiques avanc\xE9es et plus.</p>',o+='<a href="'+r+'/purchase" target="_blank" rel="noopener noreferrer" class="vw-btn vw-btn-upsell">'+pt+" D\xE9couvrir les plans</a>",o+="</div>",o+="</div>",o+='<div class="vw-footer">',o+='<a href="'+r+'" target="_blank" rel="noopener noreferrer" class="vw-footer-link">vinteo.xyz</a>',o+='<button id="vinteo-logout-btn-free" class="vw-footer-link vw-footer-danger">D\xE9connexion</button>',o+="</div>"):(o+='<div class="vw-card">',o+='<div class="vw-login-state">',o+='<div class="vw-login-icon">'+re+"</div>",o+='<p class="vw-login-title">Connectez-vous</p>',o+='<p class="vw-login-desc">Connectez-vous via Discord pour acc\xE9der \xE0 Vinteo</p>',o+='<a id="vinteo-login-link" href="'+r+'/login" target="_blank" rel="noopener noreferrer" class="vw-btn vw-btn-login">'+ie+" Se connecter</a>",o+="</div>",o+="</div>"),o+="</div>",e.textContent="",e.insertAdjacentHTML("beforeend",o)}function X(t,e,n,r){return'<a href="'+t+'" target="_blank" rel="noopener noreferrer" class="vw-qlink vw-qlink-'+r+'"><div class="vw-qlink-icon">'+n+'</div><span class="vw-qlink-label">'+e+'</span><span class="vw-qlink-arrow">'+oe+"</span></a>"}var b=null,E=null,H=null,_=null,N=null,W=0,T=null;function pe(){if(!(b&&document.body.contains(b))){if(b=document.createElement("div"),b.id="vinteo-sync-toast",b.setAttribute("style",["position:fixed!important","top:16px!important","right:16px!important","left:auto!important","bottom:auto!important","z-index:2147483647!important","background:#14141C!important","border:1px solid rgba(255,255,255,0.08)!important","border-radius:12px!important","box-shadow:0 8px 32px rgba(0,0,0,0.4)!important","padding:14px 18px!important","display:none","align-items:center!important","gap:10px!important","min-width:260px!important","max-width:380px!important","font-family:'DM Sans',sans-serif!important","font-size:13px!important","font-weight:500!important","color:#EEEEF5!important","transition:opacity 0.3s ease,transform 0.3s ease!important","opacity:0!important","transform:translateY(-8px)!important"].join(";")),H=document.createElement("div"),H.setAttribute("style",["width:16px!important","height:16px!important","border:2px solid rgba(255,255,255,0.1)!important","border-top-color:#00E676!important","border-radius:50%!important","animation:vinteo-toast-spin 0.8s linear infinite!important","flex-shrink:0!important"].join(";")),_=document.createElement("div"),_.setAttribute("style",["width:18px!important","height:18px!important","flex-shrink:0!important","display:none"].join(";")),E=document.createElement("span"),E.setAttribute("style",["flex:1!important","line-height:1.4!important"].join(";")),b.appendChild(H),b.appendChild(_),b.appendChild(E),!document.getElementById("vinteo-toast-spin-style")){let t=document.createElement("style");t.id="vinteo-toast-spin-style",t.textContent=["@keyframes vinteo-toast-spin { to { transform: rotate(360deg); } }","@keyframes vinteo-check-draw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }","@keyframes vinteo-check-circle { from { stroke-dashoffset: 56; opacity: 0; } 30% { opacity: 1; } to { stroke-dashoffset: 0; opacity: 1; } }","@keyframes vinteo-cross-draw { from { stroke-dashoffset: 12; } to { stroke-dashoffset: 0; } }"].join(" "),document.head.appendChild(t)}document.body.appendChild(b)}}function ce(t,e){if(!b||!E)return;let n=t;if(n<=W)return;let r=W,i=performance.now(),o=200;function a(s){let l=s-i,m=Math.min(l/o,1),d=1-Math.pow(1-m,3),c=Math.round(r+(n-r)*d);W=c,E.textContent=c+" / "+e+" vente"+(c!==1?"s":"")+" synchronis\xE9e"+(c!==1?"s":"")+"\u2026",m<1?T=requestAnimationFrame(a):W=n}T&&cancelAnimationFrame(T),T=requestAnimationFrame(a)}function de(t){!b||!E||(T&&(cancelAnimationFrame(T),T=null),H.style.setProperty("display","none","important"),_.style.setProperty("display","flex","important"),_.textContent="",_.insertAdjacentHTML("beforeend",ue("#00E676")),t===0?(E.textContent="D\xE9j\xE0 \xE0 jour",E.style.setProperty("color","#00E676","important"),setTimeout(()=>St(3e5),3e3)):(E.textContent=t+" vente"+(t!==1?"s":"")+" synchronis\xE9e"+(t!==1?"s":"")+" !",E.style.setProperty("color","#00E676","important"),setTimeout(()=>St(3e5),4e3)))}function me(t){!b||!E||(T&&(cancelAnimationFrame(T),T=null),H.style.setProperty("display","none","important"),_.style.setProperty("display","flex","important"),_.textContent="",_.insertAdjacentHTML("beforeend",ve("#FF4D4D")),E.textContent=t||"Erreur de synchronisation",E.style.setProperty("color","#FF4D4D","important"),Mt(5e3))}function ue(t){return'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" stroke="'+t+'" stroke-width="1.5" fill="none" stroke-dasharray="56" stroke-dashoffset="56" style="animation:vinteo-check-circle 0.5s ease forwards"/><path d="M5.5 9.5L7.8 11.8L12.5 6.5" stroke="'+t+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="24" stroke-dashoffset="24" style="animation:vinteo-check-draw 0.3s ease 0.35s forwards"/></svg>'}function ve(t){return'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" stroke="'+t+'" stroke-width="1.5" fill="none" stroke-dasharray="56" stroke-dashoffset="56" style="animation:vinteo-check-circle 0.5s ease forwards"/><path d="M6.5 6.5L11.5 11.5" stroke="'+t+'" stroke-width="1.8" stroke-linecap="round" fill="none" stroke-dasharray="12" stroke-dashoffset="12" style="animation:vinteo-cross-draw 0.25s ease 0.35s forwards"/><path d="M11.5 6.5L6.5 11.5" stroke="'+t+'" stroke-width="1.8" stroke-linecap="round" fill="none" stroke-dasharray="12" stroke-dashoffset="12" style="animation:vinteo-cross-draw 0.25s ease 0.45s forwards"/></svg>'}var q=null,ct=null;function je(t){ct=t}function St(t){pe(),N&&(clearTimeout(N),N=null),q&&(clearInterval(q),q=null),H.style.setProperty("display","none","important"),_.style.setProperty("display","flex","important"),_.textContent="",_.insertAdjacentHTML("beforeend",fe("#7A7A8C"));let e=Date.now()+t;function n(){let r=Math.max(0,Math.ceil((e-Date.now())/1e3)),i=Math.floor(r/60),o=r%60,a=i>0?i+":"+(o<10?"0":"")+o:o+"s";E.textContent="Prochaine sync dans "+a,E.style.setProperty("color","#7A7A8C","important"),r<=0&&(q&&(clearInterval(q),q=null),ct?ct():Mt(500))}n(),q=setInterval(n,1e3),b.style.setProperty("display","flex","important"),requestAnimationFrame(()=>{b.style.setProperty("opacity","1","important"),b.style.setProperty("transform","translateY(0)","important")})}function fe(t){return'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7.5" stroke="'+t+'" stroke-width="1.5" fill="none"/><path d="M9 5V9.5L12 11" stroke="'+t+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'}function Mt(t){N&&clearTimeout(N),N=setTimeout(()=>{b&&(b.style.setProperty("opacity","0","important"),b.style.setProperty("transform","translateY(-8px)","important"),setTimeout(()=>{b&&b.style.setProperty("display","none","important")},300))},t)}function ge(t){!chrome.runtime||!chrome.runtime.onMessage||!chrome.runtime.onMessage.addListener||chrome.runtime.onMessage.addListener((e,n,r)=>{if(e.action==="vintedApiProxy"){let i=e.url;i.indexOf("http")!==0&&(i=window.location.origin+i);let o={method:e.method||"GET",credentials:"include",headers:{Accept:"application/json"}};return e.body&&(o.headers["Content-Type"]="application/json",o.body=JSON.stringify(e.body)),fetch(i,o).then(a=>{if(!a.ok){r({success:!1,error:"HTTP "+a.status});return}return a.json().then(s=>{r({success:!0,status:a.status,data:s})})}).catch(a=>{r({success:!1,error:a.message})}),!0}e.action!=="session_updated"&&(e.action,e.action==="dm_campaign_complete"&&t("Campagne termin\xE9e : "+e.sent+" messages envoy\xE9s","success",6e3),e.action==="sync_progress"&&ce(e.current,e.total),e.action==="sync_complete"&&de(e.count),e.action==="sync_error"&&me(e.error))})}var y=null,G=null,J=!1,K=null,Q=null;function he(t){var e=Date.now()-new Date(t).getTime(),n=Math.floor(e/1e3);if(n<60)return"il y a "+n+"s";var r=Math.floor(n/60);if(r<60)return"il y a "+r+" min";var i=Math.floor(r/60);return"il y a "+i+"h"}function Z(){D({action:"getPopupData"},function(t){if(!(chrome.runtime&&chrome.runtime.lastError||!t)){var e=t.syncState||{},n=document.getElementById("vinteo-last-sync"),r=document.getElementById("vinteo-next-sync"),i=document.getElementById("vinteo-sync-count");n&&e.lastSync&&(n.textContent=he(e.lastSync)),i&&(i.textContent=String(e.totalCount||0));var o=document.getElementById("vinteo-orbit-progress"),a=2*Math.PI*52;if(e.lastSync&&r&&!e.isSyncing&&!J){let m=function(){var d=Date.now()-s,c=l-d,v=Math.min(1,d/l);if(o){var p=a*(1-v);F("#F5A623",p,a)}if(c<=0)y&&(clearInterval(y),y=null),o&&F("#00E676",0,a),r.textContent="0:00";else{var w=Math.floor(c/6e4),u=Math.floor(c%6e4/1e3);r.textContent=w+":"+String(u).padStart(2,"0")}};y&&clearInterval(y);var s=new Date(e.lastSync).getTime(),l=3e5;m(),y=setInterval(m,1e3)}}})}function Pt(t){if(t){y&&clearInterval(y);var e=Date.now(),n=function(){var r=3e5-(Date.now()-e),i=document.getElementById("vinteo-orbit-progress"),o=2*Math.PI*52,a=Math.min(1,(Date.now()-e)/3e5);if(i&&F("#F5A623",o*(1-a),o),r<=0){y&&(clearInterval(y),y=null),t.textContent="0:00",i&&F("#00E676",0,o);return}var s=Math.floor(r/6e4),l=Math.floor(r%6e4/1e3);t.textContent=s+":"+String(l).padStart(2,"0")};n(),y=setInterval(n,1e3)}}function we(t){Z();let e=document.getElementById("vinteo-logout-btn");e&&e.addEventListener("click",()=>_t(t));let n=document.getElementById("vinteo-logout-btn-free");n&&n.addEventListener("click",()=>_t(t));var r=document.getElementById("vinteo-sync-btn"),i=document.getElementById("vinteo-sync-btn-text"),o=document.getElementById("vinteo-sync-count"),a=document.querySelector("#vinteo-panel .vw-orbit-label"),s=document.getElementById("vinteo-next-sync"),l=document.querySelector("#vinteo-panel .vw-orbit-sub"),m=document.getElementById("vinteo-orbit-progress"),d=2*Math.PI*52;K&&window.removeEventListener("vinteo_sync_progress",K),Q&&window.removeEventListener("vinteo_sync_complete",Q),K=function(c){var v=c.detail;if(!(!v||!o)){J=!0,y&&(clearInterval(y),y=null);var p=(v.current||0)/(v.total||1);o.textContent=String(v.current),a&&(a.textContent="en cours"),s&&(s.textContent=Math.round(p*100)+"%",s.style.setProperty("color","#F5A623","important")),l&&(l.textContent=v.title?v.title.substring(0,25):"synchronisation"),m&&requestAnimationFrame(function(){F("#F5A623",d*(1-p),d)})}},Q=function(c){var v=c.detail||{};J=!1,o&&(o.textContent=String(v.count||0)),a&&(a.textContent="ventes"),s&&(s.textContent="5:00",s.style.setProperty("color","#00E676","important")),l&&(l.textContent="il y a quelques secondes"),m&&F("#00E676",d,d),r&&(r.disabled=!1,r.classList.remove("syncing")),i&&(i.textContent="Synchroniser"),Z(),Pt(s)},window.addEventListener("vinteo_sync_progress",K),window.addEventListener("vinteo_sync_complete",Q),chrome.runtime&&chrome.runtime.onMessage&&(G&&chrome.runtime.onMessage.removeListener(G),G=function(c){if(c.action==="sync_progress"&&o){J=!0,y&&(clearInterval(y),y=null);var v=c.current||0,p=c.total||1,w=v/p;if(o.textContent=String(v),a&&(a.textContent="en cours"),s&&(s.textContent=Math.round(w*100)+"%",s.style.setProperty("color","#F5A623","important")),l&&(l.textContent=c.title?c.title.substring(0,25):"synchronisation"),m){var u=d*(1-w);requestAnimationFrame(function(){F("#F5A623",u,d)})}}c.action==="sync_complete"&&o&&(J=!1,o.textContent=String(c.count||0),a&&(a.textContent="ventes"),s&&(s.textContent="5:00",s.style.setProperty("color","#00E676","important")),l&&(l.textContent="il y a quelques secondes"),m&&F("#00E676",d,d),r&&(r.disabled=!1,r.classList.remove("syncing")),i&&(i.textContent="Synchroniser"),Z(),Pt(s)),c.action==="sync_error"&&(r&&(r.disabled=!1,r.classList.remove("syncing")),i&&(i.textContent="Synchroniser"),J=!1,Z())},chrome.runtime.onMessage.addListener(G)),r&&r.addEventListener("click",function(){r.disabled=!0,r.classList.add("syncing"),i&&(i.textContent="Synchronisation\u2026"),y&&(clearInterval(y),y=null),o&&(o.textContent="0"),a&&(a.textContent="en cours"),s&&(s.textContent="0%",s.style.setProperty("color","#F5A623","important")),l&&(l.textContent="d\xE9marrage..."),m&&requestAnimationFrame(function(){F("#F5A623",d,d)}),D({action:"triggerSync"},function(c){if(chrome.runtime&&chrome.runtime.lastError||!c||!c.success){r.disabled=!1,r.classList.remove("syncing"),i&&(i.textContent="Erreur \u2014 r\xE9essayer"),setTimeout(function(){i&&(i.textContent="Synchroniser"),Z()},3e3);return}})})}var $=null,dt=new Set,jt="";function ye(){if(!document.getElementById("vinteo-label-styles")){var t=document.createElement("style");t.id="vinteo-label-styles",t.textContent=`
    .vteo-label-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 9px;
      background: #0F0F16; border: 1.5px solid rgba(0,230,118,0.35);
      border: none; cursor: pointer; position: relative;
      margin-left: 8px; vertical-align: middle;
      transition: all .2s cubic-bezier(.16,1,.3,1);
      box-shadow: 0 1px 6px rgba(0,230,118,0.25);
      flex-shrink: 0;
    }
    .vteo-label-btn:hover {
      transform: none;
      box-shadow: 0 3px 14px rgba(0,230,118,0.4);
      background: #14141C; border-color: rgba(0,230,118,0.5);
    }
    .vteo-label-btn:active { transform: scale(0.95); }
    .vteo-label-btn svg { color: #00E676; }
    .vteo-label-btn.disabled {
      background: linear-gradient(135deg, #666, #555);
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      cursor: default; opacity: 0.45;
    }
    .vteo-label-btn.disabled:hover {
      transform: scale(1);
      box-shadow: 0 1px 4px rgba(0,0,0,0.15);
      background: linear-gradient(135deg, #666, #555);
    }
    .vteo-label-btn.loading {
      pointer-events: none;
      background: linear-gradient(135deg, #F5A623, #E09900);
      box-shadow: 0 2px 8px rgba(245,166,35,0.3);
    }
    .vteo-label-btn.loading svg { animation: vteo-spin .8s linear infinite; }
    .vteo-label-btn.error {
      background: linear-gradient(135deg, #FF5252, #D32F2F);
      box-shadow: 0 2px 8px rgba(255,82,82,0.3);
    }
    @keyframes vteo-spin { to { transform: rotate(360deg); } }

    .vteo-label-tip {
      position: fixed;
      pointer-events: none;
      background: #111827; color: #fff;
      font-size: 11.5px; font-weight: 500; line-height: 1.4;
      padding: 8px 12px; border-radius: 8px;
      white-space: nowrap;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.08);
      opacity: 0; transition: opacity .15s;
      z-index: 2147483646;
    }
    .vteo-label-tip.show { opacity: 1; }
    .vteo-label-btn { order: 99; }
    .vteo-tip-title {
      color: #00E676; font-weight: 600; display: block; margin-bottom: 1px; font-size: 11.5px;
    }
    .vteo-tip-desc {
      color: rgba(255,255,255,0.5); font-weight: 400; font-size: 11px;
    }
    .vteo-label-btn.disabled .vteo-tip-title { color: rgba(255,255,255,0.4); }
  `,document.head.appendChild(t)}}var It='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',be='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',xe='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',ke='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';function Ee(){for(var t=(document.body.innerText||"").toLowerCase(),e=["bordereau d'envoi","article \xE0 emballer","envoyer le colis","t\xE9l\xE9charger le bordereau","shipping label","pack and ship","ship the parcel","download the label","paket versenden","versandlabel herunterladen","artikel verpacken","prepara il pacco","istruzioni di spedizione","scarica l'etichetta","prepara il pacco e invialo","enviar el paquete","instrucciones de env\xEDo","descargar la etiqueta","enviar a encomenda","instru\xE7\xF5es de envio","pakket verzenden","verzendlabel downloaden","wy\u015Blij paczk\u0119","etykiet\u0119 wysy\u0142kow\u0105"],n=0;n<e.length;n++)if(t.indexOf(e[n])>-1)return!0;return!!Tt()}function Tt(){for(var t=document.querySelectorAll("a[href]"),e=0;e<t.length;e++){var n=t[e].href||"",r=(t[e].textContent||"").toLowerCase().trim();if((r==="t\xE9l\xE9charger"||r==="download"||r==="herunterladen"||r==="scarica"||r==="descargar")&&n||n.indexOf("pdf_label")>-1||n.indexOf("label_url")>-1||n.indexOf(".pdf")>-1&&n.indexOf("shipment")>-1)return n}return null}async function Ce(){var t=window.location.href.match(/inbox\/(\d+)/);if(!t)return null;for(var e=t[1],n=null,r=document.querySelectorAll("script"),i=/"CSRF_TOKEN\\?":\\?"([^"\\]+)\\?"/,o=0;o<r.length;o++){var a=(r[o].textContent||"").match(i);if(a&&a[1]){n=a[1];break}}if(!n){var s=document.querySelector('meta[name="csrf-token"]');s&&(n=s.getAttribute("content"))}var l={Accept:"application/json"};n&&(l["X-CSRF-Token"]=n);var m=window.location.origin;try{var d=await fetch(m+"/api/v2/conversations/"+e,{credentials:"include",headers:l});if(!d.ok)return null;var c=await d.json(),v=c.conversation||c,p=v.transaction;if(!p||!p.id)return null;var w=p.id,u=p.shipment_id||null;if(u)try{var C=await fetch(m+"/api/v2/shipments/"+u+"/label_url",{credentials:"include",headers:l});if(C.ok){var x=await C.json();if(x.label_url)return x.label_url;if(x.url)return x.url}}catch{}if(!u)try{var f=await fetch(m+"/api/v2/transactions/"+w,{credentials:"include",headers:l});if(f.ok){var k=await f.json(),j=k.transaction||k;if(u=j.shipment?j.shipment.id:null,u){var A=await fetch(m+"/api/v2/shipments/"+u+"/label_url",{credentials:"include",headers:l});if(A.ok){var I=await A.json();if(I.label_url||I.url)return I.label_url||I.url}}}}catch{}try{var g=await fetch(m+"/api/v2/transactions/"+w+"/shipment/pdf_label",{credentials:"include",headers:l});if(g.ok){var S=await g.json();if(S.url)return S.url}}catch{}}catch{}return null}function _e(){for(var t=document.querySelectorAll("h2 a[href*='/member/']"),e=0;e<t.length;e++){var n=t[e],r=(n.textContent||"").trim();if(r.length>0&&r.length<40){var i=n.parentElement;if(i&&i.tagName==="H2")return i}}return null}function Ae(t,e){ye();var n=document.createElement("button");n.className="vteo-label-btn"+(e?"":" disabled"),n.setAttribute("data-vinteo-label","1"),n.innerHTML=It;var r=e?"Vinteo \u2014 \xC9tiquette d\xE9coup\xE9e":"Aucune \xE9tiquette",i=e?"T\xE9l\xE9charge l'\xE9tiquette d\xE9coup\xE9e pr\xEAte \xE0 imprimer":"Pas de bordereau disponible pour cette conversation",o=document.createElement("div");o.className="vteo-label-tip",o.innerHTML='<span class="vteo-tip-title">'+r+'</span><span class="vteo-tip-desc">'+i+"</span>",document.body.appendChild(o),n.addEventListener("mouseenter",function(){var a=n.getBoundingClientRect();o.style.left=a.left+a.width/2-o.offsetWidth/2+"px",o.style.top=a.top-o.offsetHeight-8+"px",o.classList.add("show")}),n.addEventListener("mouseleave",function(){o.classList.remove("show")}),e&&n.addEventListener("click",function(a){a.preventDefault(),a.stopPropagation(),Se(n)}),t.style.display="inline-flex",t.style.alignItems="center",t.style.gap="6px",t.appendChild(n)}async function Se(t){if(!t.classList.contains("loading")){t.className="vteo-label-btn loading",t.innerHTML=be;try{var e=Tt();if(e||(e=await Ce()),!e)throw new Error("\xC9tiquette introuvable");for(var n=await new Promise(function(m,d){try{chrome.runtime.sendMessage({action:"cropLabel",labelUrl:e},function(c){if(chrome.runtime.lastError){d(new Error(chrome.runtime.lastError.message));return}if(!c||!c.success){d(new Error(c?c.error:"Pas de r\xE9ponse"));return}m(c)})}catch(c){d(c)}}),r=atob(n.pdfBase64),i=new Uint8Array(r.length),o=0;o<r.length;o++)i[o]=r.charCodeAt(o);var a=new Blob([i],{type:"application/pdf"}),s=URL.createObjectURL(a),l=document.createElement("a");l.href=s,l.download="etiquette-decoupee.pdf",l.style.display="none",document.body.appendChild(l),l.click(),setTimeout(function(){document.body.removeChild(l),URL.revokeObjectURL(s)},1e3),t.className="vteo-label-btn",t.innerHTML=xe,setTimeout(function(){Ft(t)},2500)}catch{t.className="vteo-label-btn error",t.innerHTML=ke,setTimeout(function(){Ft(t)},3e3)}}}function Ft(t){t.className="vteo-label-btn",t.innerHTML=It+`<span class="vteo-label-tip"><span class="vteo-tip-title">Vinteo \u2014 \xC9tiquette d\xE9coup\xE9e</span><span class="vteo-tip-desc">T\xE9l\xE9charge l'\xE9tiquette d\xE9coup\xE9e pr\xEAte \xE0 imprimer</span></span>`}function zt(){if(window.location.href.indexOf("/inbox/")!==-1){var t=window.location.href;if(t!==jt){jt=t,dt.clear();for(var e=document.querySelectorAll("[data-vinteo-label]"),n=0;n<e.length;n++)e[n].remove();for(var r=document.querySelectorAll(".vteo-label-tip"),i=0;i<r.length;i++)r[i].remove()}var o=t.match(/inbox\/(\d+)/);if(o){var a=o[1];if(!dt.has(a)){var s=_e();if(s){dt.add(a);var l=Ee();Ae(s,l)}}}}}function Me(){zt(),$&&$.disconnect(),$=new MutationObserver(function(){zt()}),$.observe(document.body,{childList:!0,subtree:!0})}window.__vinteoSendMessage=D;let mt=!1;async function ut(){if(mt)return!1;if(document.getElementById("vinteo-widget"))return!0;if(!chrome.runtime||!chrome.runtime.id)return!1;mt=!0;try{return document.getElementById("vinteo-widget")||Dt(),!0}catch(t){const e=t&&t.message||String(t);return e.indexOf("Extension context invalidated")<0&&console.warn("[Vinteo widget] session check failed:",e),!1}finally{mt=!1}}ut();try{chrome.storage.onChanged.addListener((t,e)=>{e!=="local"||!("vinteo_session"in t)||(ut())})}catch(t){console.warn("[Vinteo widget] storage listener failed:",t&&t.message)}var Pe=new MutationObserver(()=>{!document.getElementById("vinteo-widget")&&document.body&&ut()});document.body&&Pe.observe(document.body,{childList:!0});function Dt(){if(!document.body){document.addEventListener("DOMContentLoaded",Dt);return}if(!document.getElementById("vinteo-fonts-preconnect")){let a=document.createElement("link");a.id="vinteo-fonts-preconnect",a.rel="preconnect",a.href="https://fonts.googleapis.com",document.head.appendChild(a);let s=document.createElement("link");s.rel="preconnect",s.href="https://fonts.gstatic.com",s.crossOrigin="anonymous",document.head.appendChild(s);let l=document.createElement("link");l.rel="stylesheet",l.href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap",document.head.appendChild(l)}if(!document.getElementById("vinteo-widget-style")){let a=document.createElement("style");a.id="vinteo-widget-style",a.textContent=Lt,document.head.appendChild(a)}let t=document.createElement("div");t.id="vinteo-widget",t.setAttribute("style",["position:fixed!important","bottom:20px!important","left:20px!important","right:auto!important","top:auto!important","z-index:2147483647!important","width:44px!important","height:44px!important","background:#08080D!important","border:1px solid rgba(255,255,255,0.08)!important","border-radius:12px!important","cursor:pointer!important","box-shadow:0 4px 16px rgba(0,0,0,0.4)!important","display:flex!important","align-items:center!important","justify-content:center!important","margin:0!important","padding:0!important","transform:none!important","transition:all 0.2s ease!important","touch-action:none!important","-webkit-tap-highlight-color:transparent!important","-webkit-user-select:none!important","user-select:none!important"].join(";"));let e=document.createElement("span");e.setAttribute("style","color:#EEEEF5!important;font-weight:800!important;font-size:18px!important;line-height:1!important;-webkit-user-select:none!important;user-select:none!important;font-family:'Syne',sans-serif!important;letter-spacing:-0.03em!important;pointer-events:none!important;"),e.textContent="V",t.textContent="",t.appendChild(e);let n=document.createElement("div");n.id="vinteo-dot",n.setAttribute("style",["position:absolute!important","top:3px!important","right:3px!important","width:7px!important","height:7px!important","border-radius:50%!important","background:#FF4D4D!important","border:1.5px solid #08080D!important","box-shadow:0 0 6px rgba(255,77,77,0.4)!important","animation:vinteo-pulse 2s ease-in-out infinite!important","transition:background 0.3s!important"].join(";")),t.appendChild(n);let r=document.createElement("div");r.id="vinteo-panel",r.setAttribute("style",["position:fixed!important","bottom:72px!important","left:20px!important","right:auto!important","top:auto!important","z-index:2147483647!important","background:#08080D!important","border:1px solid rgba(0,230,118,0.08)!important","border-radius:16px!important","box-shadow:0 0 40px rgba(0,230,118,0.04),0 8px 40px rgba(0,0,0,0.6)!important","display:none","width:min(400px, calc(100vw - 24px))!important","max-height:min(600px, calc(100vh - 100px))!important","overflow-y:auto!important","margin:0!important","padding:0!important","transform:none!important"].join(";"));let i=document.createElement("div");i.id="vinteo-banner",i.setAttribute("style",["position:fixed!important","top:20px!important","left:50%!important","right:auto!important","transform:translateX(-50%)!important","z-index:2147483647!important","padding:14px 20px!important","border-radius:10px!important","font-family:'DM Sans',sans-serif!important","font-size:13px!important","font-weight:500!important","display:none","margin:0!important","background:#14141C!important","border:1px solid rgba(255,255,255,0.08)!important","box-shadow:0 8px 32px rgba(0,0,0,0.4)!important","transition:opacity 0.3s ease,transform 0.3s ease!important"].join(";")),document.body.appendChild(t),document.body.appendChild(r),document.body.appendChild(i),Bt(i),window.vinteoBanner=vt;let o=a=>{le(a,r),we(o)};Ht(t,r,()=>{r.style.display!=="none"&&r.style.display!==""?r.style.setProperty("display","none","important"):(yt(),r.style.setProperty("display","block","important"),lt(o))}),ge(vt),Me(),te(o),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&lt(o)}),lt(o)}})();
