// Agent 4 : L'Interface (Popup Script)

document.addEventListener('DOMContentLoaded', () => {
    // --- 🧭 NAV TABS MODULE ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            
            // Mettre à jour l'état actif des onglets
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Afficher la section ciblée
            tabContents.forEach(content => {
                if (content.id === targetId) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    // --- 🕒 LIVE ALARMS TIMERS MODULE ---
    const ghostTimer = document.getElementById('ghost-timer');
    const syncTimer = document.getElementById('sync-timer');
    const geminiTimer = document.getElementById('gemini-timer');
    const likeTimer = document.getElementById('like-timer');
    let isAutoLikeRunning = false;

    function updateTimers() {
        chrome.alarms.getAll((alarms) => {
            const now = Date.now();
            
            // 1. Ghost Scan (Likes / Marketing)
            const ghostAlarm = alarms.find(a => a.name === 'vintedGhostAlarm');
            if (ghostAlarm) {
                const diff = Math.max(0, ghostAlarm.scheduledTime - now);
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                
                chrome.storage.local.get(['botActive'], (res) => {
                    if (res.botActive) {
                        ghostTimer.innerHTML = `<span>🎲</span> Cycle : <b>${mins}m ${secs.toString().padStart(2, '0')}s</b>`;
                        ghostTimer.className = 'timer-badge active-timer';
                    } else {
                        ghostTimer.innerHTML = `<span>😴</span> Bot inactif (Sommeil)`;
                        ghostTimer.className = 'timer-badge';
                    }
                });
            } else {
                ghostTimer.innerHTML = `<span>🎲</span> Cycle : planification...`;
                ghostTimer.className = 'timer-badge';
            }

            // 2. Synchronisation (Metrics / Dressing / Inbox)
            const syncAlarm = alarms.find(a => a.name === 'vintedSyncAlarm');
            if (syncAlarm) {
                const diff = Math.max(0, syncAlarm.scheduledTime - now);
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                
                syncTimer.innerHTML = `<span>🕒</span> Synchro : <b>${mins}m ${secs.toString().padStart(2, '0')}s</b>`;
                syncTimer.className = 'timer-badge active-timer';
            } else {
                syncTimer.innerHTML = `<span>🕒</span> Synchro : planifiée...`;
                syncTimer.className = 'timer-badge';
            }

            // 3. Moteur conversationnel IA (Gemini Flash)
            const geminiAlarm = alarms.find(a => a.name === 'vintedGeminiAlarm');
            if (geminiAlarm && geminiTimer) {
                const diff = Math.max(0, geminiAlarm.scheduledTime - now);
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                
                chrome.storage.local.get(['botActive'], (res) => {
                    if (res.botActive) {
                        geminiTimer.innerHTML = `<span>🔮</span> IA : <b>${mins}m ${secs.toString().padStart(2, '0')}s</b>`;
                        geminiTimer.className = 'timer-badge active-timer';
                    } else {
                        geminiTimer.innerHTML = `<span>😴</span> IA inactive (Sommeil)`;
                        geminiTimer.className = 'timer-badge';
                    }
                });
            } else if (geminiTimer) {
                geminiTimer.innerHTML = `<span>🔮</span> IA : planification...`;
                geminiTimer.className = 'timer-badge';
            }

            // 4. Warm-up (Auto-Like / Activité passive)
            if (!isAutoLikeRunning && likeTimer) {
                const warmupAlarm = alarms.find(a => a.name === 'vintedWarmupAlarm');
                if (warmupAlarm) {
                    const diff = Math.max(0, warmupAlarm.scheduledTime - now);
                    const totalMins = Math.floor(diff / 60000);
                    const mins = totalMins % 60;
                    const hours = Math.floor(totalMins / 60);
                    const secs = Math.floor((diff % 60000) / 1000);
                    
                    chrome.storage.local.get(['botActive'], (res) => {
                        if (!isAutoLikeRunning) {
                            if (res.botActive) {
                                let timeStr = "";
                                if (hours > 0) {
                                    timeStr = `${hours}h ${mins}m ${secs.toString().padStart(2, '0')}s`;
                                } else {
                                    timeStr = `${mins}m ${secs.toString().padStart(2, '0')}s`;
                                }
                                likeTimer.innerHTML = `<span>❤️</span> Warm-up : <b>${timeStr}</b>`;
                                likeTimer.className = 'timer-badge active-timer';
                            } else {
                                likeTimer.innerHTML = `<span>😴</span> Warm-up inactif (Sommeil)`;
                                likeTimer.className = 'timer-badge';
                            }
                        }
                    });
                } else {
                    likeTimer.innerHTML = `<span>❤️</span> Warm-up : planification...`;
                    likeTimer.className = 'timer-badge';
                }
            }
        });
    }
    
    // Lancement immédiat + loop à 1s
    updateTimers();
    const timerInterval = setInterval(updateTimers, 1000);
    
    // Arrêt propre de l'intervalle quand le popup se décharge
    window.addEventListener('unload', () => {
        clearInterval(timerInterval);
    });

    // --- 📜 REACTIVE LOGS MODULE (Plus de délai !) ---
    const activityLogContainer = document.getElementById('activity-log');

    function renderLogs(logs) {
        if (!activityLogContainer) return;
        if (logs && logs.length > 0) {
            activityLogContainer.innerHTML = '';
            // Afficher les 5 dernières actions (les plus récentes en haut)
            logs.slice(-5).reverse().forEach(log => {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.textContent = `• ${log}`;
                activityLogContainer.appendChild(entry);
            });
        } else {
            activityLogContainer.innerHTML = '<div class="empty-logs">Aucune activité récente.</div>';
        }
    }

    // Chargement initial des logs
    chrome.storage.local.get(['activityLog'], (result) => {
        renderLogs(result.activityLog || []);
    });

    // ÉCOUTEUR RÉACTIF EN TEMPS RÉEL : met à jour dès qu'une nouvelle ligne est poussée !
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.activityLog) {
            renderLogs(changes.activityLog.newValue || []);
        }
    });

    // --- 🤖 CONTROLS & GENERAL LOGIC ---
    const toggleBtn = document.getElementById('toggle-btn');
    const statusBadge = document.getElementById('status-badge');
    const statusBadgeContainer = document.getElementById('status-badge-container');
    const negoThresholdInput = document.getElementById('nego-threshold');
    const geminiKeyInput = document.getElementById('gemini-key');
    
    let isBotActive = false;

    // Récupérer l'état initial du Bot
    chrome.runtime.sendMessage({ action: "getBotStatus" }, (response) => {
        if (response && response.status !== undefined) {
            isBotActive = response.status;
            updateUI();
        }
    });

    // Récupérer le seuil de négociation sauvegardé
    chrome.storage.local.get(['negoThreshold'], (result) => {
        if (result.negoThreshold) {
            negoThresholdInput.value = result.negoThreshold;
        }
    });

    // Récupérer la clé API Gemini sauvegardée
    chrome.storage.local.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            geminiKeyInput.value = result.geminiApiKey;
        }
    });

    // Sauvegarder le seuil quand il change
    negoThresholdInput.addEventListener('change', () => {
        const value = parseInt(negoThresholdInput.value, 10);
        chrome.storage.local.set({ negoThreshold: value });
    });

    // Sauvegarder la clé quand elle change
    geminiKeyInput.addEventListener('change', () => {
        const value = geminiKeyInput.value.trim();
        chrome.storage.local.set({ geminiApiKey: value });
    });

    toggleBtn.addEventListener('click', () => {
        isBotActive = !isBotActive;
        
        // Sauvegarder le nouvel état
        chrome.runtime.sendMessage({ action: "toggleBot", botActive: isBotActive }, (response) => {
            if (response && response.success) {
                updateUI();
                // Mettre à jour immédiatement l'affichage du timer badge
                updateTimers();
            }
        });
    });

    const checkNowBtn = document.getElementById('check-now-btn');
    if (checkNowBtn) {
        checkNowBtn.addEventListener('click', () => {
            const originalText = checkNowBtn.innerHTML;
            checkNowBtn.innerHTML = "<span>⌛</span> Scan lancé...";
            checkNowBtn.disabled = true;

            chrome.runtime.sendMessage({ action: "checkNotifications" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                    checkNowBtn.innerHTML = "<span>⚠️</span> Service HS";
                    checkNowBtn.className = "btn btn-danger";
                }
                setTimeout(() => {
                    checkNowBtn.disabled = false;
                    checkNowBtn.innerHTML = originalText;
                    checkNowBtn.className = "btn btn-secondary";
                }, 4000);
            });
        });
    }

    const checkGeminiBtn = document.getElementById('check-gemini-btn');
    if (checkGeminiBtn) {
        checkGeminiBtn.addEventListener('click', () => {
            const originalText = checkGeminiBtn.innerHTML;
            checkGeminiBtn.innerHTML = "<span>⌛</span> IA en marche...";
            checkGeminiBtn.disabled = true;

            chrome.runtime.sendMessage({ action: "checkGeminiMessages" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                    checkGeminiBtn.innerHTML = "<span>⚠️</span> Service HS";
                    checkGeminiBtn.className = "btn btn-danger";
                }
                setTimeout(() => {
                    checkGeminiBtn.disabled = false;
                    checkGeminiBtn.innerHTML = originalText;
                    checkGeminiBtn.className = "btn btn-secondary";
                }, 4000);
            });
        });
    }

    const autoLikeBtn = document.getElementById('auto-like-btn');
    if (autoLikeBtn && likeTimer) {
        autoLikeBtn.addEventListener('click', () => {
            isAutoLikeRunning = true;
            const originalText = autoLikeBtn.innerHTML;
            autoLikeBtn.innerHTML = "<span>⌛</span> Likes en cours...";
            autoLikeBtn.disabled = true;
            likeTimer.innerHTML = "<span>⚡</span> Exécution en cours...";
            likeTimer.className = "timer-badge active-timer";

            chrome.runtime.sendMessage({ action: "triggerAutoLike" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Error:", chrome.runtime.lastError.message);
                    autoLikeBtn.innerHTML = "<span>⚠️</span> Service HS";
                    autoLikeBtn.className = "btn btn-danger";
                    likeTimer.innerHTML = "<span>❌</span> Échec communication background";
                    likeTimer.className = "timer-badge";
                } else if (response && response.success) {
                    autoLikeBtn.innerHTML = "<span>✅</span> Auto-Like Lancé !";
                    autoLikeBtn.className = "btn btn-success";
                    likeTimer.innerHTML = "<span>🎉</span> Tâche envoyée avec succès";
                    likeTimer.className = "timer-badge active-timer";
                } else {
                    autoLikeBtn.innerHTML = "<span>⚠️</span> Échec";
                    autoLikeBtn.className = "btn btn-danger";
                    likeTimer.innerHTML = `<span>❌</span> ${response?.error || "Inconnu"}`;
                    likeTimer.className = "timer-badge";
                }
                
                setTimeout(() => {
                    isAutoLikeRunning = false;
                    autoLikeBtn.disabled = !isBotActive;
                    autoLikeBtn.innerHTML = originalText;
                    autoLikeBtn.className = "btn btn-secondary";
                    updateTimers(); // Actualisation immédiate du timer
                }, 4000);
            });
        });
    }

    // --- 🛍️ ACHATS SHEIN LOGS ---
    function renderSheinLogs() {
        const logContainer = document.getElementById('shein-orders-log');
        if (!logContainer) return;
        
        chrome.storage.local.get(['sheinLogs'], (res) => {
            const logs = res.sheinLogs || [];
            if (logs.length === 0) {
                logContainer.innerHTML = '<div class="empty-logs">Aucun article ajouté au panier récemment.</div>';
                return;
            }
            
            logContainer.innerHTML = '';
            // Afficher du plus récent au plus ancien
            [...logs].reverse().forEach(log => {
                const logEl = document.createElement('div');
                logEl.className = 'log-entry';
                
                const timeStr = new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit', second:'2-digit' });
                
                let icon = '🛒';
                let colorClass = 'success';
                let statusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 9px; border: 1px solid rgba(16, 185, 129, 0.3);">AJOUTÉ</span>`;
                
                if (log.status === "ERROR") {
                    icon = '❌';
                    colorClass = 'error';
                    statusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 2px 6px; border-radius: 4px; font-size: 9px; border: 1px solid rgba(239, 68, 68, 0.3);">ERREUR</span>`;
                }
                
                logEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <div style="font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                            <span>${icon}</span>
                            <a href="${log.url}" target="_blank" style="color: #cbd5e1; text-decoration: none; border-bottom: 1px dotted #64748b; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.title || 'Article Shein'}</a>
                        </div>
                        <div style="font-size: 10px; color: #64748b;">${timeStr}</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
                        <span style="font-size: 10px; color: #94a3b8; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">Taille: ${log.taille || '?'}</span>
                        ${statusBadge}
                    </div>
                    ${log.error ? `<div style="margin-top: 6px; font-size: 9px; color: #ef4444; background: rgba(239,68,68,0.1); padding: 4px; border-radius: 4px;">${log.error}</div>` : ''}
                `;
                
                logContainer.appendChild(logEl);
            });
        });
    }

    // Refresh logs on load and when tab is clicked
    renderSheinLogs();
    const sheinTabBtn = document.querySelector('[data-target="tab-shein-orders"]');
    if (sheinTabBtn) {
        sheinTabBtn.addEventListener('click', renderSheinLogs);
    }


    const syncFinanceBtn = document.getElementById('sync-finance-btn');
    const syncStatusDiv = document.getElementById('sync-status');
    if (syncFinanceBtn && syncStatusDiv) {
        syncFinanceBtn.addEventListener('click', () => {
            const originalText = syncFinanceBtn.innerHTML;
            
            // État : Chargement
            syncFinanceBtn.innerHTML = "<span>⌛</span> Synchro en cours...";
            syncFinanceBtn.disabled = true;
            syncFinanceBtn.className = "btn btn-secondary";
            
            syncStatusDiv.className = "sync-status-container hidden";

            chrome.runtime.sendMessage({ action: "triggerManualSync" }, (response) => {
                syncFinanceBtn.disabled = false;
                
                if (response && response.success) {
                    // --- SUCCÈS VISUEL ULTRA-PREMIUM ---
                    syncFinanceBtn.innerHTML = "<span>✅</span> Synchronisation Réussie !";
                    syncFinanceBtn.className = "btn btn-success";
                    
                    let detailTxt = "🎉 Vos données Inbox & Dressing sont désormais synchronisées !";
                    if (response.partial) {
                        const errSummary = response.errors && response.errors.length > 0 
                            ? response.errors.map(e => e.split(":")[0]).join(", ") 
                            : "certaines étapes ont échoué";
                        detailTxt = `⚠️ Synchro partielle (Échec sur : ${errSummary}). Regardez le log !`;
                    }
                    
                    syncStatusDiv.innerHTML = detailTxt;
                    syncStatusDiv.className = "sync-status-container success";
                    
                    // Rétablir après 4 secondes
                    setTimeout(() => {
                        syncFinanceBtn.className = "btn btn-secondary";
                        syncFinanceBtn.innerHTML = originalText;
                        syncStatusDiv.className = "sync-status-container hidden";
                    }, 4000);
                } else {
                    // --- ÉCHEC VISUEL VISIBLE ---
                    syncFinanceBtn.innerHTML = "<span>⚠️</span> Échec de synchronisation";
                    syncFinanceBtn.className = "btn btn-error";
                    
                    const rawErr = response?.error || "Impossible de joindre l'onglet Vinted ou le serveur.";
                    const cleanErr = rawErr.split("|")[0].substring(0, 60);
                    
                    syncStatusDiv.innerHTML = `❌ ${cleanErr}... Assurez-vous d'avoir un onglet Vinted ouvert.`;
                    syncStatusDiv.className = "sync-status-container error";
                    
                    // Rétablir le bouton
                    setTimeout(() => {
                        syncFinanceBtn.className = "btn btn-secondary";
                        syncFinanceBtn.innerHTML = originalText;
                    }, 5000);
                }
            });
        });
    }


    function updateUI() {
        const checkNowBtn = document.getElementById('check-now-btn');
        const checkGeminiBtn = document.getElementById('check-gemini-btn');
        const autoLikeBtn = document.getElementById('auto-like-btn');

        if (isBotActive) {
            statusBadge.textContent = 'Online';
            statusBadgeContainer.className = 'status-badge active';
            toggleBtn.textContent = 'Désactiver le Bot';
            toggleBtn.className = 'btn btn-danger';
            
            if (checkNowBtn) checkNowBtn.disabled = false;
            if (checkGeminiBtn) checkGeminiBtn.disabled = false;
            if (autoLikeBtn) autoLikeBtn.disabled = false;
        } else {
            statusBadge.textContent = 'Offline';
            statusBadgeContainer.className = 'status-badge inactive';
            toggleBtn.textContent = 'Activer le Bot';
            toggleBtn.className = 'btn btn-primary';
            
            if (checkNowBtn) checkNowBtn.disabled = true;
            if (checkGeminiBtn) checkGeminiBtn.disabled = true;
            if (autoLikeBtn) autoLikeBtn.disabled = true;
        }
    }

    // 🧪 Diagnostic Inbox
    const diagBtn = document.getElementById('diag-inbox-btn');
    const diagResult = document.getElementById('diag-result');
    if (diagBtn && diagResult) {
        diagBtn.addEventListener('click', () => {
            diagBtn.disabled = true;
            diagBtn.innerHTML = "<span>⏳</span> Test en cours...";
            diagResult.style.display = "block";
            diagResult.textContent = "Envoi du test...";

            chrome.runtime.sendMessage({ action: "diagInbox" }, (response) => {
                diagBtn.disabled = false;
                diagBtn.innerHTML = "<span>🧪</span> Tester l'API Inbox";
                if (response) {
                    diagResult.textContent = JSON.stringify(response, null, 2);
                } else {
                    diagResult.textContent = "❌ Aucune réponse (extension déchargée ?)";
                }
            });
        });
    }
});
