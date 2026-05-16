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
`,_=null,ot=null;function Bt(t){_=t}function xt(t,n,i){if(!_)return;ot&&clearTimeout(ot);let o={success:{color:"#00E676",border:"#00E676"},error:{color:"#FF4D4D",border:"#FF4D4D"},info:{color:"#4D9FFF",border:"#4D9FFF"}},r=o[n]||o.info;_.style.setProperty("color",r.color,"important"),_.style.setProperty("border-left","3px solid "+r.border,"important"),_.textContent=t,_.style.setProperty("display","flex","important"),_.style.setProperty("opacity","1","important"),_.style.setProperty("transform","translateX(-50%)","important"),i&&i>0&&(ot=setTimeout(()=>{_.style.setProperty("opacity","0","important"),_.style.setProperty("transform","translateX(-50%) translateY(-10px)","important"),setTimeout(()=>{_.style.setProperty("display","none","important")},300)},i))}var L=!1,ut=0,vt=0,ft=0,gt=0,N=!1,C=null,it=null;function ht(){let t=C.getBoundingClientRect(),n=t.left,i=window.innerHeight-t.top+8,o=Math.min(360,window.innerWidth-24);n+o>window.innerWidth-10&&(n=window.innerWidth-o-10),n<10&&(n=10),i>window.innerHeight-60&&(i=window.innerHeight-60),it.style.setProperty("left",n+"px","important"),it.style.setProperty("bottom",i+"px","important")}function Dt(){let t=C.getBoundingClientRect();chrome.storage.local.set({vinteo_widget_pos:{left:t.left,bottom:window.innerHeight-t.bottom}})}function qt(){chrome.storage.local.get("vinteo_widget_pos",t=>{if(t.vinteo_widget_pos){let n=t.vinteo_widget_pos;C.style.setProperty("left",Math.max(0,Math.min(window.innerWidth-44,n.left))+"px","important"),C.style.setProperty("bottom",Math.max(0,Math.min(window.innerHeight-44,n.bottom))+"px","important")}})}function wt(t,n){L=!0,N=!1,ut=t,vt=n,ft=C.getBoundingClientRect().left,gt=window.innerHeight-C.getBoundingClientRect().bottom,C.style.setProperty("transition","none","important")}function yt(t,n){if(!L)return;let i=t-ut,o=n-vt;if((Math.abs(i)>3||Math.abs(o)>3)&&(N=!0),!N)return;let r=Math.max(0,Math.min(window.innerWidth-44,ft+i)),e=Math.max(0,Math.min(window.innerHeight-44,gt-o));C.style.setProperty("left",r+"px","important"),C.style.setProperty("bottom",e+"px","important")}function bt(t){L&&(L=!1,C.style.setProperty("transition","all 0.2s ease","important"),N?(Dt(),ht()):t())}function It(t,n,i){C=t,it=n,qt(),t.addEventListener("mousedown",o=>{o.button===0&&(wt(o.clientX,o.clientY),o.preventDefault())}),t.addEventListener("touchstart",o=>{let r=o.touches[0];wt(r.clientX,r.clientY)},{passive:!0}),document.addEventListener("mousemove",o=>{yt(o.clientX,o.clientY)}),document.addEventListener("touchmove",o=>{if(L){let r=o.touches[0];yt(r.clientX,r.clientY)}},{passive:!0}),document.addEventListener("mouseup",o=>{if(L){var r=N;bt(()=>{r||i()})}}),document.addEventListener("touchend",()=>{if(L){var o=N;bt(()=>{o||i()})}}),document.addEventListener("click",o=>{t.contains(o.target)||n.contains(o.target)||n.style.setProperty("display","none","important")}),t.addEventListener("mouseenter",()=>{t.style.setProperty("border-color","rgba(255,255,255,0.14)","important"),t.style.setProperty("transform","scale(1.08)","important")}),t.addEventListener("mouseleave",()=>{t.style.setProperty("border-color","rgba(255,255,255,0.08)","important"),t.style.setProperty("transform","scale(1)","important")})}var Nt="https://vinteo.xyz";function rt(){if(window._vinteoCSRF)return window._vinteoCSRF;for(var t=document.querySelectorAll("script"),n=/"CSRF_TOKEN\\?":\\?"([^"\\]+)\\?"/,i=0;i<t.length;i++){var o=(t[i].textContent||"").match(n);if(o&&o[1])return window._vinteoCSRF=o[1],o[1]}var r=document.querySelector('meta[name="csrf-token"]');if(r){var e=r.getAttribute("content");if(e)return window._vinteoCSRF=e,e}return null}async function Ht(){var t=rt();if(t)return t;try{await fetch(window.location.origin+"/api/v2/users/current",{credentials:"include",headers:{Accept:"application/json"}})}catch{}return t=rt(),t||new Promise(function(n){var i=!1;function o(a){i||(i=!0,clearInterval(r),clearTimeout(e),n(a))}var r=setInterval(function(){var a=rt();a&&o(a)},200),e=setTimeout(function(){o(null)},4e3)})}function Vt(){for(var t=document.cookie.split(";"),n=0;n<t.length;n++){var i=t[n].trim();if(i.startsWith("anon_id="))return i.substring(8)}return null}function Ot(t,n){var i={"Content-Type":"application/json",Accept:"application/json","X-Money-Object":"true"};return t&&(i["X-CSRF-Token"]=t),n&&(i["X-Anon-Id"]=n),i}function f(t,n,i){i=i||3e4;var o=new AbortController,r=setTimeout(function(){o.abort()},i);return n=Object.assign({},n,{signal:o.signal}),fetch(t,n).finally(function(){clearTimeout(r)})}async function W(t,n,i){i=i||2;for(var o,r=0;r<=i;r++){try{var e=await f(t,n,3e4);if(e.ok||e.status<500)return e;o=new Error("HTTP "+e.status)}catch(a){o=a}r<i&&await B(Math.pow(2,r+1)*1e3)}throw o}function B(t){return new Promise(function(n){setTimeout(n,t)})}var O=null;async function D(){if(O&&O.csrfToken)return O;var t=await Ht(),n=Vt();return O={csrfToken:t,anonId:n,headers:Ot(t,n),origin:window.location.origin},O}async function Gt(){return new Promise(function(t){try{if(!chrome||!chrome.storage||!chrome.storage.local){t(null);return}chrome.storage.local.get(["vinteo_session"],function(n){if(!n||!n.vinteo_session){t(null);return}try{var i=typeof n.vinteo_session=="string"?JSON.parse(n.vinteo_session):n.vinteo_session;t(i&&i.token?i.token:null)}catch{t(null)}})}catch{t(null)}})}async function Wt(t,n){var i=await Gt();if(!i)throw new Error("No Vinteo session");return n=n||{},n.headers=Object.assign({"Content-Type":"application/json",Authorization:"Bearer "+i},n.headers||{}),f(Nt+t,n,15e3)}async function Xt(t){for(var n=await D(),i=n.origin,o=n.headers,r=[],e=1,a=100;e<=a;){var s=i+"/api/v2/my_orders?type=sold&status=all&per_page=50&page="+e,l;try{l=await f(s,{credentials:"include",headers:o},15e3)}catch{break}if(!l.ok)if(e===1){if(l=await f(i+"/api/v2/my_orders?type=sold&per_page=50&page=1",{credentials:"include",headers:o},15e3),!l.ok)break}else break;var m=await l.json(),d=m.my_orders||m.orders||[];if(d.length===0||(r=r.concat(d),d.length<50))break;e++,await B(100)}if(r.length===0)return{success:!0,count:0};for(var c=[],u=0;u<r.length;u++){var p=r[u];t&&t({current:u+1,total:r.length,title:p.title||""});var w=p.transaction_id||p.id,x={id:w,title:p.title||"",price:p.price?typeof p.price=="object"?p.price.amount:p.price:0,item_id:p.item_id||p.item&&p.item.id,buyer:p.buyer?p.buyer.login||p.buyer.name:"",buyer_id:p.buyer?p.buyer.id:null,buyer_photo:p.buyer&&p.buyer.photo?p.buyer.photo.url||p.buyer.photo.full_size_url:null,photo:p.photo?typeof p.photo=="string"?p.photo:p.photo.url||p.photo.full_size_url:null,status:p.status||"unknown",created_at:p.created_at||p.date,conversation_id:p.user_msg_thread_id||null};try{var P=await f(i+"/api/v2/transactions/"+w,{credentials:"include",headers:o},1e4);if(P.ok){var E=await P.json(),h=E.transaction||E;x.status=h.status||x.status,x.shipping_status=h.shipping_order?h.shipping_order.status:null,x.tracking_code=h.shipment?h.shipment.tracking_code:null,x.conversation_id=h.user_msg_thread_id||x.conversation_id,h.item&&(x.title=h.item.title||x.title,x.item_id=h.item.id||x.item_id,h.item.photo&&(x.photo=h.item.photo.url||h.item.photo.full_size_url||x.photo))}}catch{}try{var k=await f(i+"/api/v2/transactions/"+w+"/shipment/pdf_label",{credentials:"include",headers:o},8e3);if(k.ok){var I=await k.json();x.label_url=I.url||I.label_url||null}}catch{}try{var T=await f(i+"/api/v2/transactions/"+w+"/shipment/journey_summary",{credentials:"include",headers:o},8e3);if(T.ok){var j=await T.json();x.journey=j}}catch{}c.push(x),u<r.length-1&&await B(50)}try{var F=await f(i+"/api/v2/users/current",{credentials:"include",headers:o},1e4),M="unknown",tt=null;if(F.ok){var nt=await F.json(),et=nt.user||nt;M=et.login||"unknown",tt=et.photo?et.photo.url||et.photo.full_size_url:null}await Wt("/api/sales/process",{method:"POST",body:JSON.stringify({orders:c,origin:i,login:M,photo:tt,source:"ios-widget"})})}catch{}return{success:!0,count:c.length}}async function Yt(){var t=await D(),n=t.origin,i=t.headers,o=await f(n+"/api/v2/users/current",{credentials:"include",headers:i},1e4);if(!o.ok)throw new Error("Cannot fetch user");for(var r=await o.json(),e=r.user||r,a=e.id,s=e.login,l=[],m=1;m<=50;){var d=n+"/api/v2/wardrobe/"+a+"/items?per_page=96&page="+m+"&order=relevance",c=await f(d,{credentials:"include",headers:i},15e3);if(c.status===429&&(await B(3e4+Math.random()*3e4),c=await f(d,{credentials:"include",headers:i},15e3)),!c.ok)break;var u=await c.json(),p=u.items||[];if(p.length===0||(l=l.concat(p),p.length<96))break;m++,await B(800+Math.random()*700)}return{success:!0,items:l,userId:a,login:s,origin:n}}async function Ut(t){var n=await D(),i=await f(n.origin+"/api/v2/item_upload/items/"+t,{credentials:"include",headers:n.headers},1e4);if(i.ok||(i=await f(n.origin+"/api/v2/items/"+t,{credentials:"include",headers:{Accept:"application/json"}},1e4)),!i.ok)throw new Error("HTTP "+i.status);var o=await i.json();return{success:!0,item:o.item||o}}async function Kt(t,n){var i=await D(),o=i.origin,r=i.headers,e=await f(o+"/api/v2/item_upload/items/"+t,{credentials:"include",headers:r},1e4);if(!e.ok)throw new Error("Cannot fetch item");var a=await e.json();a.item&&(a=a.item);var s=parseFloat(a.price_numeric||a.price)||0,l={title:a.title,description:a.description||"",catalog_id:a.catalog_id,brand_id:a.brand_id,size_id:a.size_id,status_id:a.status_id,color_ids:a.color_ids||(a.color1_id?[a.color1_id,a.color2_id].filter(Boolean):[]),package_size_id:a.package_size_id,price:n,photos:(a.photos||[]).map(function(d){return{id:d.id,orientation:d.orientation||0}})},m=await W(o+"/api/v2/item_upload/drafts/"+t,{method:"PUT",credentials:"include",headers:Object.assign({},r,{"Content-Type":"application/json"}),body:JSON.stringify(l)},1);if(!m.ok)throw new Error("Update failed HTTP "+m.status);return{success:!0,oldPrice:s,newPrice:n}}async function kt(t){var n=await D(),i=n.origin,o=Object.assign({},n.headers,{"Content-Type":"application/json"}),r=await Promise.all([f(i+"/api/v2/items/"+t,{method:"DELETE",credentials:"include",headers:o},1e4).then(function(e){return e.ok}).catch(function(){returnfalse}),f(i+"/api/v2/items/"+t+"/delete",{method:"POST",credentials:"include",headers:o,body:"{}"},1e4).then(function(e){return e.ok}).catch(function(){returnfalse}),f(i+"/api/v2/item_upload/drafts/"+t,{method:"DELETE",credentials:"include",headers:o},1e4).then(function(e){return e.ok}).catch(function(){returnfalse})]);return r[0]||r[1]||r[2]?{success:!0}:{success:!1,error:"Suppression \xE9chou\xE9e"}}async function Jt(t,n){var i=await D(),o=i.origin,r=i.headers,e=n||{},a=await f(o+"/api/v2/item_upload/items/"+t,{credentials:"include",headers:r},15e3);if(a.ok||(a=await f(o+"/api/v2/items/"+t,{credentials:"include",headers:{Accept:"application/json"}},15e3)),!a.ok)throw new Error("Cannot fetch item details");var s=await a.json();s.item&&(s=s.item);for(var l=s.photos||[],m=[],d=0;d<l.length;d++){var c=l[d].full_size_url||l[d].url;if(c){try{var u=await fetch(c).then(function(nt){return nt.blob()}),p=new FormData;p.append("photo[file]",u,"photo"+d+".jpg"),p.append("photo[type]","item");var w={};i.csrfToken&&(w["X-CSRF-Token"]=i.csrfToken),i.anonId&&(w["X-Anon-Id"]=i.anonId);var x=await f(o+"/api/v2/photos",{method:"POST",credentials:"include",headers:w,body:p},3e4);if(x.ok){var P=await x.json(),E=P.photo?P.photo.id:P.id;E&&m.push({id:E,orientation:0})}}catch{}await B(1500+Math.random()*1e3)}}if(m.length===0)throw new Error("No photos uploaded");var h=parseFloat(s.price_numeric||s.price)||0,k=h;e.priceReduction&&e.priceReduction>0&&(e.priceReductionMode==="percent"?k=h*(1-e.priceReduction/100):k=h-e.priceReduction,k=Math.max(1,Math.round(k*100)/100));var I={title:s.title,description:s.description||"",catalog_id:s.catalog_id,brand_id:s.brand_id,size_id:s.size_id,status_id:s.status_id,color_ids:s.color_ids||(s.color1_id?[s.color1_id,s.color2_id].filter(Boolean):[]),package_size_id:s.package_size_id,photos:m,price:k,currency:"EUR",shipment_type:s.shipment_type},T=await W(o+"/api/v2/item_upload/drafts",{method:"POST",credentials:"include",headers:Object.assign({},r,{"Content-Type":"application/json"}),body:JSON.stringify(I)},1);if(!T.ok){var j="";try{j=await T.text()}catch{}throw new Error("Draft creation failed: "+j.substring(0,100))}var F=await T.json(),M=F.id||F.item&&F.item.id;if(e.deleteAfter!==!1&&(await kt(t),await B(1e3)),!e.draft){var tt=await W(o+"/api/v2/item_upload/drafts/"+M+"/completion",{method:"POST",credentials:"include",headers:Object.assign({},r,{"Content-Type":"application/json"}),body:"{}"},1);if(!tt.ok)return{success:!0,newItemId:M,warning:"Published as draft only"}}return{success:!0,newItemId:M,oldPrice:h,newPrice:k}}async function Qt(){var t=null;try{t=await new Promise(function(r){chrome.storage.local.get("vinteo_sync_state",function(e){r(e.vinteo_sync_state?JSON.parse(e.vinteo_sync_state):{})})})}catch{t={}}var n=[];try{var i=await chrome.storage.local.get("vinteo_accounts_cache");if(i.vinteo_accounts_cache){var o=JSON.parse(i.vinteo_accounts_cache);o.accounts&&(n=o.accounts)}}catch{}return{syncState:t||{},accounts:n,version:"1.3"}}var X=null,Y=null;function _t(){Y||(Y=setInterval(function(){try{chrome.runtime.sendMessage({action:"ping"},function(t){!chrome.runtime.lastError&&t&&t.pong&&(X=!1,clearInterval(Y),Y=null)})}catch{}},3e4))}function z(t,n){if(X){at(t).then(function(i){n&&n(i)}).catch(function(i){n&&n({success:!1,error:i.message})});return}try{chrome.runtime.sendMessage(t,function(i){if(chrome.runtime.lastError){X=!0,_t(),at(t).then(function(o){n&&n(o)}).catch(function(o){n&&n({success:!1,error:o.message})});return}n&&n(i)})}catch{X=!0,_t(),at(t).then(function(o){n&&n(o)}).catch(function(o){n&&n({success:!1,error:o.message})})}}async function at(t){var n=t.action;if(n==="ping")return{pong:!0,ts:Date.now(),iosMode:!0};if(n==="getPopupData")return await Qt();if(n==="triggerSync"||n==="fetchVintedOrdersWithProgress"){var i=await Xt(function(e){window.dispatchEvent(new CustomEvent("vinteo_sync_progress",{detail:e}))});try{chrome.storage.local.set({vinteo_last_auto_sync:Date.now(),vinteo_sync_state:JSON.stringify({lastSync:new Date().toISOString(),totalCount:Math.max(i.count||0,parseInt(localStorage.getItem("_vtc")||"0"))})}),localStorage.setItem("_vtc",String(Math.max(i.count||0,parseInt(localStorage.getItem("_vtc")||"0"))))}catch{}return window.dispatchEvent(new CustomEvent("vinteo_sync_complete",{detail:{count:i.count||0}})),{success:!0,count:i.count}}if(n==="fetchDressing")return await Yt();if(n==="fetchItemDetail")return await Ut(t.itemId);if(n==="deleteItem")return await kt(t.itemId);if(n==="updateItemPrice")return await Kt(t.itemId,t.newPrice);if(n==="repostItem")return await Jt(t.itemId,t.options);if(n==="publishDraft"){var o=await D(),r=await W(o.origin+"/api/v2/item_upload/drafts/"+t.itemId+"/completion",{method:"POST",credentials:"include",headers:Object.assign({},o.headers,{"Content-Type":"application/json"}),body:"{}"},1);return{success:r.ok}}if(n==="syncSession"||n==="getSession")return await new Promise(function(e){try{chrome.storage.local.get(["vinteo_session"],function(a){if(a.vinteo_session)try{e(JSON.parse(a.vinteo_session))}catch{e(null)}else e(null)})}catch{e(null)}});if(n==="logout"){try{chrome.storage.local.remove("vinteo_session"),chrome.storage.local.set({vinteo_explicit_logout:!0})}catch{}return{success:!0}}return{success:!1,error:"Unsupported on iOS: "+n}}var st=null;function lt(t){st&&clearTimeout(st),st=setTimeout(()=>Zt(t),300)}function Zt(t){chrome.storage.local.get(["vinteo_session","vinteo_explicit_logout"],n=>{let i=null;if(n.vinteo_session)try{i=typeof n.vinteo_session=="string"?JSON.parse(n.vinteo_session):n.vinteo_session}catch{}if(i&&i.token){try{chrome.storage.local.remove("vinteo_explicit_logout")}catch{}t(i);try{z({action:"syncSession"},()=>{chrome.runtime&&chrome.runtime.lastError||z({action:"getSession"},o=>{o&&o.token&&t(o)})})}catch{}}else if(n.vinteo_explicit_logout)t(null);else try{z({action:"syncSession"},()=>{if(chrome.runtime&&chrome.runtime.lastError){t(null);return}z({action:"getSession"},o=>{chrome.runtime&&chrome.runtime.lastError?t(null):t(o)})})}catch{t(null)}})}function $t(t){chrome.storage.onChanged.addListener((n,i)=>{if(i!=="local"||!n.vinteo_session)return;let o=n.vinteo_session.newValue;if(o)try{let r=typeof o=="string"?JSON.parse(o):o;if(r&&r.token){try{chrome.storage.local.remove("vinteo_explicit_logout")}catch{}t(r);return}}catch{}t(null)})}function Ct(t){t(null);try{chrome.storage.local.remove("vinteo_session")}catch{}try{chrome.storage.local.set({vinteo_explicit_logout:!0})}catch{}try{z({action:"logout"})}catch{}}function A(t,n,i){var o=document.getElementById("vinteo-orbit-progress");o&&o.setAttribute("style","fill:none;stroke:"+t+";stroke-width:3;stroke-linecap:round;stroke-dasharray:"+i+";stroke-dashoffset:"+n+";filter:drop-shadow(0 0 6px "+(t==="#F5A623"?"rgba(245,166,35,0.5)":"rgba(0,230,118,0.4)")+");")}var Rt='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',tn='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',pt='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',nn='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',en='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',on='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',rn='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',an="https://vinteo.xyz";function St(t){if(!t)return"";let n=document.createElement("div");return n.textContent=t,n.innerHTML}function sn(t,n){let i=t&&t.token,o=an,r=document.getElementById("vinteo-dot");r&&(i?(r.style.setProperty("background","#00E676","important"),r.style.setProperty("box-shadow","0 0 8px rgba(0,230,118,0.5)","important")):(r.style.setProperty("background","#FF4D4D","important"),r.style.setProperty("box-shadow","0 0 6px rgba(255,77,77,0.4)","important")),r.style.setProperty("animation","vinteo-pulse 2s ease-in-out infinite","important"));let e="";e+='<div class="vw-popup">',e+='<div class="vw-header">',e+='<div class="vw-header-top">',e+='<div class="vw-logo"><span class="vw-logo-text">Vinteo</span><span class="vw-logo-dot"></span></div>';let a=typeof chrome<"u"&&chrome.runtime&&chrome.runtime.getManifest?chrome.runtime.getManifest().version:"2.0";if(e+='<span class="vw-version">v'+a+"</span>",e+="</div>",i){var s=(t.tier||"free").toLowerCase(),l=s==="premium"?" vw-tier-premium":s==="pro"?" vw-tier-pro":"";e+='<div class="vw-user-row'+l+'">',e+='<div class="vw-user-info">',e+='<span class="vw-user-name">'+St(t.displayName||t.username||"")+"</span>",e+='<span class="vw-user-plan">'+St(t.planName||"Free")+"</span>",e+="</div>",e+="</div>"}e+="</div>",i&&t.isPremium?(e+='<div class="vw-card vw-card-sync">',e+='<div class="vw-orbit-section">',e+='<div class="vw-orbit-ring">',e+='<svg viewBox="0 0 120 120" style="width:90px!important;height:90px!important;transform:rotate(-90deg)!important;">',e+='<circle cx="60" cy="60" r="52" style="fill:none!important;stroke:rgba(255,255,255,0.04)!important;stroke-width:3!important;" />',e+='<circle cx="60" cy="60" r="52" id="vinteo-orbit-progress" style="fill:none;stroke:#00E676;stroke-width:3;stroke-linecap:round;stroke-dasharray:326.7;stroke-dashoffset:326.7;filter:drop-shadow(0 0 6px rgba(0,230,118,0.4));" />',e+="</svg>",e+='<div class="vw-orbit-center">',e+='<span class="vw-orbit-count" id="vinteo-sync-count">0</span>',e+='<span class="vw-orbit-label">ventes</span>',e+="</div>",e+="</div>",e+='<div class="vw-orbit-info">',e+='<div class="vw-orbit-timer" id="vinteo-next-sync">--:--</div>',e+='<div class="vw-orbit-sub">prochaine sync</div>',e+='<div class="vw-orbit-last" id="vinteo-last-sync">Jamais sync</div>',e+="</div>",e+="</div>",e+='<button id="vinteo-sync-btn" class="vw-btn vw-btn-sync">',e+='<span class="vw-btn-glow"></span>',e+=rn+' <span id="vinteo-sync-btn-text">Synchroniser</span>',e+="</button>",e+='<div id="vinteo-sync-status" class="vw-sync-status"></div>',e+="</div>",e+='<div class="vw-card vw-card-links">',e+='<div class="vw-card-header"><div class="vw-card-icon vw-ci-blue"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></div><span class="vw-label">Acc\xE8s rapide</span></div>',e+='<div class="vw-quick-grid">',e+=U(o+"/dashboard","Dashboard",tn,"green"),e+=U(o+"/dressing","Dressing",Rt,"green"),e+=U(o+"/upload","Studio IA",'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',"purple"),e+=U(o+"/purchase","Abonnement",pt,"amber"),e+="</div>",e+="</div>",e+='<div class="vw-footer">',e+='<a href="'+o+'" target="_blank" rel="noopener noreferrer" class="vw-footer-link">vinteo.xyz</a>',e+='<button id="vinteo-logout-btn" class="vw-footer-link vw-footer-danger">D\xE9connexion</button>',e+="</div>"):i?(e+='<div class="vw-card">',e+='<div class="vw-upsell">',e+='<div class="vw-upsell-icon">'+pt+"</div>",e+='<p class="vw-upsell-title">Passez Premium</p>',e+='<p class="vw-upsell-desc">Synchronisation automatique, repost anti-d\xE9tection, statistiques avanc\xE9es et plus.</p>',e+='<a href="'+o+'/purchase" target="_blank" rel="noopener noreferrer" class="vw-btn vw-btn-upsell">'+pt+" D\xE9couvrir les plans</a>",e+="</div>",e+="</div>",e+='<div class="vw-footer">',e+='<a href="'+o+'" target="_blank" rel="noopener noreferrer" class="vw-footer-link">vinteo.xyz</a>',e+='<button id="vinteo-logout-btn-free" class="vw-footer-link vw-footer-danger">D\xE9connexion</button>',e+="</div>"):(e+='<div class="vw-card">',e+='<div class="vw-login-state">',e+='<div class="vw-login-icon">'+en+"</div>",e+='<p class="vw-login-title">Connectez-vous</p>',e+='<p class="vw-login-desc">Connectez-vous via Discord pour acc\xE9der \xE0 Vinteo</p>',e+='<a id="vinteo-login-link" href="'+o+'/login" target="_blank" rel="noopener noreferrer" class="vw-btn vw-btn-login">'+on+" Se connecter</a>",e+="</div>",e+="</div>"),e+="</div>",n.textContent="",n.insertAdjacentHTML("beforeend",e)}function U(t,n,i,o){return'<a href="'+t+'" target="_blank" rel="noopener noreferrer" class="vw-qlink vw-qlink-'+o+'"><div class="vw-qlink-icon">'+i+'</div><span class="vw-qlink-label">'+n+'</span><span class="vw-qlink-arrow">'+nn+"</span></a>"}var g=null,y=null,H=null,b=null,V=null,K=0,S=null;function ln(){if(!(g&&document.body.contains(g))){if(g=document.createElement("div"),g.id="vinteo-sync-toast",g.setAttribute("style",["position:fixed!important","top:16px!important","right:16px!important","left:auto!important","bottom:auto!important","z-index:2147483647!important","background:#14141C!important","border:1px solid rgba(255,255,255,0.08)!important","border-radius:12px!important","box-shadow:0 8px 32px rgba(0,0,0,0.4)!important","padding:14px 18px!important","display:none","align-items:center!important","gap:10px!important","min-width:260px!important","max-width:380px!important","font-family:'DM Sans',sans-serif!important","font-size:13px!important","font-weight:500!important","color:#EEEEF5!important","transition:opacity 0.3s ease,transform 0.3s ease!important","opacity:0!important","transform:translateY(-8px)!important"].join(";")),H=document.createElement("div"),H.setAttribute("style",["width:16px!important","height:16px!important","border:2px solid rgba(255,255,255,0.1)!important","border-top-color:#00E676!important","border-radius:50%!important","animation:vinteo-toast-spin 0.8s linear infinite!important","flex-shrink:0!important"].join(";")),b=document.createElement("div"),b.setAttribute("style",["width:18px!important","height:18px!important","flex-shrink:0!important","display:none"].join(";")),y=document.createElement("span"),y.setAttribute("style",["flex:1!important","line-height:1.4!important"].join(";")),g.appendChild(H),g.appendChild(b),g.appendChild(y),!document.getElementById("vinteo-toast-spin-style")){let t=document.createElement("style");t.id="vinteo-toast-spin-style",t.textContent=["@keyframes vinteo-toast-spin { to { transform: rotate(360deg); } }","@keyframes vinteo-check-draw { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }","@keyframes vinteo-check-circle { from { stroke-dashoffset: 56; opacity: 0; } 30% { opacity: 1; } to { stroke-dashoffset: 0; opacity: 1; } }","@keyframes vinteo-cross-draw { from { stroke-dashoffset: 12; } to { stroke-dashoffset: 0; } }"].join(" "),document.head.appendChild(t)}document.body.appendChild(g)}}function pn(t,n){if(!g||!y)return;let i=t;if(i<=K)return;let o=K,r=performance.now(),e=200;function a(s){let l=s-r,m=Math.min(l/e,1),d=1-Math.pow(1-m,3),c=Math.round(o+(i-o)*d);K=c,y.textContent=c+" / "+n+" vente"+(c!==1?"s":"")+" synchronis\xE9e"+(c!==1?"s":"")+"\u2026",m<1?S=requestAnimationFrame(a):K=i}S&&cancelAnimationFrame(S),S=requestAnimationFrame(a)}function cn(t){!g||!y||(S&&(cancelAnimationFrame(S),S=null),H.style.setProperty("display","none","important"),b.style.setProperty("display","flex","important"),b.textContent="",b.insertAdjacentHTML("beforeend",mn("#00E676")),t===0?(y.textContent="D\xE9j\xE0 \xE0 jour",y.style.setProperty("color","#00E676","important"),setTimeout(()=>Et(3e5),3e3)):(y.textContent=t+" vente"+(t!==1?"s":"")+" synchronis\xE9e"+(t!==1?"s":"")+" !",y.style.setProperty("color","#00E676","important"),setTimeout(()=>Et(3e5),4e3)))}function dn(t){!g||!y||(S&&(cancelAnimationFrame(S),S=null),H.style.setProperty("display","none","important"),b.style.setProperty("display","flex","important"),b.textContent="",b.insertAdjacentHTML("beforeend",xn("#FF4D4D")),y.textContent=t||"Erreur de synchronisation",y.style.setProperty("color","#FF4D4D","important"),At(5e3))}function mn(t){return'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" stroke="'+t+'" stroke-width="1.5" fill="none" stroke-dasharray="56" stroke-dashoffset="56" style="animation:vinteo-check-circle 0.5s ease forwards"/><path d="M5.5 9.5L7.8 11.8L12.5 6.5" stroke="'+t+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-dasharray="24" stroke-dashoffset="24" style="animation:vinteo-check-draw 0.3s ease 0.35s forwards"/></svg>'}function xn(t){return'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="8" stroke="'+t+'" stroke-width="1.5" fill="none" stroke-dasharray="56" stroke-dashoffset="56" style="animation:vinteo-check-circle 0.5s ease forwards"/><path d="M6.5 6.5L11.5 11.5" stroke="'+t+'" stroke-width="1.8" stroke-linecap="round" fill="none" stroke-dasharray="12" stroke-dashoffset="12" style="animation:vinteo-cross-draw 0.25s ease 0.35s forwards"/><path d="M11.5 6.5L6.5 11.5" stroke="'+t+'" stroke-width="1.8" stroke-linecap="round" fill="none" stroke-dasharray="12" stroke-dashoffset="12" style="animation:vinteo-cross-draw 0.25s ease 0.45s forwards"/></svg>'}var q=null,ct=null;function Tn(t){ct=t}function Et(t){ln(),V&&(clearTimeout(V),V=null),q&&(clearInterval(q),q=null),H.style.setProperty("display","none","important"),b.style.setProperty("display","flex","important"),b.textContent="",b.insertAdjacentHTML("beforeend",un("#7A7A8C"));let n=Date.now()+t;function i(){let o=Math.max(0,Math.ceil((n-Date.now())/1e3)),r=Math.floor(o/60),e=o%60,a=r>0?r+":"+(e<10?"0":"")+e:e+"s";y.textContent="Prochaine sync dans "+a,y.style.setProperty("color","#7A7A8C","important"),o<=0&&(q&&(clearInterval(q),q=null),ct?ct():At(500))}i(),q=setInterval(i,1e3),g.style.setProperty("display","flex","important"),requestAnimationFrame(()=>{g.style.setProperty("opacity","1","important"),g.style.setProperty("transform","translateY(0)","important")})}function un(t){return'<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7.5" stroke="'+t+'" stroke-width="1.5" fill="none"/><path d="M9 5V9.5L12 11" stroke="'+t+'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'}function At(t){V&&clearTimeout(V),V=setTimeout(()=>{g&&(g.style.setProperty("opacity","0","important"),g.style.setProperty("transform","translateY(-8px)","important"),setTimeout(()=>{g&&g.style.setProperty("display","none","important")},300))},t)}function vn(t){!chrome.runtime||!chrome.runtime.onMessage||!chrome.runtime.onMessage.addListener||chrome.runtime.onMessage.addListener((n,i,o)=>{if(n.action==="vintedApiProxy"){let r=n.url;r.indexOf("http")!==0&&(r=window.location.origin+r);let e={method:n.method||"GET",credentials:"include",headers:{Accept:"application/json"}};return n.body&&(e.headers["Content-Type"]="application/json",e.body=JSON.stringify(n.body)),fetch(r,e).then(a=>{if(!a.ok){o({success:!1,error:"HTTP "+a.status});return}return a.json().then(s=>{o({success:!0,status:a.status,data:s})})}).catch(a=>{o({success:!1,error:a.message})}),!0}n.action!=="session_updated"&&(n.action,n.action==="dm_campaign_complete"&&t("Campagne termin\xE9e : "+n.sent+" messages envoy\xE9s","success",6e3),n.action==="sync_progress"&&pn(n.current,n.total),n.action==="sync_complete"&&cn(n.count),n.action==="sync_error"&&dn(n.error))})}var v=null,J=null,G=!1,Q=null,Z=null;function fn(t){var n=Date.now()-new Date(t).getTime(),i=Math.floor(n/1e3);if(i<60)return"il y a "+i+"s";var o=Math.floor(i/60);if(o<60)return"il y a "+o+" min";var r=Math.floor(o/60);return"il y a "+r+"h"}function $(){z({action:"getPopupData"},function(t){if(!(chrome.runtime&&chrome.runtime.lastError||!t)){var n=t.syncState||{},i=document.getElementById("vinteo-last-sync"),o=document.getElementById("vinteo-next-sync"),r=document.getElementById("vinteo-sync-count");i&&n.lastSync&&(i.textContent=fn(n.lastSync)),r&&(r.textContent=String(n.totalCount||0));var e=document.getElementById("vinteo-orbit-progress"),a=2*Math.PI*52;if(n.lastSync&&o&&!n.isSyncing&&!G){let m=function(){var d=Date.now()-s,c=l-d,u=Math.min(1,d/l);if(e){var p=a*(1-u);A("#F5A623",p,a)}if(c<=0)v&&(clearInterval(v),v=null),e&&A("#00E676",0,a),o.textContent="0:00";else{var w=Math.floor(c/6e4),x=Math.floor(c%6e4/1e3);o.textContent=w+":"+String(x).padStart(2,"0")}};v&&clearInterval(v);var s=new Date(n.lastSync).getTime(),l=3e5;m(),v=setInterval(m,1e3)}}})}function Pt(t){if(t){v&&clearInterval(v);var n=Date.now(),i=function(){var o=3e5-(Date.now()-n),r=document.getElementById("vinteo-orbit-progress"),e=2*Math.PI*52,a=Math.min(1,(Date.now()-n)/3e5);if(r&&A("#F5A623",e*(1-a),e),o<=0){v&&(clearInterval(v),v=null),t.textContent="0:00",r&&A("#00E676",0,e);return}var s=Math.floor(o/6e4),l=Math.floor(o%6e4/1e3);t.textContent=s+":"+String(l).padStart(2,"0")};i(),v=setInterval(i,1e3)}}function gn(t){$();let n=document.getElementById("vinteo-logout-btn");n&&n.addEventListener("click",()=>Ct(t));let i=document.getElementById("vinteo-logout-btn-free");i&&i.addEventListener("click",()=>Ct(t));var o=document.getElementById("vinteo-sync-btn"),r=document.getElementById("vinteo-sync-btn-text"),e=document.getElementById("vinteo-sync-count"),a=document.querySelector("#vinteo-panel .vw-orbit-label"),s=document.getElementById("vinteo-next-sync"),l=document.querySelector("#vinteo-panel .vw-orbit-sub"),m=document.getElementById("vinteo-orbit-progress"),d=2*Math.PI*52;Q&&window.removeEventListener("vinteo_sync_progress",Q),Z&&window.removeEventListener("vinteo_sync_complete",Z),Q=function(c){var u=c.detail;if(!(!u||!e)){G=!0,v&&(clearInterval(v),v=null);var p=(u.current||0)/(u.total||1);e.textContent=String(u.current),a&&(a.textContent="en cours"),s&&(s.textContent=Math.round(p*100)+"%",s.style.setProperty("color","#F5A623","important")),l&&(l.textContent=u.title?u.title.substring(0,25):"synchronisation"),m&&requestAnimationFrame(function(){A("#F5A623",d*(1-p),d)})}},Z=function(c){var u=c.detail||{};G=!1,e&&(e.textContent=String(u.count||0)),a&&(a.textContent="ventes"),s&&(s.textContent="5:00",s.style.setProperty("color","#00E676","important")),l&&(l.textContent="il y a quelques secondes"),m&&A("#00E676",d,d),o&&(o.disabled=!1,o.classList.remove("syncing")),r&&(r.textContent="Synchroniser"),$(),Pt(s)},window.addEventListener("vinteo_sync_progress",Q),window.addEventListener("vinteo_sync_complete",Z),chrome.runtime&&chrome.runtime.onMessage&&(J&&chrome.runtime.onMessage.removeListener(J),J=function(c){if(c.action==="sync_progress"&&e){G=!0,v&&(clearInterval(v),v=null);var u=c.current||0,p=c.total||1,w=u/p;if(e.textContent=String(u),a&&(a.textContent="en cours"),s&&(s.textContent=Math.round(w*100)+"%",s.style.setProperty("color","#F5A623","important")),l&&(l.textContent=c.title?c.title.substring(0,25):"synchronisation"),m){var x=d*(1-w);requestAnimationFrame(function(){A("#F5A623",x,d)})}}c.action==="sync_complete"&&e&&(G=!1,e.textContent=String(c.count||0),a&&(a.textContent="ventes"),s&&(s.textContent="5:00",s.style.setProperty("color","#00E676","important")),l&&(l.textContent="il y a quelques secondes"),m&&A("#00E676",d,d),o&&(o.disabled=!1,o.classList.remove("syncing")),r&&(r.textContent="Synchroniser"),$(),Pt(s))},chrome.runtime.onMessage.addListener(J)),o&&o.addEventListener("click",function(){o.disabled=!0,o.classList.add("syncing"),r&&(r.textContent="Synchronisation\u2026"),v&&(clearInterval(v),v=null),e&&(e.textContent="0"),a&&(a.textContent="en cours"),s&&(s.textContent="0%",s.style.setProperty("color","#F5A623","important")),l&&(l.textContent="d\xE9marrage..."),m&&requestAnimationFrame(function(){A("#F5A623",d,d)}),z({action:"triggerSync"},function(c){if(chrome.runtime&&chrome.runtime.lastError||!c||!c.success){o.disabled=!1,o.classList.remove("syncing"),r&&(r.textContent="Erreur \u2014 r\xE9essayer"),setTimeout(function(){r&&(r.textContent="Synchroniser"),$()},3e3);return}})})}var R=null,dt=new Set,Tt="";function hn(){if(!document.getElementById("vinteo-label-styles")){var t=document.createElement("style");t.id="vinteo-label-styles",t.textContent=`
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
  `,document.head.appendChild(t)}}var jt='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',wn='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>',yn='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',bn='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';function kn(){for(var t=(document.body.innerText||"").toLowerCase(),n=["bordereau d'envoi","article \xE0 emballer","envoyer le colis","t\xE9l\xE9charger le bordereau","shipping label","pack and ship","ship the parcel","download the label","paket versenden","versandlabel herunterladen","artikel verpacken","prepara il pacco","istruzioni di spedizione","scarica l'etichetta","prepara il pacco e invialo","enviar el paquete","instrucciones de env\xEDo","descargar la etiqueta","enviar a encomenda","instru\xE7\xF5es de envio","pakket verzenden","verzendlabel downloaden","wy\u015Blij paczk\u0119","etykiet\u0119 wysy\u0142kow\u0105"],i=0;i<n.length;i++)t.indexOf(n[i])>-1&&returntrue;return!!Ft()}function Ft(){for(var t=document.querySelectorAll("a[href]"),n=0;n<t.length;n++){var i=t[n].href||"",o=(t[n].textContent||"").toLowerCase().trim();if((o==="t\xE9l\xE9charger"||o==="download"||o==="herunterladen"||o==="scarica"||o==="descargar")&&i||i.indexOf("pdf_label")>-1||i.indexOf("label_url")>-1||i.indexOf(".pdf")>-1&&i.indexOf("shipment")>-1)return i}return null}async function _n(){var t=window.location.href.match(/inbox\/(\d+)/);if(!t)return null;for(var n=t[1],i=null,o=document.querySelectorAll("script"),r=/"CSRF_TOKEN\\?":\\?"([^"\\]+)\\?"/,e=0;e<o.length;e++){var a=(o[e].textContent||"").match(r);if(a&&a[1]){i=a[1];break}}if(!i){var s=document.querySelector('meta[name="csrf-token"]');s&&(i=s.getAttribute("content"))}var l={Accept:"application/json"};i&&(l["X-CSRF-Token"]=i);var m=window.location.origin;try{var d=await fetch(m+"/api/v2/conversations/"+n,{credentials:"include",headers:l});if(!d.ok)return null;var c=await d.json(),u=c.conversation||c,p=u.transaction;if(!p||!p.id)return null;var w=p.id,x=p.shipment_id||null;if(x)try{var P=await fetch(m+"/api/v2/shipments/"+x+"/label_url",{credentials:"include",headers:l});if(P.ok){var E=await P.json();if(E.label_url)return E.label_url;if(E.url)return E.url}}catch{}if(!x)try{var h=await fetch(m+"/api/v2/transactions/"+w,{credentials:"include",headers:l});if(h.ok){var k=await h.json(),I=k.transaction||k;if(x=I.shipment?I.shipment.id:null,x){var T=await fetch(m+"/api/v2/shipments/"+x+"/label_url",{credentials:"include",headers:l});if(T.ok){var j=await T.json();if(j.label_url||j.url)return j.label_url||j.url}}}}catch{}try{var F=await fetch(m+"/api/v2/transactions/"+w+"/shipment/pdf_label",{credentials:"include",headers:l});if(F.ok){var M=await F.json();if(M.url)return M.url}}catch{}}catch{}return null}function Cn(){for(var t=document.querySelectorAll("h2 a[href*='/member/']"),n=0;n<t.length;n++){var i=t[n],o=(i.textContent||"").trim();if(o.length>0&&o.length<40){var r=i.parentElement;if(r&&r.tagName==="H2")return r}}return null}function Sn(t,n){hn();var i=document.createElement("button");i.className="vteo-label-btn"+(n?"":" disabled"),i.setAttribute("data-vinteo-label","1"),i.innerHTML=jt;var o=n?"Vinteo \u2014 \xC9tiquette d\xE9coup\xE9e":"Aucune \xE9tiquette",r=n?"T\xE9l\xE9charge l'\xE9tiquette d\xE9coup\xE9e pr\xEAte \xE0 imprimer":"Pas de bordereau disponible pour cette conversation",e=document.createElement("div");e.className="vteo-label-tip",e.innerHTML='<span class="vteo-tip-title">'+o+'</span><span class="vteo-tip-desc">'+r+"</span>",document.body.appendChild(e),i.addEventListener("mouseenter",function(){var a=i.getBoundingClientRect();e.style.left=a.left+a.width/2-e.offsetWidth/2+"px",e.style.top=a.top-e.offsetHeight-8+"px",e.classList.add("show")}),i.addEventListener("mouseleave",function(){e.classList.remove("show")}),n&&i.addEventListener("click",function(a){a.preventDefault(),a.stopPropagation(),En(i)}),t.style.display="inline-flex",t.style.alignItems="center",t.style.gap="6px",t.appendChild(i)}async function En(t){if(!t.classList.contains("loading")){t.className="vteo-label-btn loading",t.innerHTML=wn;try{var n=Ft();if(n||(n=await _n()),!n)throw new Error("\xC9tiquette introuvable");for(var i=await new Promise(function(m,d){try{chrome.runtime.sendMessage({action:"cropLabel",labelUrl:n},function(c){if(chrome.runtime.lastError){d(new Error(chrome.runtime.lastError.message));return}if(!c||!c.success){d(new Error(c?c.error:"Pas de r\xE9ponse"));return}m(c)})}catch(c){d(c)}}),o=atob(i.pdfBase64),r=new Uint8Array(o.length),e=0;e<o.length;e++)r[e]=o.charCodeAt(e);var a=new Blob([r],{type:"application/pdf"}),s=URL.createObjectURL(a),l=document.createElement("a");l.href=s,l.download="etiquette-decoupee.pdf",l.style.display="none",document.body.appendChild(l),l.click(),setTimeout(function(){document.body.removeChild(l),URL.revokeObjectURL(s)},1e3),t.className="vteo-label-btn",t.innerHTML=yn,setTimeout(function(){Mt(t)},2500)}catch{t.className="vteo-label-btn error",t.innerHTML=bn,setTimeout(function(){Mt(t)},3e3)}}}function Mt(t){t.className="vteo-label-btn",t.innerHTML=jt+`<span class="vteo-label-tip"><span class="vteo-tip-title">Vinteo \u2014 \xC9tiquette d\xE9coup\xE9e</span><span class="vteo-tip-desc">T\xE9l\xE9charge l'\xE9tiquette d\xE9coup\xE9e pr\xEAte \xE0 imprimer</span></span>`}function zt(){if(window.location.href.indexOf("/inbox/")!==-1){var t=window.location.href;if(t!==Tt){Tt=t,dt.clear();for(var n=document.querySelectorAll("[data-vinteo-label]"),i=0;i<n.length;i++)n[i].remove();for(var o=document.querySelectorAll(".vteo-label-tip"),r=0;r<o.length;r++)o[r].remove()}var e=t.match(/inbox\/(\d+)/);if(e){var a=e[1];if(!dt.has(a)){var s=Cn();if(s){dt.add(a);var l=kn();Sn(s,l)}}}}}function An(){zt(),R&&R.disconnect(),R=new MutationObserver(function(){zt()}),R.observe(document.body,{childList:!0,subtree:!0})}window.__vinteoSendMessage=z,document.getElementById("vinteo-widget")||mt();var Pn=new MutationObserver(()=>{!document.getElementById("vinteo-widget")&&document.body&&mt()});document.body&&Pn.observe(document.body,{childList:!0});function mt(){if(!document.body){document.addEventListener("DOMContentLoaded",mt);return}if(!document.getElementById("vinteo-fonts-preconnect")){let a=document.createElement("link");a.id="vinteo-fonts-preconnect",a.rel="preconnect",a.href="https://fonts.googleapis.com",document.head.appendChild(a);let s=document.createElement("link");s.rel="preconnect",s.href="https://fonts.gstatic.com",s.crossOrigin="anonymous",document.head.appendChild(s);let l=document.createElement("link");l.rel="stylesheet",l.href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap",document.head.appendChild(l)}if(!document.getElementById("vinteo-widget-style")){let a=document.createElement("style");a.id="vinteo-widget-style",a.textContent=Lt,document.head.appendChild(a)}let t=document.createElement("div");t.id="vinteo-widget",t.setAttribute("style",["position:fixed!important","bottom:20px!important","left:20px!important","right:auto!important","top:auto!important","z-index:2147483647!important","width:44px!important","height:44px!important","background:#08080D!important","border:1px solid rgba(255,255,255,0.08)!important","border-radius:12px!important","cursor:pointer!important","box-shadow:0 4px 16px rgba(0,0,0,0.4)!important","display:flex!important","align-items:center!important","justify-content:center!important","margin:0!important","padding:0!important","transform:none!important","transition:all 0.2s ease!important","touch-action:none!important","-webkit-tap-highlight-color:transparent!important","-webkit-user-select:none!important","user-select:none!important"].join(";"));let n=document.createElement("span");n.setAttribute("style","color:#EEEEF5!important;font-weight:800!important;font-size:18px!important;line-height:1!important;-webkit-user-select:none!important;user-select:none!important;font-family:'Syne',sans-serif!important;letter-spacing:-0.03em!important;pointer-events:none!important;"),n.textContent="V",t.textContent="",t.appendChild(n);let i=document.createElement("div");i.id="vinteo-dot",i.setAttribute("style",["position:absolute!important","top:3px!important","right:3px!important","width:7px!important","height:7px!important","border-radius:50%!important","background:#FF4D4D!important","border:1.5px solid #08080D!important","box-shadow:0 0 6px rgba(255,77,77,0.4)!important","animation:vinteo-pulse 2s ease-in-out infinite!important","transition:background 0.3s!important"].join(";")),t.appendChild(i);let o=document.createElement("div");o.id="vinteo-panel",o.setAttribute("style",["position:fixed!important","bottom:72px!important","left:20px!important","right:auto!important","top:auto!important","z-index:2147483647!important","background:#08080D!important","border:1px solid rgba(0,230,118,0.08)!important","border-radius:16px!important","box-shadow:0 0 40px rgba(0,230,118,0.04),0 8px 40px rgba(0,0,0,0.6)!important","display:none","width:min(400px, calc(100vw - 24px))!important","max-height:min(600px, calc(100vh - 100px))!important","overflow-y:auto!important","margin:0!important","padding:0!important","transform:none!important"].join(";"));let r=document.createElement("div");r.id="vinteo-banner",r.setAttribute("style",["position:fixed!important","top:20px!important","left:50%!important","right:auto!important","transform:translateX(-50%)!important","z-index:2147483647!important","padding:14px 20px!important","border-radius:10px!important","font-family:'DM Sans',sans-serif!important","font-size:13px!important","font-weight:500!important","display:none","margin:0!important","background:#14141C!important","border:1px solid rgba(255,255,255,0.08)!important","box-shadow:0 8px 32px rgba(0,0,0,0.4)!important","transition:opacity 0.3s ease,transform 0.3s ease!important"].join(";")),document.body.appendChild(t),document.body.appendChild(o),document.body.appendChild(r),Bt(r),window.vinteoBanner=xt;let e=a=>{sn(a,o),gn(e)};It(t,o,()=>{o.style.display!=="none"&&o.style.display!==""?o.style.setProperty("display","none","important"):(ht(),o.style.setProperty("display","block","important"),lt(e))}),vn(xt),An(),$t(e),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&lt(e)}),lt(e)}})();
