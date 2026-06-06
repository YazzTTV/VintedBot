// Agent 3 : Le Cerveau (Background Service Worker) — GHOST V4
// Intégration du moteur REST API natif (Retro-Ingénierie Vinteo)
importScripts('vinted-rest-api.js');

// Nettoyage automatique du cache inbox au démarrage pour réparer l'historique existant
chrome.storage.local.get(null, (items) => {
    const keysToRemove = Object.keys(items).filter(key => key.startsWith('inboxCache_'));
    if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("🤖 Vinted Pro Bot GHOST V4 installé !");
    chrome.storage.local.set({ botActive: false, activityLog: [] });
});

// --- GESTION DES SYNCHRONISATIONS ET COOLDOWNS ---
const syncState = {
    lastBalanceSync: {}, // Format: { botId: timestamp }
    lastGhostScan: 0,
    isBalanceSyncing: {}, // Format: { botId: boolean }
    isGhostScanning: false,
    queuedReplies: [] // Format: [convId1, convId2, ...] pour éviter les doublons de réponses IA
};

// --- PERSISTENT DASHBOARD WINDOW ---
// Ouvre une fenêtre indépendante (type: popup) qui ne se ferme pas toute seule.
let popupWindowId = null;

chrome.action.onClicked.addListener(async () => {
    if (popupWindowId !== null) {
        try {
            // Vérifier si la fenêtre existe toujours et la mettre au premier plan
            const win = await chrome.windows.get(popupWindowId);
            if (win) {
                await chrome.windows.update(popupWindowId, { focused: true });
                return;
            }
        } catch (e) {
            // La fenêtre a été fermée par l'utilisateur, on réinitialise l'ID
            popupWindowId = null;
        }
    }

    // Créer la nouvelle fenêtre flottante autonome
    const win = await chrome.windows.create({
        url: chrome.runtime.getURL("popup/popup.html"),
        type: "popup",
        width: 400,
        height: 700,
        focused: true
    });
    popupWindowId = win.id;
});

/**
 * 🎯 Utilité critique : Sélectionne l'onglet Vinted optimal de manière intelligente.
 * Priorise l'onglet actif de la fenêtre courante pour garantir que c'est la session active de l'utilisateur.
 */
async function getOptimalVintedTab() {
    const urls = [
        "*://*.vinted.fr/*", "*://*.vinted.com/*", "*://*.vinted.nl/*", 
        "*://*.vinted.be/*", "*://*.vinted.de/*", "*://*.vinted.es/*", "*://*.vinted.it/*"
    ];
    
    // 1. Onglet actif dans la fenêtre en cours
    const currentActive = await new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true, url: urls }, resolve);
    });
    if (currentActive && currentActive.length > 0) return currentActive[0];

    // 2. Onglet actif dans n'importe quelle fenêtre
    const anyActive = await new Promise(resolve => {
        chrome.tabs.query({ active: true, url: urls }, resolve);
    });
    if (anyActive && anyActive.length > 0) return anyActive[0];

    // 3. Premier onglet ouvert (en évitant les onglets déchargés/suspendus si possible)
    const allVinted = await new Promise(resolve => {
        chrome.tabs.query({ url: urls }, resolve);
    });
    if (allVinted && allVinted.length > 0) {
        const viable = allVinted.filter(t => !t.discarded);
        return viable.length > 0 ? viable[0] : allVinted[0];
    }
    return null;
}

/**
 * 🔑 Récupère l'identité Vinted par injection directe (contourne le content script).
 * Résout le problème critique sur Arc Browser où les content scripts ne se chargent pas.
 */
async function fetchUserIdentityDirect(tabId) {
    const injection = await chrome.scripting.executeScript({
        target: { tabId },
        func: async () => {
            try {
                const r = await fetch("/api/v2/users/current", { 
                    credentials: "include", 
                    headers: { "Accept": "application/json" } 
                });
                if (!r.ok) return { success: false, error: "HTTP " + r.status };
                const data = await r.json();
                const user = data.user || data;
                return { 
                    success: true, 
                    username: user.login || user.username, 
                    id: String(user.id) 
                };
            } catch (e) {
                return { success: false, error: e.message };
            }
        }
    });
    return injection?.[0]?.result || { success: false, error: "Injection returned null" };
}

// === MESSAGE HANDLERS ===
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Anciens test handlers retirés

    // PONT REST API : Permet de lire le solde financier à la demande
    if (request.action === "fetchRestWalletBalance") {
        fetchWalletBalance()
            .then(balance => sendResponse({ success: true, balance: balance }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Indique une réponse asynchrone
    }
    // PONT REST API : Lancer un reposte furtif d'un article
    if (request.action === "repostItemREST") {
        repostItemREST(request.itemId, request.options || {})
            .then(res => {
                saveLog(`🔄 Article #${request.itemId} reposté`);
                sendResponse(res);
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (request.action === "getBotStatus") {
        chrome.storage.local.get(['botActive'], (result) => {
            sendResponse({ status: result.botActive });
        });
        return true;
    }

    // Relayer les logs de messages.js ici dans le Service Worker
    if (request.action === "ghostLog") {
        console.log("📡 [REMOTE]", request.log);
        sendResponse({ ok: true });
        return true;
    }

    if (request.action === "toggleBot") {
        chrome.storage.local.set({ botActive: request.botActive }, () => {
            console.log("🔄 Bot state:", request.botActive);
            
            // 🚨 PROTOCOLE D'ARRÊT D'URGENCE (NUCLEAIRE)
            if (!request.botActive) {
                console.warn("🚨 [EMERGENCY STOP] Déclenchement par l'utilisateur !");
                
                // 1. Vider immédiatement la file d'attente logicielle
                commandQueue.length = 0;
                isProcessingQueue = false;
                saveLog("🚨 Arrêt d'urgence : Actions annulées.");
                
                // 2. Terminer instantanément tous les onglets fantômes Vinted actifs (?ghost=1 ou ?gemini=1)
                chrome.tabs.query({}, (tabs) => {
                    const phantoms = tabs.filter(t => t.url && (t.url.includes("ghost=1") || t.url.includes("gemini=1")));
                    for (const tab of phantoms) {
                        chrome.tabs.remove(tab.id).catch(() => {});
                    }
                    if (phantoms.length > 0) {
                        saveLog(`🚨 ${phantoms.length} onglet(s) fantôme(s) fermé(s) d'urgence.`);
                    }
                });
            }
            
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === "checkNotifications") {
        console.log("🚀 [GHOST V4] Déclenchement manuel");
        runGhostScan(true);
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "checkGeminiMessages") {
        console.log("🤖 [GEMINI] Déclenchement manuel");
        runGeminiScan(true);
        sendResponse({ success: true });
        return true;
    }

    if (request.action === "downloadImage") {
        fetch(request.url)
            .then(r => r.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => sendResponse({ base64: reader.result });
                reader.readAsDataURL(blob);
            })
            .catch(e => sendResponse({ error: e.message }));
        return true;
    }

    // Réception des résultats du scan depuis le content script
    if (request.action === "ghostScanResults") {
        console.log("📊 [GHOST V4] Résultats reçus :", request.data);
        handleScanResults(request.data, sender.tab?.id);
        sendResponse({ success: true });
        return true;
    }

    // 🧪 Diagnostic Inbox : Capture brute SANS dépendre du content script
    if (request.action === "diagInbox") {
        (async () => {
            try {
                const optimalTab = await getOptimalVintedTab();
                if (!optimalTab) {
                    sendResponse({ success: false, error: "Aucun onglet Vinted trouvé", tabInfo: null });
                    return;
                }

                const tabInfo = {
                    id: optimalTab.id,
                    url: optimalTab.url,
                    title: optimalTab.title,
                    active: optimalTab.active,
                    discarded: optimalTab.discarded
                };

                // Test 0 : Vérifier si le content script répond (juste pour info)
                let contentScriptAlive = false;
                try {
                    const csRes = await new Promise((resolve) => {
                        const timeout = setTimeout(() => resolve(null), 3000);
                        chrome.tabs.sendMessage(optimalTab.id, { action: "getCsrfToken" }, (r) => {
                            clearTimeout(timeout);
                            resolve(r);
                        });
                    });
                    contentScriptAlive = !!csRes;
                } catch (e) {
                    contentScriptAlive = false;
                }

                // Test principal : Injection directe (contourne 100% le content script)
                const injection = await chrome.scripting.executeScript({
                    target: { tabId: optimalTab.id },
                    func: async () => {
                        try {
                            // A) Identité utilisateur
                            let userInfo = null;
                            try {
                                const ur = await fetch("/api/v2/users/current", { credentials: "include", headers: { "Accept": "application/json" } });
                                if (ur.ok) {
                                    const ud = await ur.json();
                                    const u = ud.user || ud;
                                    userInfo = { id: String(u.id), login: u.login, photo: u.photo?.url };
                                } else {
                                    userInfo = { error: "HTTP " + ur.status };
                                }
                            } catch (e) {
                                userInfo = { error: e.message };
                            }

                            // B) CSRF token
                            let csrf = null;
                            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                            if (csrfMeta && csrfMeta.content) csrf = csrfMeta.content;
                            if (!csrf) {
                                for (const script of document.querySelectorAll("script")) {
                                    const match = script.textContent?.match(/"csrf[_-]token"\s*[:]\s*"([^"]+)"/);
                                    if (match) { csrf = match[1]; break; }
                                }
                            }

                            // C) Test Inbox API
                            const headers = { "Accept": "application/json", "X-Money-Object": "true" };
                            if (csrf) headers["X-CSRF-Token"] = csrf;

                            const r = await fetch("/api/v2/inbox?per_page=5", { credentials: "include", headers });
                            const raw = await r.json();

                            let detailFetchResult = null;
                            if (raw.conversations && raw.conversations[0]) {
                                try {
                                    const firstId = raw.conversations[0].id;
                                    const dr = await fetch(`/api/v2/conversations/${firstId}`, { credentials: "include", headers });
                                    const dText = await dr.text();
                                    let dJson = null;
                                    try { dJson = JSON.parse(dText); } catch(e){}
                                    
                                    detailFetchResult = {
                                        targetId: firstId,
                                        httpStatus: dr.status,
                                        httpOk: dr.ok,
                                        rawLength: dText.length,
                                        hasMessages: !!(dJson?.conversation?.messages || dJson?.messages),
                                        sample: dText.substring(0, 200)
                                    };
                                } catch (errD) {
                                    detailFetchResult = { error: errD.message };
                                }
                            }

                            // D) Test Notifications API (Likes) - RECHERCHE DYNAMIQUE DU BON ENDPOINT
                            let notifsFetchResult = {};
                            const possibleEndpoints = [
                                "/api/v2/notifications",
                                "/api/v2/users/notifications",
                                "/api/v2/user_notifications",
                                "/api/v2/activities",
                                "/api/v2/newsfeed",
                                "https://api." + window.location.hostname.replace("www.", "") + "/inbox-notifications/v1/notifications?page=1&per_page=20",
                                "https://api.www.vinted.com/inbox-notifications/v1/notifications?page=1&per_page=20",
                                "https://api.vinted.fr/inbox-notifications/v1/notifications?page=1&per_page=20"
                            ];

                            for (const ep of possibleEndpoints) {
                                try {
                                    const notifRes = await fetch(ep, { credentials: "include", headers });
                                    notifsFetchResult[ep] = { status: notifRes.status };
                                    if (notifRes.ok) {
                                        const notifRaw = await notifRes.json();
                                        // Chercher dans quelles clés sont stockés les items (notifications, activities, etc.)
                                        let items = [];
                                        if (Array.isArray(notifRaw)) items = notifRaw;
                                        else if (notifRaw.notifications) items = notifRaw.notifications;
                                        else if (notifRaw.activities) items = notifRaw.activities;
                                        else if (notifRaw.items) items = notifRaw.items;
                                        
                                        const likes = items.filter(n => n.type === "ItemFavorited" || n.type === "bundle_created" || (n.action && n.action.includes("favorite")));
                                        
                                        notifsFetchResult[ep].success = true;
                                        notifsFetchResult[ep].count = items.length;
                                        notifsFetchResult[ep].likesCount = likes.length;
                                        notifsFetchResult[ep].keys = Object.keys(notifRaw);
                                        // On échantillonne les 3 premières notifications QUEL QUE SOIT LE TYPE pour voir la structure
                                        notifsFetchResult[ep].sample = items.slice(0, 3);
                                    }
                                } catch (e) {
                                    notifsFetchResult[ep] = { error: e.message };
                                }
                            }

                            return {
                                user: userInfo,
                                csrf: csrf ? csrf.substring(0, 10) + "..." : null,
                                hasMeta: !!csrfMeta,
                                inbox: {
                                    httpStatus: r.status,
                                    httpOk: r.ok,
                                    responseKeys: Object.keys(raw),
                                    hasConversations: !!raw.conversations,
                                    conversationCount: Array.isArray(raw.conversations) ? raw.conversations.length : "N/A",
                                    firstConv: Array.isArray(raw.conversations) && raw.conversations[0] 
                                        ? { id: raw.conversations[0].id, opposite_user: raw.conversations[0].opposite_user?.login }
                                        : null,
                                    rawSample: JSON.stringify(raw).substring(0, 600),
                                    detailTest: detailFetchResult
                                },
                                notifications: notifsFetchResult,
                                pageUrl: window.location.href
                            };
                        } catch (e) {
                            return { error: e.message, stack: e.stack?.substring(0, 200) };
                        }
                    }
                });

                const result = injection?.[0]?.result;

                // Récupérer les logs récents pour savoir EXACTEMENT ce qui s'est passé lors de la synchro
                chrome.storage.local.get(['activityLog'], (resLog) => {
                    sendResponse({
                        success: true,
                        contentScriptAlive,
                        tabInfo,
                        activityLog: resLog.activityLog || [],
                        data: result || { error: "Injection returned null" }
                    });
                });
            } catch (e) {
                sendResponse({ success: false, error: e.message });
            }
        })();
        return true;
    }

    // Déclenchement manuel de la synchronisation complète (Compta + Inbox + Dressing)
    if (request.action === "triggerManualSync") {
        console.log("🚀 [SYNC] Déclenchement manuel demandé par la popup (Complet).");
        
        (async () => {
            const errors = [];
            let successCount = 0;

            // Étape 1 : Synchroniser le Solde (DOM plan B)
            try {
                await syncAccountBalanceToManager(true);
                successCount++;
            } catch (err) {
                console.error("⚠️ [SYNC] Échec étape Portefeuille :", err.message);
                errors.push(`Portefeuille: ${err.message}`);
                saveLog(`❌ Portefeuille: ${err.message.substring(0, 25)}...`);
            }
            
            // Étape 2 : Synchroniser les Ventes (Injection Directe)
            try {
                await syncVintedOrdersToManager();
                successCount++;
            } catch (err) {
                console.error("⚠️ [SYNC] Échec étape Commandes :", err.message);
                errors.push(`Commandes: ${err.message}`);
                saveLog(`❌ Commandes: ${err.message.substring(0, 25)}...`);
            }
            
            // Étape 3 : Synchroniser l'Inbox (Nouveau)
            try {
                await syncVintedInboxToManager();
                successCount++;
            } catch (err) {
                console.error("⚠️ [SYNC] Échec étape Inbox :", err.message);
                errors.push(`Inbox: ${err.message}`);
                saveLog(`❌ Inbox: ${err.message.substring(0, 25)}...`);
            }
            
            // Étape 4 : Synchroniser les Métriques Dressing (Nouveau)
            try {
                await syncVintedItemMetricsToManager();
                successCount++;
            } catch (err) {
                console.error("⚠️ [SYNC] Échec étape Métriques :", err.message);
                errors.push(`Métriques: ${err.message}`);
                saveLog(`❌ Métriques: ${err.message.substring(0, 25)}...`);
            }
            
            if (successCount > 0) {
                sendResponse({ 
                    success: true, 
                    partial: successCount < 4, 
                    errors: errors 
                });
            } else {
                sendResponse({ 
                    success: false, 
                    error: "Toutes les étapes ont échoué. Erreurs : " + errors.join(" | ") 
                });
            }
        })();
        
        return true;
    }

    // Exploration API pour la Phase 3 (Capture des structures JSON réelles via Injection Directe)
    if (request.action === "exploreApi") {
        console.log("🔬 [EXPLORER] Démarrage de l'exploration API dynamique (Méthode Same-Origin)...");
        
        (async () => {
            try {
                // 1. Trouver l'onglet Vinted actif pour exécuter le fetch "localement"
                const tabs = await chrome.tabs.query({ url: "*://*.vinted.fr/*" });
                const activeTab = tabs[0];
                
                if (!activeTab) {
                    throw new Error("Aucun onglet Vinted.fr n'est ouvert. Merci d'ouvrir ton onglet Vinted avant de cliquer !");
                }
                
                console.log(`🔬 [EXPLORER] Injection du script furtif dans l'onglet #${activeTab.id}...`);
                
                // 2. Exécuter le fetch DIRECTEMENT dans le contexte de la page (Bypasse Cloudflare & même origine)
                const injectionResults = await chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    func: async () => {
                        // Les endpoints exacts découverts dans le code source de Vinteo !
                        const endpoints = {
                            walletHistory: "/api/v2/wallet/history",
                            myOrders: "/api/v2/my_orders?type=sold&status=all&per_page=50",
                            inbox: "/api/v2/inbox?per_page=10"
                        };
                        
                        // Lecture du CSRF Token natif présent dans le DOM de la page
                        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                        const csrfToken = csrfMeta ? csrfMeta.content : null;
                        
                        // En-têtes requis par Vinted (notamment X-Money-Object issu de Vinteo)
                        const headers = {
                            "Accept": "application/json",
                            "X-Money-Object": "true"
                        };
                        if (csrfToken) {
                            headers["X-CSRF-Token"] = csrfToken;
                        }
                        
                        const scanOutput = {};
                        
                        for (const [key, url] of Object.entries(endpoints)) {
                            try {
                                const r = await fetch(url, { credentials: "include", headers });
                                scanOutput[key] = r.ok ? await r.json() : { status: r.status, error: `HTTP ${r.status}` };
                            } catch (e) {
                                scanOutput[key] = { error: e.message };
                            }
                        }
                        
                        return scanOutput;
                    }
                });
                
                // 3. Extraire le résultat de l'injection
                const rawData = injectionResults?.[0]?.result;
                if (!rawData) {
                    throw new Error("Le script d'injection n'a renvoyé aucune donnée.");
                }
                
                const exploreDump = {
                    timestamp: new Date().toISOString(),
                    ...rawData
                };
                
                // 4. Pousser ce dump vers le Manager local
                console.log("🔬 [EXPLORER] Transmission du JSON brut Same-Origin vers le serveur local...");
                const captureRes = await fetch("http://localhost:3000/api/comptabilite/capture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(exploreDump)
                });
                
                if (!captureRes.ok) {
                    const errTxt = await captureRes.text();
                    throw new Error(`Le serveur local Next.js a rejeté l'envoi : ${errTxt}`);
                }
                
                console.log("🎉 [EXPLORER] Capture réussie et sauvegardée en local via Injection !");
                sendResponse({ success: true });
            } catch (err) {
                console.error("❌ [EXPLORER] Échec critique :", err);
                sendResponse({ success: false, error: err.message });
            }
        })();
        
        return true;
    }

    // Déclenchement manuel de l'auto-like de 2 articles
    if (request.action === "triggerAutoLike") {
        console.log("🚀 [AUTO-LIKE] Déclenchement manuel demandé par l'utilisateur.");
        addToCommandQueue({
            id: `manual_auto_like_${Date.now()}`,
            execute: async () => {
                try {
                    await runAutoLike(true);
                } catch (e) {
                    console.error("❌ [AUTO-LIKE QUEUE] Échec :", e.message);
                }
            }
        });
        sendResponse({ success: true });
        return true;
    }

    // Déclenchement manuel du warm-up comportemental passif
    if (request.action === "triggerManualWarmup") {
        console.log("🚀 [WARMUP] Déclenchement manuel demandé par l'utilisateur.");
        runWarmup(true);
        sendResponse({ success: true });
        return true;
    }
});

// ==========================================
// OUTILS DE GESTION SHEIN (AJOUT AU PANIER)
// ==========================================

// --- Sauvegarde des logs d'achats Shein ---
async function saveSheinLog(logEntry) {
    try {
        const res = await chrome.storage.local.get(['sheinLogs']);
        let logs = res.sheinLogs || [];
        logs.push({ ...logEntry, timestamp: Date.now() });
        // Garder seulement les 50 derniers logs
        if (logs.length > 50) logs = logs.slice(-50);
        await chrome.storage.local.set({ sheinLogs: logs });
    } catch (e) {
        console.error("Erreur sauvegarde log Shein:", e);
    }
}

async function handleSheinCart(url, taille, venteId) {
    if (!url) throw new Error("URL Shein manquante");
    console.log(`[EXTENSION] Ouverture de ${url} pour ajout au panier...`);
    
    // 1. Ouvrir l'onglet (rendu actif pour que l'utilisateur puisse voir lors du test)
    const newTab = await new Promise((resolve) => {
        chrome.tabs.create({ url, active: true }, (tab) => resolve(tab));
    });

    // 2. Attendre un peu que le DOM de base soit là
    await new Promise(r => setTimeout(r, 2000));

    // 3. Boucle de Polling depuis le Background
    let attempts = 0;
    const maxAttempts = 15;
    let finalRes = null;

    try {
        while (attempts < maxAttempts) {
            attempts++;
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: newTab.id },
                    world: "MAIN", // CRITIQUE : S'exécuter dans le contexte principal pour que Vue/React accepte les clics !
                    func: (targetTaille) => {
                        try {
                            const closeBtns = document.querySelectorAll('.c-coupon-box .she-close, .cookie-banner .close-btn');
                            closeBtns.forEach(btn => btn.click());

                            let sizeClicked = false;

                            if (targetTaille) {
                                if (window.__botSizeClicked) {
                                    sizeClicked = true;
                                } else {
                                    const tgt = targetTaille.toUpperCase();
                                    
                                    // Ciblage exact calqué sur les clics manuels de l'utilisateur
                                    const allSizeElements = Array.from(document.querySelectorAll('p.product-intro__size-radio-inner, span.size-radio__inner-one, div.product-intro__size-radio'));
                                    let matchingSize = allSizeElements.find(el => {
                                        if (el.children.length > 2) return false; 
                                        const text = el.textContent?.trim().toUpperCase() || "";
                                        if (text.length === 0 || text.length > 15) return false; 
                                        return text === tgt || text === `(${tgt})` || text.includes(`(${tgt})`) || new RegExp(`\\b${tgt}\\b`).test(text);
                                    });

                                    if (matchingSize) {
                                        // Clic simplissime direct sur le noeud texte, exactement comme la souris de l'utilisateur
                                        matchingSize.click();
                                        
                                        // Si le parent est un div radio, on le clique aussi par sécurité
                                        const parentRadio = matchingSize.closest('div.product-intro__size-radio');
                                        if (parentRadio && parentRadio !== matchingSize) {
                                            parentRadio.click();
                                        }

                                        window.__botSizeClicked = true;
                                        return { success: false, state: "SIZE_CLICKED_WAITING_STATE", sizeHTML: matchingSize.outerHTML };
                                    } else {
                                        return { success: false, state: "WAITING_FOR_SIZE_TO_RENDER" };
                                    }
                                }
                            } else {
                                sizeClicked = true;
                            }

                            // Ciblage calqué sur le clic manuel: la balise DIV contenant le texte dans le bouton
                            let addBtn = document.querySelector('#ProductDetailAddBtn div.productAddBtn__text, button#ProductDetailAddBtn');
                            
                            if (!addBtn) {
                                addBtn = Array.from(document.querySelectorAll('button.add-cart-btn, div[role="button"]'))
                                    .find(b => {
                                        const t = b.textContent?.toUpperCase() || "";
                                        if (t.includes('PROFIL') || t.includes('CONNEXION')) return false;
                                        return t.includes('AJOUTER') || t.includes('ADD TO CART');
                                    });
                            }
                            
                            if (addBtn) {
                                window.__botSizeClicked = false;
                                
                                // Clic simplissime direct
                                addBtn.click();
                                
                                return { success: true, sizeFound: sizeClicked, state: "CLICKED" };
                            }
                            
                            return { success: false, state: "WAITING", sizeFound: sizeClicked };
                        } catch (err) {
                            return { success: false, error: err.message };
                        }
                    },
                    args: [taille || null]
                });

                const res = results[0]?.result;
                
                // Si undefined ou null, cela signifie que l'injection a bugué sans throw
                if (!res) {
                    console.warn("[SHEIN] res est undefined, results=", results);
                    // On continue le polling
                } else if (res.success) {
                    finalRes = res;
                    break;
                } else if (res.error) {
                    // Erreur technique dans la page
                    throw new Error("Erreur injectée: " + res.error);
                }

            } catch (injectionErr) {
                console.error("[SHEIN] Erreur d'injection:", injectionErr);
                // On peut ignorer et réessayer (ex: frame removed pendant reload)
            }

            // Attente 1 seconde avant le prochain poll
            await new Promise(r => setTimeout(r, 1000));
        }

        if (finalRes && finalRes.success) {
            // Log succès
            await saveSheinLog({
                url: url,
                taille: taille,
                venteId: venteId,
                status: "SUCCESS"
            });
            return finalRes;
        } else {
            const errObj = finalRes && finalRes.error ? finalRes.error : "Bouton Ajouter au panier introuvable";
            
            // Log erreur
            await saveSheinLog({
                url: url,
                taille: taille,
                venteId: venteId,
                status: "ERROR",
                error: errObj
            });
            
            throw new Error(`Echec de l'ajout au panier Shein: ${errObj}`);
        }
    } catch (error) {
        // Log erreur globale
        await saveSheinLog({
            url: url,
            taille: taille,
            venteId: venteId,
            status: "ERROR",
            error: error.message
        });
        
        console.error("[SHEIN CART ERROR]", error);
        throw error;
    }
}

// ===================================================================
// 📋 COMMAND QUEUE (File d'attente séquentielle thread-safe)
// ===================================================================
const commandQueue = [];
let isProcessingQueue = false;

/**
 * Ajoute une tâche d'automation visuelle à la file d'attente et lance le traitement.
 * @param {Object} task - Contient { id, execute: async function }
 */
function addToCommandQueue(task) {
    console.log(`📥 [QUEUE] Ajout de la tâche : ${task.id}`);
    commandQueue.push(task);
    processNextCommand();
}

async function processNextCommand() {
    if (isProcessingQueue || commandQueue.length === 0) return;
    
    isProcessingQueue = true;
    const task = commandQueue.shift();
    
    console.log(`🚀 [QUEUE] Démarrage : ${task.id} (${commandQueue.length} en attente)`);
    
    try {
        await task.execute();
        console.log(`✅ [QUEUE] Tâche terminée : ${task.id}`);
    } catch (error) {
        console.error(`❌ [QUEUE] Échec de la tâche ${task.id} :`, error.message);
    }
    
    // Délais de sécurité entre deux interactions visuelles pour la fluidité du navigateur (5s)
    setTimeout(() => {
        isProcessingQueue = false;
        processNextCommand();
    }, 5000);
}

// Run once on startup so we don't have to wait 1 minute
setTimeout(() => {
    console.log("🚀 Startup initial scan...");
    pollVintedApiRoutine().catch(e => console.error(e));
}, 5000);

// === ALARMES DÉCALÉES (30s Polling) ===
const POLL_ALARM_A = "vintedPollAlarmA";
const POLL_ALARM_B = "vintedPollAlarmB";
const WARMUP_ALARM_NAME = "vintedWarmupAlarm";
const METRICS_ALARM_NAME = "vintedSyncAlarm";

// Initialisation intelligente des alarmes (anti-reset au réveil du SW)
chrome.alarms.getAll((alarms) => {
    if (!alarms.find(a => a.name === POLL_ALARM_A)) {
        // Alarme A: Commence dans 1 min, s'exécute chaque minute
        chrome.alarms.create(POLL_ALARM_A, { delayInMinutes: 1, periodInMinutes: 1 });
    }
    if (!alarms.find(a => a.name === POLL_ALARM_B)) {
        // Alarme B: Commence dans 1.5 min, s'exécute chaque minute. Résultat = Exécution toutes les 30 secondes.
        chrome.alarms.create(POLL_ALARM_B, { delayInMinutes: 1.5, periodInMinutes: 1 });
    }
    if (!alarms.find(a => a.name === METRICS_ALARM_NAME)) {
        chrome.alarms.create(METRICS_ALARM_NAME, { periodInMinutes: 5 });
    }
    if (!alarms.find(a => a.name === WARMUP_ALARM_NAME)) {
        const randomDelay = 120 + Math.random() * 60;
        chrome.alarms.create(WARMUP_ALARM_NAME, { delayInMinutes: randomDelay });
    }
});



chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === POLL_ALARM_A || alarm.name === POLL_ALARM_B) {
        console.log("⏰ [POLL] Réveil du cycle API (30s)...");
        pollVintedApiRoutine().catch(err => console.error("❌ Erreur Polling API :", err));
    }
    
    if (alarm.name === METRICS_ALARM_NAME) {
        console.log("⏰ [ALARM] Lancement Synchro Balance, Inbox + Dressing...");
        (async () => {
            try {
                await syncAccountBalanceToManager();
                await syncVintedInboxToManager();
                await syncVintedItemMetricsToManager();
            } catch (err) {
                console.error("❌ Erreur synchro :", err);
            }
        })();
    }

    if (alarm.name === WARMUP_ALARM_NAME) {
        console.log("⏰ [ALARM] Réveil automatique Warm-up");
        runWarmup(false);
        const randomDelay = 120 + Math.random() * 60;
        chrome.alarms.create(WARMUP_ALARM_NAME, { delayInMinutes: randomDelay });
    }
});

// === ROUTINE DE POLLING API PRINCIPALE ===
let isPollingRoutineRunning = false;

async function pollVintedApiRoutine() {
    if (isPollingRoutineRunning) return;
    isPollingRoutineRunning = true;
    
    try {
        // 1. Lire la file d'attente du Manager (si on a des actions à faire)
        await pollActionQueueFromManager();
        
        // 2. Traiter les auto-réponses Gemini (Inbox)
        await runGeminiScan(false);
        
        // 3. Traiter les Likes via API (Notifications)
        await fetchNotificationsAPI();
        
    } catch (err) {
        console.error("❌ [POLL ROUTINE] Erreur critique :", err);
    } finally {
        isPollingRoutineRunning = false;
    }
}

// === LIKES / NOTIFICATIONS API (Remplace le Ghost Scan) ===
async function fetchNotificationsAPI() {
    // Anti-doublon / Verrou
    const now = Date.now();
    const cooldownMs = 25000; // Ne pas fetcher plus d'une fois toutes les 25s
    if (now - syncState.lastGhostScan < cooldownMs) return;
    syncState.lastGhostScan = now;

    console.log("🕵️ [API SCAN] Lecture invisible des notifications...");
    
    const optimalTab = await getOptimalVintedTab();
    if (!optimalTab) return;
    const tabId = optimalTab.id;

    const userRes = await fetchUserIdentityDirect(tabId);
    if (!userRes || !userRes.success) return;

    // Injection du fetch API dans l'onglet Vinted (Same-Origin)
    const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: async () => {
            try {
                const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                const headers = { "Accept": "application/json", "X-Money-Object": "true" };
                if (csrfMeta) headers["X-CSRF-Token"] = csrfMeta.content;

                const apiUrl = `https://api.${window.location.hostname}/inbox-notifications/v1/notifications?page=1&per_page=20`;
                const res = await fetch(apiUrl, { credentials: "include", headers });
                if (!res.ok) return { error: `HTTP ${res.status}` };
                const data = await res.json();
                
                let notifsArray = [];
                if (Array.isArray(data)) notifsArray = data;
                else if (data.notifications) notifsArray = data.notifications;
                else if (data.items) notifsArray = data.items;
                
                return { notifications: notifsArray };
            } catch (e) {
                return { error: e.message };
            }
        }
    });

    const notifsData = results && results[0] ? results[0].result : null;
    if (notifsData && notifsData.error) {
        console.error("❌ [API SCAN] Erreur fetch notifications :", notifsData.error);
        return;
    }

    if (!notifsData || !notifsData.notifications) return;

    // Traitement articles spy vendus (depuis les notifications API)
    const spySold = [];
    for (const notif of notifsData.notifications) {
        const text = ((notif.body || notif.title || '') + ' ' + (notif.link || '')).toLowerCase();
        if ((text.includes('vendu') || text.includes('sold')) &&
            (text.includes('aimé') || text.includes('favori') || text.includes('liked'))) {
            let itemId = notif.subject_id;
            if (!itemId && notif.link) {
                const m = notif.link.match(/item_id=(\d+)/) || notif.link.match(/\/items\/(\d+)/);
                if (m) itemId = m[1];
            }
            if (itemId) {
                spySold.push({ itemId: String(itemId), timestamp: Date.now() });
            }
        }
    }
    if (spySold.length > 0) {
        getManagerApiUrl().then(managerUrl => {
            const baseUrl = managerUrl.replace('/api/comptabilite/balance', '');
            spySold.forEach(sold => {
                fetch(`${baseUrl}/api/extension/spy/sold`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: sold.itemId, soldAt: sold.timestamp })
                }).catch(e => console.warn('[SPY SOLD] Erreur:', e.message));
            });
        });
    }

    // Charger la liste des utilisateurs contactés
    chrome.storage.local.get(['contactedUsers'], async (result) => {
        const contacted = result.contactedUsers || [];
        let dmSentCount = 0;
        const MAX_DM_PER_SCAN = 2; // Reduced from 3 to look more human

            for (const notif of notifsData.notifications) {
                // Types Vinted pour likes : ancien format (ItemFavorited) ou nouveau format API (entry_type 20)
                const nType = notif.type || notif.action || "";
                const isLike = (notif.entry_type === 20) || nType === "ItemFavorited" || nType.toLowerCase().includes("favorite") || nType === "bundle_created";
                
                if (!isLike) continue;

                // Extraction robuste du username et itemId (gère l'ancien et le nouveau format)
                let username = null;
                let itemId = null;
                let userId = null;

                if (notif.entry_type === 20) {
                    // Vinted place l'ID de l'acheteur dans le lien
                    if (notif.link) {
                        const mUser = notif.link.match(/user_id=(\d+)/);
                        if (mUser) userId = mUser[1];
                    }
                    if (!userId && notif.actor_id) userId = notif.actor_id;
                    // Nouveau format (api.www.vinted.com/inbox-notifications)
                    // Le username est systématiquement le premier mot du body
                    if (notif.body) username = notif.body.split(" ")[0];
                    itemId = notif.subject_id;
                    // Fallback itemId via le lien
                    if (!itemId && notif.link) {
                        const m = notif.link.match(/item_id=(\d+)/);
                        if (m) itemId = m[1];
                    }
                } else {
                    // Ancien format (/api/v2/notifications)
                    username = notif.user ? notif.user.login : (notif.bundle && notif.bundle.user ? notif.bundle.user.login : null);
                    itemId = notif.item ? notif.item.id : (notif.subject && notif.subject.id ? notif.subject.id : null);
                    userId = notif.user ? notif.user.id : (notif.bundle && notif.bundle.user ? notif.bundle.user.id : null);
                }
                
                if (!username || !itemId) continue;
                
                if (contacted.includes(username)) continue;

                if (dmSentCount >= MAX_DM_PER_SCAN) {
                    console.log(`🛑 [API SCAN] Limite de DM atteinte, on verra les autres au prochain cycle.`);
                    break;
                }

                // Envoyer le message d'approche via l'API (Injection) et vérifier rétroactivement
                const injectResults = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    world: "MAIN",
                    func: async (recipientLogin, itemId, recipientId) => {
                        let csrfToken = null;
                        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                        if (csrfMeta && csrfMeta.content) {
                            csrfToken = csrfMeta.content;
                        } else {
                            // Vinted SPA fallback
                            const scripts = document.querySelectorAll("script");
                            for (let s of scripts) {
                                if (s.textContent) {
                                    let c = s.textContent.match(/"CSRF_TOKEN\\?":\\?"([^"\\]+)\\?"/);
                                    if (c) { csrfToken = c[1]; break; }
                                    let m = s.textContent.match(/"csrf[_-]token"\s*[:,]\s*"([^"]+)"/);
                                    if (!m) m = s.textContent.match(/csrf[_-]token=([A-Za-z0-9+/=_-]+)/);
                                    if (m) { csrfToken = m[1]; break; }
                                }
                            }
                        }
                        
                        const headers = { "Accept": "application/json", "Content-Type": "application/json", "X-Money-Object": "true" };
                        if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

                        const anonMatch = document.cookie.match(/(?:^|;\s*)anon_id=([^;]+)/);
                        if (anonMatch) headers["X-Anon-Id"] = anonMatch[1];

                        try {
                            // 1. Créer la conversation avec ce user
                            // Si on n'a pas l'ID de l'utilisateur, on le cherche d'abord
                            if (!recipientId) {
                                const userRes = await fetch(`/api/v2/users?search_text=${recipientLogin}`);
                                if (userRes.ok) {
                                    const userData = await userRes.json();
                                    if (userData.users && userData.users.length > 0) {
                                        const u = userData.users.find(x => x.login.toLowerCase() === recipientLogin.toLowerCase());
                                        if (u) recipientId = u.id;
                                    }
                                }
                            }
                            
                            if (!recipientId) {
                                return { success: false, reason: "Impossible de trouver l'ID utilisateur pour " + recipientLogin };
                            }

                            const convRes = await fetch("/api/v2/conversations", {
                                method: "POST",
                                credentials: "include",
                                headers: headers,
                                body: JSON.stringify({
                                    initiator: "seller_enters_notification",
                                    item_id: Number(itemId),
                                    opposite_user_id: Number(recipientId)
                                })
                            });
                            
                            const convData = await convRes.json();
                            const convId = convData.conversation ? convData.conversation.id : null;
                            
                            if (!convRes.ok) {
                                return { error: `Conv HTTP ${convRes.status} (CSRF:${csrfToken ? csrfToken.substring(0,5)+'...' : 'NULL'}, Anon:${headers['X-Anon-Id'] ? 'OK' : 'NULL'}) : ${JSON.stringify(convData)}` };
                            }

                            if (convId) {
                                // 1.5. Vérifier rétroactivement s'il y a déjà des messages
                                const detailRes = await fetch(`/api/v2/conversations/${convId}`, {
                                    credentials: "include",
                                    headers: { "Accept": "application/json", "X-Money-Object": "true" }
                                });
                                
                                if (detailRes.ok) {
                                    const detailData = await detailRes.json();
                                    const convDetails = detailData.conversation || detailData;
                                    const messages = convDetails.messages || [];
                                    
                                    let alreadyMessaged = false;
                                    for (const m of messages) {
                                        const text = (m.entity ? m.entity.body : m.body) || "";
                                        if (text && typeof text === "string" && text.trim().length > 0) {
                                            if (!text.toLowerCase().includes("pour ta protection") && !text.toLowerCase().includes("coordonnées")) {
                                                alreadyMessaged = true;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if (alreadyMessaged) {
                                        return { skipped: true };
                                    }
                                }

                                // 2. Envoyer le message
                                const msgBody = "Bonjour ! 😊 J'ai vu que cet article vous plaisait. N'hésitez pas si vous avez des questions ou si vous souhaitez faire une offre !";
                                await fetch(`/api/v2/conversations/${convId}/replies`, {
                                    method: "POST",
                                    credentials: "include",
                                    headers: headers,
                                    body: JSON.stringify({
                                        reply: { body: msgBody }
                                    })
                                });
                                return { success: true };
                            }
                            return { error: "No convId" };
                        } catch (e) {
                            return { error: e.message };
                        }
                    },
                    args: [username, itemId, userId]
                });
                
                const res = injectResults && injectResults[0] ? injectResults[0].result : null;
                
                if (res && res.skipped) {
                    console.log(`⏭️ [API SCAN] Rattrapage : ${username} a déjà été contacté. Ignoré.`);
                } else if (res && !res.error) {
                    console.log(`⭐ [API SCAN] NOUVEAU like API de ${username} → Envoi DM invisible`);
                    saveLog(`⭐ DM (API) envoyé à ${username}`);
                    dmSentCount++;
                } else if (res && res.error) {
                    console.error(`❌ [API SCAN] Erreur DM pour ${username} :`, res.error);
                    saveLog(`❌ Erreur DM ${username} : ${res.error.substring(0, 50)}`);
                }

                contacted.push(username);
                
                // Délai aléatoire (8 à 15 secondes) entre deux DM pour faire très naturel
                const humanDelay = 8000 + Math.random() * 7000;
                await new Promise(r => setTimeout(r, humanDelay));
            }

        chrome.storage.local.set({ contactedUsers: contacted.slice(-300) });
    });
}

// === LOGGER (Thread-Safe Sequential Queue) ===
let logPromiseChain = Promise.resolve();

function saveLog(message, type = "INFO") {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    logPromiseChain = logPromiseChain.then(() => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['activityLog', 'lastDetectedUser', 'managerApiUrl'], async (result) => {
                const logs = result.activityLog || [];
                logs.push(`[${timestamp}] ${message}`);
                chrome.storage.local.set({ activityLog: logs.slice(-20) });

                // Pousser le log vers le Manager en arrière-plan
                try {
                    const botName = result.lastDetectedUser || "system";
                    const configuredUrl = result.managerApiUrl || DEFAULT_MANAGER_URL;
                    
                    let managerUrl;
                    if (configuredUrl.includes("/api/")) {
                        managerUrl = configuredUrl.substring(0, configuredUrl.indexOf("/api/")) + "/api/extension/logs";
                    } else {
                        // Fallback par defaut si on arrive pas a parser
                        managerUrl = configuredUrl.replace(/\/$/, "") + "/api/extension/logs";
                    }

                    fetch(managerUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            botAccountName: botName,
                            message: message,
                            type: type
                        })
                    }).catch(() => {});
                } catch (e) {
                    // Silencieux
                }

                resolve();
            });
        });
    });
}

// === CONFIGURATION SYNC MANAGER ===
// L'URL est stockée dans chrome.storage pour être configurable.
// Par défaut : localhost (dev). À changer via le popup ou manuellement.
const DEFAULT_MANAGER_URL = "https://vinted-manager-flame.vercel.app/api/comptabilite/balance";

async function getManagerApiUrl() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['managerApiUrl'], (result) => {
            resolve(result.managerApiUrl || DEFAULT_MANAGER_URL);
        });
    });
}

/**
 * 💸 Synchro Réelle : Ouvre la page Wallet en arrière-plan, scrape le solde, et le pousse au Manager.
 * Stratégie DOM car les endpoints API wallet sont protégés par Cloudflare.
 */
async function syncAccountBalanceToManager(force = false) {
    console.log("📡 [SYNC] Lancement de la synchronisation comptable...");
    try {
        // Étape 1 : Récupérer l'identité via un onglet Vinted existant
        const optimalTab = await getOptimalVintedTab();

        if (!optimalTab) {
            throw new Error("Aucun onglet Vinted ouvert. Veuillez ouvrir Vinted dans votre navigateur avant de lancer la synchronisation !");
        }

        const tabId = optimalTab.id;
        const tabUrl = new URL(optimalTab.url);
        const baseOrigin = tabUrl.origin; // ex: https://www.vinted.fr

        // Récupérer l'identité (injection directe, contourne le content script pour Arc)
        const userRes = await fetchUserIdentityDirect(tabId);

        if (!userRes || !userRes.success) {
            throw new Error("Impossible de détecter votre identité Vinted. Assurez-vous d'être connecté à votre compte !");
        }

        const username = userRes.username;
        const vintedId = userRes.id;
        console.log(`👤 [SYNC] Identité détectée : ${username} (${vintedId})`);
        chrome.storage.local.set({ lastDetectedUser: username });

        // --- COOLDOWN & LOCKING ---
        const now = Date.now();
        const lastSync = syncState.lastBalanceSync[vintedId] || 0;
        const cooldownMs = 15 * 60 * 1000; // 15 minutes
        
        if (!force && (now - lastSync < cooldownMs)) {
            const remainingMins = Math.ceil((cooldownMs - (now - lastSync)) / 60000);
            console.log(`⏭️ [SYNC] Cooldown actif pour ${username} (${remainingMins} min restantes). Ignoré.`);
            return;
        }
        
        if (syncState.isBalanceSyncing[vintedId]) {
            console.warn(`⏳ [SYNC] Une synchronisation est déjà en cours pour ${username}. Abandon.`);
            return;
        }

        // Étape 2 : Ouverture de l'onglet Wallet (Furtif)
        syncState.isBalanceSyncing[vintedId] = true;
        
        try {
            console.log(`💸 [SYNC] Ouverture du portefeuille Vinted (${baseOrigin}/wallet/balance)...`);
            const walletTab = await new Promise((resolve) => {
                chrome.tabs.create({ url: `${baseOrigin}/wallet/balance`, active: false }, resolve);
            });

            const waitForLoad = (tabId) => new Promise((resolve) => {
                const listener = (changedTabId, info) => {
                    if (changedTabId === tabId && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
                setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    resolve();
                }, 15000);
            });

            await waitForLoad(walletTab.id);
            await new Promise(r => setTimeout(r, 3000)); // Pause rendu

            // Vérifier si c'est un 404 ou si la page n'existe pas
            let pageCheck = await chrome.scripting.executeScript({
                target: { tabId: walletTab.id },
                func: () => {
                    const text = document.body?.innerText || "";
                    return text.includes("n'existe pas") || text.includes("n'existe plus") || document.title.includes("404");
                }
            });

            if (pageCheck?.[0]?.result) {
                console.warn("⚠️ [SYNC] URL /wallet/balance inexistante (404). Tentative sur le fallback /settings/payments...");
                await new Promise(resolve => {
                    chrome.tabs.update(walletTab.id, { url: `${baseOrigin}/settings/payments` }, resolve);
                });
                await waitForLoad(walletTab.id);
                await new Promise(r => setTimeout(r, 3000));
            }

            // Étape 3 : Scraper le solde depuis le DOM
            console.log("🔍 [SYNC] Scraping du solde depuis la page active...");
            const scrapeResults = await chrome.scripting.executeScript({
                target: { tabId: walletTab.id },
                func: () => {
                    const result = { available: 0, pending: 0, raw: "", url: window.location.href };
                    result.raw = document.body?.innerText?.substring(0, 2000) || "";
                    
                    // Stratégie 1 : Chercher les montants en Euros
                    const allText = document.body?.innerText || "";
                    
                    // Regex pour matcher les montants formatés (ex: "12,50 €" ou "0,00 €")
                    const euroMatches = allText.match(/(\d+[.,]\d{2})\s*[€$]/g) || [];
                    
                    if (euroMatches.length > 0) {
                        // Le premier montant est généralement le dispo
                        result.available = parseFloat(euroMatches[0].replace(",", ".").replace(/[^0-9.]/g, ""));
                        if (euroMatches.length > 1) {
                            // Le second montant est généralement le "En attente"
                            result.pending = parseFloat(euroMatches[1].replace(",", ".").replace(/[^0-9.]/g, ""));
                        }
                    }

                    // Stratégie 2 : Vinted utilise parfois des classes ou ID spécifiques
                    const balanceEl = document.querySelector('[data-testid*="balance"], [data-testid*="wallet"], .wallet-amount, h2, h1');
                    
                    return result;
                }
            });

            // Fermer l'onglet wallet
            chrome.tabs.remove(walletTab.id).catch(() => {});

            const walletData = scrapeResults?.[0]?.result;
            if (!walletData) {
                throw new Error("Impossible d'extraire le solde de votre portefeuille (erreur de scraping).");
            }

            console.log(`💰 [SYNC] Solde scrappé depuis ${walletData.url} : Dispo=${walletData.available}€, Attente=${walletData.pending}€`);
            if (walletData.available === 0 && walletData.pending === 0) {
                console.log("📄 [SYNC] Contenu brut page pour analyse :", walletData.raw?.substring(0, 500));
            }

            // Étape 4 : Pousser au Manager API (Mécanisme intelligent "Dual-Sync")
            const payload = {
                vintedAccountId: vintedId,
                vintedUsername: username,
                balancePending: walletData.pending,
                balanceAvailable: walletData.available
            };

            const configuredUrl = await getManagerApiUrl();
            const urlsToTry = [];
            
            if (configuredUrl.includes("vercel.app")) {
                urlsToTry.push("http://localhost:3000/api/comptabilite/balance");
            }
            urlsToTry.push(configuredUrl);

            let success = false;
            let syncMessage = "";
            let lastError = null;

            console.log("📡 [SYNC] Démarrage de la cascade d'envoi API :", urlsToTry);

            for (const url of urlsToTry) {
                try {
                    console.log(`📡 [SYNC] Tentative vers ${url}...`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 4000); // Timeout rapide de 4s
                    
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        const syncResult = await res.json();
                        success = true;
                        syncMessage = `Réussite vers ${new URL(url).hostname}`;
                        console.log(`✅ [SYNC] Succès vers ${url} !`);
                        break; 
                    } else {
                        const errText = await res.text();
                        throw new Error(`HTTP ${res.status} : ${errText}`);
                    }
                } catch (e) {
                    console.warn(`⚠️ [SYNC] Échec vers ${url} :`, e.name === 'AbortError' ? "Timeout (Serveur hors-ligne)" : e.message);
                    lastError = e;
                }
            }

            if (!success) {
                throw new Error(`Le Manager n'a pas pu être joint (ni Local, ni Vercel). Dernier échec : ${lastError?.message || "Inconnu"}`);
            }

            console.log(`🎉 [SYNC] Comptabilité synchronisée avec succès ! (${syncMessage})`);
            saveLog(`💰 Solde Synchro (${walletData.available}€)`);
            
            // Mise à jour du dernier succès
            syncState.lastBalanceSync[vintedId] = Date.now();

        } finally {
            syncState.isBalanceSyncing[vintedId] = false;
        }

    } catch (error) {
        console.error("❌ [SYNC] Échec critique de synchronisation comptable :", error.message);
        throw error; 
    }
}

/**
 * 📦 Synchro Commandes : Récupère l'historique des ventes réelles via Injection Same-Origin,
 * et les pousse au Manager (Local & Production) avec cascade dual-sync.
 */
async function syncVintedOrdersToManager() {
    console.log("📦 [SYNC ORDERS] Lancement de la synchronisation des ventes réelles...");
    try {
        // 1. Trouver l'onglet Vinted actif
        const optimalTab = await getOptimalVintedTab();

        if (!optimalTab) {
            throw new Error("Aucun onglet Vinted ouvert. Impossible d'aspirer les commandes.");
        }

        const tabId = optimalTab.id;

        // 2. Récupérer l'identité (injection directe pour compatibilité Arc)
        const userRes = await fetchUserIdentityDirect(tabId);

        if (!userRes || !userRes.success) {
            throw new Error("Impossible de détecter votre identité Vinted.");
        }

        const username = userRes.username;
        const vintedId = userRes.id;
        chrome.storage.local.set({ lastDetectedUser: username });

        // 3. Injecter la requête Same-Origin furtive inspirée de Vinteo pour ramener les 50 dernières ventes
        console.log(`📦 [SYNC ORDERS] Injection de l'aspiration furtive dans l'onglet #${tabId}...`);
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: async () => {
                const url = "/api/v2/my_orders?type=sold&status=all&per_page=50";
                const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                const csrfToken = csrfMeta ? csrfMeta.content : null;
                
                const headers = {
                    "Accept": "application/json",
                    "X-Money-Object": "true"
                };
                if (csrfToken) {
                    headers["X-CSRF-Token"] = csrfToken;
                }
                
                try {
                    const r = await fetch(url, { credentials: "include", headers });
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    const data = await r.json();
                    return data.my_orders || data.orders || [];
                } catch (e) {
                    throw new Error(`Échec fetch Vinted : ${e.message}`);
                }
            }
        });

        const rawOrders = injectionResults?.[0]?.result;
        if (!rawOrders || !Array.isArray(rawOrders)) {
            throw new Error("L'aspiration n'a renvoyé aucune commande ou un format invalide.");
        }

        console.log(`📦 [SYNC ORDERS] Aspiration réussie : ${rawOrders.length} ventes trouvées. Cartographie...`);

        // 4. Cartographie vers le modèle propre du Manager
        const mappedOrders = rawOrders.map(o => {
            // Extraction sécurisée du prix
            let priceNum = 0;
            if (o.price) {
                if (typeof o.price === "object") {
                    priceNum = parseFloat(o.price.amount ?? 0);
                } else {
                    priceNum = parseFloat(o.price || 0);
                }
            }

            // Identification des photos
            let itemPhoto = null;
            if (o.photo) {
                itemPhoto = typeof o.photo === "string" ? o.photo : (o.photo.url || o.photo.full_size_url);
            }

            let buyerPic = null;
            if (o.buyer && o.buyer.photo) {
                buyerPic = o.buyer.photo.url || o.buyer.photo.full_size_url;
            } else if (o.user && o.user.photo) {
                buyerPic = o.user.photo.url || o.user.photo.full_size_url;
            } else if (o.other_user && o.other_user.photo) {
                buyerPic = o.other_user.photo.url || o.other_user.photo.full_size_url;
            }

            const getBuyerLogin = (order) => {
                if (order.buyer && (order.buyer.login || order.buyer.name)) return order.buyer.login || order.buyer.name;
                if (order.user && (order.user.login || order.user.name)) return order.user.login || order.user.name;
                if (order.other_user && (order.other_user.login || order.other_user.name)) return order.other_user.login || order.other_user.name;
                return "Acheteur Inconnu";
            };

            return {
                id: String(o.transaction_id || o.id),
                title: o.title || "Article Vinted",
                price: priceNum,
                itemId: (o.item_id || (o.item && o.item.id)) ? String(o.item_id || o.item.id) : null,
                buyerLogin: getBuyerLogin(o),
                buyerPhoto: buyerPic,
                photoUrl: itemPhoto,
                status: o.status || "unknown",
                shippingStatus: o.shipping_order ? o.shipping_order.status : null,
                trackingCode: o.shipment ? o.shipment.tracking_code : null,
                createdAtVinted: o.created_at || o.date || new Date().toISOString()
            };
        });

        // 5. Pousser le dump via Cascade intelligente (Dual-Sync)
        const payload = {
            vintedAccountId: vintedId,
            vintedUsername: username,
            orders: mappedOrders
        };

        const configuredUrl = await getManagerApiUrl();
        const urlsToTry = [];
        
        // En déduire les endpoints orders correspondants
        if (configuredUrl.includes("vercel.app")) {
            urlsToTry.push("http://localhost:3000/api/comptabilite/orders");
            urlsToTry.push(configuredUrl.replace("/balance", "/orders"));
        } else {
            urlsToTry.push(configuredUrl.replace("/balance", "/orders"));
        }

        let success = false;
        let lastError = null;

        console.log("📡 [SYNC ORDERS] Démarrage de la cascade vers :", urlsToTry);

        for (const url of urlsToTry) {
            try {
                console.log(`📡 [SYNC ORDERS] Tentative vers ${url}...`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    success = true;
                    console.log(`✅ [SYNC ORDERS] Succès complet vers ${url} !`);
                    break;
                } else {
                    const errTxt = await res.text();
                    throw new Error(`HTTP ${res.status} : ${errTxt}`);
                }
            } catch (e) {
                console.warn(`⚠️ [SYNC ORDERS] Échec vers ${url} :`, e.message);
                lastError = e;
            }
        }

        if (!success) {
            throw new Error(`Le Manager n'a pas pu enregistrer les commandes : ${lastError?.message}`);
        }

        saveLog(`📦 ${mappedOrders.length} Ventes Synchros`);

    } catch (err) {
        console.error("❌ [SYNC ORDERS] Échec :", err.message);
        throw err;
    }
}

/**
 * 💬 Synchro Inbox : Récupère les discussions et offres actives par injection,
 * et les pousse au Manager pour centralisation.
 */
async function syncVintedInboxToManager() {
    console.log("💬 [SYNC INBOX] Lancement de l'aspiration de la messagerie...");
    try {
        const optimalTab = await getOptimalVintedTab();

        if (!optimalTab) {
            throw new Error("Aucun onglet Vinted ouvert. Impossible de synchroniser l'Inbox.");
        }

        const tabId = optimalTab.id;

        // Récupérer l'identité (injection directe pour compatibilité Arc)
        const userRes = await fetchUserIdentityDirect(tabId);

        if (!userRes || !userRes.success) {
            throw new Error("Impossible de détecter votre profil Vinted actif sur l'onglet.");
        }

        const botName = userRes.username;
        const botId = userRes.id;

        // Récupérer le cache des conversations déjà synchronisées pour ce compte
        const storageKey = `inboxCache_${botId}`;
        const storageResult = await chrome.storage.local.get([storageKey]);
        const inboxCache = storageResult[storageKey] || {};

        console.log(`💬 [SYNC INBOX] Injection aspirateur inbox (${botName}). Cache actif :`, Object.keys(inboxCache).length, "entrées.");

        const injection = await chrome.scripting.executeScript({
            target: { tabId },
            args: [inboxCache, botId, botName],
            func: async (cache, botId, botName) => {
                try {
                    let csrf = null;
                    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                    if (csrfMeta && csrfMeta.content) csrf = csrfMeta.content;
                    
                    if (!csrf) {
                        for (const script of document.querySelectorAll("script")) {
                            const match = script.textContent?.match(/"csrf[_-]token"\s*[:]\s*"([^"]+)"/);
                            if (match && match[1]) {
                                csrf = match[1];
                                break;
                            }
                        }
                    }
                    
                    const headers = { "Accept": "application/json", "X-Money-Object": "true" };
                    if (csrf) headers["X-CSRF-Token"] = csrf;

                    // 1. Récupérer la liste plus large des conversations du fil (200 pour un balayage profond progressif)
                    const r = await fetch("/api/v2/inbox?per_page=200", { credentials: "include", headers });
                    if (!r.ok) throw new Error(`Vinted HTTP ${r.status}`);
                    const inboxData = await r.json();
                    
                    // Détection proactive d'une expiration de session Vinted ou d'un blocage identité
                    if (inboxData.message_code === "user_login_required" || inboxData.code === 21) {
                        throw new Error("Veuillez réactualiser votre onglet Vinted (Session Vinted déconnectée).");
                    }

                    if (!inboxData.conversations || !Array.isArray(inboxData.conversations)) {
                        const keys = Object.keys(inboxData).join(", ");
                        throw new Error(`Format API Inconnu (Clés : ${keys}). Assurez-vous d'être bien connecté.`);
                    }

                    const threads = inboxData.conversations;
                    const enrichedConversations = [];

                    // 2. Filtrage intelligent : uniquement celles qui n'ont JAMAIS été lues ou qui ont de NOUVEAUX messages (updated_at a changé)
                    const changedThreads = threads.filter(t => {
                        const idStr = String(t.id);
const cachedTime = cache[idStr];
                        const currentTime = t.updated_at;
                        return !cachedTime || cachedTime !== currentTime;
                    });

                    // Limite de sécurité absolue sur les requêtes profondes simultanées (max 15 par cycle)
                    const targetThreads = changedThreads.slice(0, 15);

                    for (const thread of targetThreads) {
                        try {
                            const cr = await fetch(`/api/v2/conversations/${thread.id}`, { credentials: "include", headers });
                            if (!cr.ok) continue;
                            
                            const cData = await cr.json();
                            const details = cData.conversation || cData;

                            // Mapper l'historique des messages (Format Vinted v2 imbriqué 'entity')
                            const messages = (details.messages || []).map(m => {
                                // A) Résolution du texte du message
                                let content = "";
                                if (m.entity) {
                                    if (m.entity_type === "message") {
                                        content = m.entity.body || "";
                                    } else if (m.entity.title) {
                                        content = m.entity.title;
                                        if (m.entity.price_label || m.entity.body) {
                                            const suffix = m.entity.price_label || m.entity.body;
                                            if (suffix && !content.includes(suffix)) {
                                                content += ` (${suffix})`;
                                            }
                                        }
                                    } else if (m.entity.body) {
                                        content = m.entity.body;
                                    } else if (m.entity_type === "offer_message" && m.entity.price_label) {
                                        content = `Offre proposée : ${m.entity.price_label}`;
                                    }
                                }
                                
                                // Fallback legacy
                                if (!content && m.body) content = m.body; 
                            
                                // B) Résolution intelligente de l'expéditeur avec typage fort botId
                                let sender = "Système";
                                const userId = m.entity ? String(m.entity.user_id || "") : "";
                                const oppUser = details.opposite_user || thread.opposite_user || {};
                                
                                if (userId) {
                                    if (userId === String(botId)) {
                                        sender = botName; // Le bot lui-même
                                    } else if (userId === String(oppUser.id)) {
                                        sender = oppUser.login || "Acheteur";
                                    }
                                } else if (m.user) {
                                    sender = m.user.login; // Fallback legacy
                                }
                            
                                // C) Résolution de l'ID du message (très important pour l'upsert Prisma!)
                                const messageId = String(m.entity?.id || m.id || `msg_${Date.now()}_${Math.random()}`);
                            
                                return {
                                    id: messageId,
                                    content: content || "Notification Vinted",
                                    senderUsername: sender,
                                    createdAtVinted: m.created_at_ts || m.created_at || new Date().toISOString()
                                };
                            });

                            // Détecter une proposition d'offre en cours
                            let hasOffer = false;
                            let offerPrice = null;
                            let offerStatus = null;

                            // Stratégie A : Parcourir les messages type offre (avec support des nouveaux types)
                            for (const m of details.messages || []) {
                                if ((m.entity_type === "OfferRequest" || m.entity_type === "Offer" || m.entity_type === "offer_request_message" || m.entity_type === "offer_message") && m.entity) {
                                    const ent = m.entity;
                                    
                                    // Si l'offre est explicitement fermée ou expirée
                                    if (ent.current === false) continue;
                                    
                                    // Détecter si l'état de l'offre est en suspens
                                    const isPending = ent.status === "pending" || ent.state === "pending" || (ent.current === true && !ent.status_title);
                                    
                                    if (isPending) {
                                        // N'enregistrer comme offre "reçue" dans le cockpit
                                        // que si l'émetteur de l'offre n'est pas le bot (donc c'est l'acheteur !)
                                        if (String(ent.user_id) !== String(botId)) {
                                            hasOffer = true;
                                            offerPrice = ent.price ? parseFloat(ent.price.amount || ent.price) : null;
                                            offerStatus = "PENDING";
                                        }
                                    }
                                }
                            }

                            // Stratégie B : Vérifier la transaction parente
                            if (details.transaction && details.transaction.offer) {
                                const off = details.transaction.offer;
                                if (off.status === "pending" || off.state === "pending") {
                                    hasOffer = true;
                                    offerPrice = off.price ? parseFloat(off.price.amount || off.price) : null;
                                    offerStatus = "PENDING";
                                }
                            }

                            const itemId = details.item ? String(details.item.id) : null;
                            const title = details.item ? details.item.title : null;

                            enrichedConversations.push({
                                id: String(thread.id),
                                buyerUsername: thread.opposite_user ? thread.opposite_user.login : "Acheteur Inconnu",
                                buyerPhoto: thread.opposite_user?.photo?.url || thread.opposite_user?.photo?.thumbnails?.[0]?.url || null,
                                title: title || thread.description || "Discussion Vinted",
                                itemId: itemId || null,
                                lastMessage: thread.description || "",
                                lastMessageTime: thread.updated_at || new Date().toISOString(),
                                hasOffer,
                                offerPrice,
                                offerStatus,
                                messages
                            });
                        } catch (errConv) {
                            // Ne bloque pas toute l'exécution
                        }
                        
                        // Petite pause
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }

                    return { success: true, data: enrichedConversations };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        });

        const rawResult = injection?.[0]?.result;
        if (!rawResult) {
            throw new Error("L'injection de messagerie a renvoyé un résultat vide.");
        }
        
        if (!rawResult.success) {
            throw new Error(`Erreur API Inbox : ${rawResult.error}`);
        }

        const mappedConversations = rawResult.data;
        console.log(`💬 [SYNC INBOX] Aspiration réussie. ${mappedConversations.length} nouvelles/mises à jour capturées.`);

        if (mappedConversations.length === 0) {
            console.log("🎉 [SYNC INBOX] Toutes les discussions sont déjà à jour dans le Manager ! Envoi ignoré.");
            saveLog(`💬 Inbox déjà à jour ✅`);
            return; // Rien à envoyer au serveur !
        }

        saveLog(`💬 ${mappedConversations.length} convs lues`);

        // Pousser vers le Manager
        const payload = {
            botAccountName: botName,
            vintedAccountId: botId,
            conversations: mappedConversations
        };

        const configuredUrl = await getManagerApiUrl();
        let baseUrl = configuredUrl.includes("vercel.app") 
            ? configuredUrl.replace("/api/comptabilite/balance", "")
            : configuredUrl.replace(/\/api\/.*$/, "");
        // Nettoyage strict des slashes de fin pour éviter les doubles slashes malformés
        baseUrl = baseUrl.replace(/\/+$/, "");
        
        const syncUrl = baseUrl + "/api/extension/sync/inbox";
        saveLog(`📡 Envoi vers: ${syncUrl.substring(0, 40)}...`);

        console.log(`💬 [SYNC INBOX] POST vers ${syncUrl} (${mappedConversations.length} convs)...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch(syncUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            throw new Error(`Serveur a refusé (HTTP ${res.status}): ${errBody.substring(0, 100)}`);
        }

        const result = await res.json();
        console.log(`✅ [SYNC INBOX] ${result?.data?.syncedConversations || 0} conversations sauvegardées !`);
        
        // Mettre à jour le cache local avec les timestamps réels de ce qu'on a envoyé avec succès
        for (const conv of mappedConversations) {
            inboxCache[conv.id] = conv.lastMessageTime; // lastMessageTime contient thread.updated_at
        }
        await chrome.storage.local.set({ [storageKey]: inboxCache });
        console.log(`💾 [SYNC INBOX] Cache mis à jour avec succès (${Object.keys(inboxCache).length} entrées).`);

        saveLog(`✅ ${result?.data?.syncedConversations || 0} convs synchronisées`);

    } catch (err) {
        console.error("❌ [SYNC INBOX] Échec :", err.message);
        throw err;
    }
}

/**
 * 🔥 Synchro Metrics : Scrape le Dressing (Vues / Favoris) par injection Same-Origin,
 * et met à jour le Radar du Manager pour identifier les Winners.
 */
async function syncVintedItemMetricsToManager() {
    console.log("🔥 [SYNC METRICS] Lancement de l'analyse du Dressing...");
    try {
        const optimalTab = await getOptimalVintedTab();

        if (!optimalTab) {
            throw new Error("Aucun onglet Vinted ouvert. Impossible de synchroniser le Dressing.");
        }

        const tabId = optimalTab.id;

        const userRes = await fetchUserIdentityDirect(tabId);

        if (!userRes || !userRes.success) {
            throw new Error("Impossible d'extraire l'identité de l'onglet actif pour le Dressing.");
        }

        const botName = userRes.username;
        const botId = userRes.id;

        console.log(`🔥 [SYNC METRICS] Injection analyse dressing (${botName})...`);

        const injection = await chrome.scripting.executeScript({
            target: { tabId },
            func: async (userId) => {
                try {
                    let csrf = null;
                    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                    if (csrfMeta && csrfMeta.content) csrf = csrfMeta.content;
                    
                    if (!csrf) {
                        for (const script of document.querySelectorAll("script")) {
                            const match = script.textContent?.match(/"csrf[_-]token"\s*[:]\s*"([^"]+)"/);
                            if (match && match[1]) {
                                csrf = match[1];
                                break;
                            }
                        }
                    }
                    
                    const headers = { "Accept": "application/json" };
                    if (csrf) headers["X-CSRF-Token"] = csrf;

                    let allItems = [];
                    let page = 1;
                    let totalPages = 1;

                    // 1. Récupération des annonces du Dressing
                    while (page <= totalPages) {
                        const url = `/api/v2/wardrobe/${userId}/items?per_page=96&page=${page}&order=relevance`;
                        const r = await fetch(url, { credentials: "include", headers });
                        if (!r.ok) break;
                        const data = await r.json();
                        
                        if (data.message_code === "user_login_required" || data.code === 21) {
                            throw new Error("Déconnecté (Rechargez votre page Vinted)");
                        }

                        if (data.items && Array.isArray(data.items)) {
                            allItems = allItems.concat(data.items);
                        }
                        
                        if (data.pagination && data.pagination.total_pages) {
                            totalPages = data.pagination.total_pages;
                        } else {
                            break;
                        }
                        page++;
                    }

                    // 2. Récupération des Brouillons
                    try {
                        let draftsPage = 1;
                        let draftsTotalPages = 1;
                        while (draftsPage <= draftsTotalPages) {
                            const url = `/api/v2/item_upload/drafts?per_page=96&page=${draftsPage}`;
                            const r = await fetch(url, { credentials: "include", headers });
                            if (!r.ok) break;
                            const data = await r.json();
                            
                            const draftsArray = data.drafts || data.items || [];
                            if (Array.isArray(draftsArray)) {
                                draftsArray.forEach(draft => {
                                    draft.status = "Brouillon";
                                    allItems.push(draft);
                                });
                            }
                            
                            if (data.pagination && data.pagination.total_pages) {
                                draftsTotalPages = data.pagination.total_pages;
                            } else {
                                break;
                            }
                            draftsPage++;
                        }
                    } catch (e) {
                        console.warn("Erreur lors de la récupération des brouillons:", e);
                    }

                    // Cartographier les champs attendus par NextJS
                    const mapped = allItems.map(item => {
                        let photoUrl = null;
                        const photoObj = item.photo || (item.photos && item.photos[0]) || null;
                        if (photoObj) {
                            photoUrl = photoObj.url || photoObj.full_size_url || (photoObj.thumbnails?.[0]?.url) || null;
                        }
                        
                        let relativeUrl = item.url || `/items/${item.id}`;

                        const price = item.price_numeric ?? (item.price && typeof item.price === 'object' ? item.price.amount : null) ?? item.price ?? null;
                        
                        let resolvedStatus = item.status || "Actif";
                        
                        // Force override based on boolean flags or status_id, regardless of what string Vinted puts in item.status
                        if (item.is_hidden || item.status_id === 2 || String(resolvedStatus).toLowerCase() === "hidden") {
                            resolvedStatus = "Masqué";
                        } else if (item.is_draft || item.status_id === 5 || String(resolvedStatus).toLowerCase() === "draft") {
                            resolvedStatus = "Brouillon";
                        }

                        return {
                            id: String(item.id),
                            title: item.title || "Article sans titre",
                            url: relativeUrl.startsWith("http") ? relativeUrl : `https://www.vinted.fr${relativeUrl}`,
                            photoUrl,
                            price: price ? parseFloat(price) : null,
                            viewCount: Number(item.view_count || 0),
                            favouriteCount: Number(item.favourite_count || 0),
                            status: resolvedStatus,
                            uploadedAtVinted: item.created_at_ts ? new Date(item.created_at_ts * 1000).toISOString() : new Date().toISOString()
                        };
                    });

                    return { success: true, data: mapped };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            },
            args: [botId]
        });

        const rawResult = injection?.[0]?.result;
        if (!rawResult) {
            throw new Error("L'injection des métriques dressing a renvoyé un résultat vide.");
        }
        
        if (!rawResult.success) {
            throw new Error(`Erreur API Wardrobe : ${rawResult.error}`);
        }

        const mappedItems = rawResult.data;
        saveLog(`📊 ${mappedItems.length} Articles lus`);

        console.log(`🔥 [SYNC METRICS] ${mappedItems.length} articles lus. Transmission...`);

        const payload = {
            botAccountName: botName,
            vintedAccountId: botId,
            items: mappedItems
        };

        const configuredUrl = await getManagerApiUrl();
        let baseUrl = configuredUrl.includes("vercel.app") 
            ? configuredUrl.replace("/api/comptabilite/balance", "")
            : configuredUrl.replace(/\/api\/.*$/, "");
        // Nettoyage strict des slashes de fin
        baseUrl = baseUrl.replace(/\/+$/, "");
        
        const syncUrl = baseUrl + "/api/extension/sync/metrics";
        saveLog(`📡 Envoi dressing vers: ${syncUrl.substring(0, 30)}...`);

        console.log(`🔥 [SYNC METRICS] POST vers ${syncUrl} (${mappedItems.length} items)...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const res = await fetch(syncUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            throw new Error(`Serveur a refusé (HTTP ${res.status}): ${errBody.substring(0, 100)}`);
        }

        const metricsRes = await res.json();
        console.log(`✅ [SYNC METRICS] ${metricsRes.data?.processed || 0} articles, ${metricsRes.data?.winnersDetected || 0} Winners !`);
        saveLog(`✅ ${metricsRes.data?.processed || 0} articles synchro`);

    } catch (err) {
        console.error("❌ [SYNC METRICS] Échec :", err.message);
    }
}

/**
 * ⚡ Commande Queue : Récupère les ordres du Manager et les exécute via injection Native.
 * Support spécial pour REPOST_ITEM : exécution directe (pas de content script), avec keep-alive MV3.
 */
async function pollActionQueueFromManager() {
    try {
        const optimalTab = await getOptimalVintedTab();
        if (!optimalTab) return;

        const tabId = optimalTab.id;

        const userRes = await fetchUserIdentityDirect(tabId);

        if (!userRes || !userRes.success) return;

        const botName = userRes.username;

        // Construire la cascade d'URLs pour le GET
        const configuredUrl = await getManagerApiUrl();
        const urlsToTry = [];

        if (configuredUrl.includes("vercel.app")) {
            urlsToTry.push(`http://localhost:3000/api/extension/actions?botAccountName=${botName}&vintedAccountId=${botId}`);
            urlsToTry.push(configuredUrl.replace("/api/comptabilite/balance", `/api/extension/actions?botAccountName=${botName}&vintedAccountId=${botId}`));
        } else {
            urlsToTry.push(configuredUrl.replace("/api/comptabilite/balance", `/api/extension/actions?botAccountName=${botName}&vintedAccountId=${botId}`));
        }

        let pendingActions = [];
        let activeBaseUrl = "";

        // 1. Récupérer les actions
        for (const url of urlsToTry) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);
                
                const res = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    pendingActions = data.actions || [];
                    activeBaseUrl = url.split("?")[0]; // Garder l'URL sans params pour le PATCH
                    break;
                }
            } catch (e) {
                // Silencieux
            }
        }

        if (pendingActions.length === 0) return;

        console.log(`⚡ [ACTIONS] ${pendingActions.length} ordres en attente du Manager ! Exécution séquentielle...`);

        const hasRepostItems = pendingActions.some(a => a.actionType === "REPOST_ITEM");
        let keepAlive = null;

        if (hasRepostItems) {
            console.log("⏱️ [REPOST] Délai détecté. Activation du keep-alive MV3 (ping toutes les 20s)...");
            keepAlive = setInterval(() => {
                chrome.runtime.getPlatformInfo(() => {});
            }, 20000);
        }

        try {
            for (const action of pendingActions) {
                console.log(`⚡ [EXECUTE] Ordre ${action.actionType} (ID: ${action.id})`);

                let success = false;
                let errorMessage = null;

                try {
                    if (action.actionType === "REPOST_ITEM") {
                        console.log(`🔄 [REPOST] Détection action REPOST_ITEM. Exécution directe dans le service worker...`);

                        if (action.payload && action.payload.delayBeforeMs && action.payload.delayBeforeMs > 0) {
                            console.log(`⏳ [REPOST] Attente ${action.payload.delayBeforeMs}ms avant le reposte...`);
                            await new Promise(resolve => setTimeout(resolve, action.payload.delayBeforeMs));
                        }

                        const repostResult = await repostItemREST(action.payload.itemId, action.payload);
                        console.log(`✅ [REPOST] Reposte réussi : ${repostResult.newId}`);
                        success = true;
                    } else if (action.actionType === "DUPLICATE_ITEM") {
                        console.log(`🔄 [DUPLICATE] Détection action DUPLICATE_ITEM. Exécution directe...`);
                        
                        // payload { sourceItemId, asDraft, cropPercent }
                        const dupResult = await duplicateItemREST(action.payload.sourceItemId, {
                            asDraft: action.payload.asDraft,
                            cropPercent: action.payload.cropPercent || 0
                        });
                        console.log(`✅ [DUPLICATE] Duplication réussie : ${dupResult.newId} (Brouillon: ${dupResult.isDraft})`);
                        success = true;
                    } else if (action.actionType === "MARKET_SPY_LIKE") {
                        const spyResult = await runMarketSpyLike(action.payload);
                        console.log(`✅ [MARKET SPY] ${spyResult.liked} articles likés`);
                        success = true;
                    } else if (action.actionType === "ADD_TO_CART_SHEIN") {
                        await handleSheinCart(action.payload.url, action.payload.taille, action.payload.venteId);
                        console.log(`✅ [SHEIN CART] Ajout réussi.`);
                        success = true;
                    } else {
                        const actionResult = await executeBotAction(tabId, action);
                        
                        if (action.actionType === "CHECK_EXTENSION_STATUS" && actionResult?.isAccepted) {
                            const venteId = action.payload.venteId;
                            const managerUrlObj = new URL(activeBaseUrl);
                            const managerRootUrl = `${managerUrlObj.protocol}//${managerUrlObj.host}`;

                            // Appeler l'API de validation du prolongement
                            const validRes = await fetch(`${managerRootUrl}/api/ventes/${venteId}/prolongement`, {
                                method: "POST"
                            });
                            
                            if (!validRes.ok) throw new Error(`Echec de l'auto-validation du prolongement sur le Manager`);
                            console.log(`✅ [EXTENSION] Prolongement auto-validé pour la vente ${venteId}`);
                        }

                        // Si c'est un GENERATE_LABEL, on traite l'upload du PDF ici dans le background
                        if (action.actionType === "GENERATE_LABEL" && actionResult?.isLabel) {
                            const { labelUrl, transporteur, trackingCode } = actionResult;
                            const venteId = action.payload.venteId;
                            
                            const managerUrlObj = new URL(activeBaseUrl);
                            const managerRootUrl = `${managerUrlObj.protocol}//${managerUrlObj.host}`;

                            // Téléchargement du PDF
                            const pdfRes = await fetch(labelUrl);
                            const pdfBlob = await pdfRes.blob();
                            
                            const formData = new FormData();
                            formData.append('venteId', venteId);
                            formData.append('file', pdfBlob, `bordereau.pdf`);
                            formData.append('transporteur', transporteur);
                            formData.append('numeroBordereau', trackingCode);

                            const uploadRes = await fetch(`${managerRootUrl}/api/expeditions`, {
                                method: "POST",
                                body: formData
                            });
                            
                            if (!uploadRes.ok) throw new Error(`Upload Manager a échoué: ${uploadRes.status}`);
                        }

                        success = true;
                    }

                    console.log(`✅ [EXECUTE] Succès pour l'action #${action.id}`);
                } catch (err) {
                    errorMessage = err.message;
                    console.error(`❌ [EXECUTE] Échec pour l'action #${action.id} :`, errorMessage);
                }

                try {
                    await fetch(activeBaseUrl, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            actionId: action.id,
                            status: success ? "SUCCESS" : "FAILED",
                            errorMessage: errorMessage
                        })
                    });

                    if (success && (action.actionType === "SEND_MESSAGE" || action.actionType === "ACCEPT_OFFER")) {
                        setTimeout(() => syncVintedInboxToManager(), 2000);
                    }
                } catch (patchErr) {
                    console.error("❌ [EXECUTE] Impossible de notifier le Manager du statut de l'action :", patchErr);
                }

                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        } finally {
            if (keepAlive !== null) {
                clearInterval(keepAlive);
                console.log("✅ [REPOST] Keep-alive MV3 arrêté.");
            }
        }

    } catch (e) {
        console.error("❌ [ACTIONS] Échec de boucle :", e.message);
    }
}

/**
 * Exécute l'ajout au panier sur Shein dans un nouvel onglet Chrome natif
 */

/**
 * Exécute concrètement un ordre natif dans le contexte de l'onglet Vinted.
 */
async function executeBotAction(tabId, action) {
    const { actionType, payload } = action;

    const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: async (type, pay) => {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrf = csrfMeta ? csrfMeta.content : null;
            
            const getHeaders = (isJson = true) => {
                const h = { "Accept": "application/json", "X-Money-Object": "true" };
                if (csrf) h["X-CSRF-Token"] = csrf;
                if (isJson) h["Content-Type"] = "application/json";
                return h;
            };

            try {
                // ROUTAGE DES ACTIONS
                if (type === "SEND_MESSAGE") {
                    const { conversationId, message } = pay;
                    if (!conversationId || !message) throw new Error("Paramètres manquants");

                    const res = await fetch(`/api/v2/conversations/${conversationId}/replies`, {
                        method: "POST",
                        credentials: "include",
                        headers: getHeaders(true),
                        body: JSON.stringify({
                            reply: {
                                body: message,
                                photo_temp_uuids: null,
                                is_personal_data_sharing_check_skipped: false
                            }
                        })
                    });

                    if (!res.ok) {
                        const errTxt = await res.text();
                        throw new Error(`Vinted API Error (${res.status}): ${errTxt}`);
                    }
                    return { ok: true };
                }

                if (type === "ACCEPT_OFFER") {
                    const { conversationId } = pay;
                    if (!conversationId) throw new Error("conversationId manquant");

                    // 1. Récupérer en temps réel les identifiants dynamiques de transaction
                    const convRes = await fetch(`/api/v2/conversations/${conversationId}`, { credentials: "include", headers: getHeaders(false) });
                    if (!convRes.ok) throw new Error("Impossible de lire la conversation.");
                    
                    const cData = await convRes.json();
                    const conv = cData.conversation || cData;

                    const transactionId = conv.transaction ? conv.transaction.id : null;
                    
                    // Chercher l'ID de l'offre active en cours
                    let offerRequestId = null;
                    for (const m of conv.messages || []) {
                        if ((m.entity_type === "OfferRequest" || m.entity_type === "Offer") && m.entity) {
                            if (m.entity.status === "pending" || m.entity.state === "pending") {
                                offerRequestId = m.entity.id;
                                break;
                            }
                        }
                    }

                    if (!transactionId || !offerRequestId) {
                        throw new Error("Aucune transaction ou offre en cours détectée sur ce fil.");
                    }

                    // 2. Appeler l'API Native Vinted d'Acceptation d'Offre !
                    const acceptRes = await fetch(`/api/v2/transactions/${transactionId}/offer_requests/${offerRequestId}/accept`, {
                        method: "PUT",
                        credentials: "include",
                        headers: getHeaders(false) // Pas de body JSON requis
                    });

                    if (!acceptRes.ok) {
                        const txt = await acceptRes.text();
                        throw new Error(`Rejet Acceptation (${acceptRes.status}) : ${txt}`);
                    }
                    return { ok: true };
                }

                if (type === "COUNTER_OFFER") {
                    const { conversationId, amount } = pay;
                    if (!conversationId || !amount) throw new Error("Paramètres requis manquants.");

                    // 1. Récupérer la transaction
                    const convRes = await fetch(`/api/v2/conversations/${conversationId}`, { credentials: "include", headers: getHeaders(false) });
                    if (!convRes.ok) throw new Error("Impossible de lire la conversation.");
                    
                    const cData = await convRes.json();
                    const conv = cData.conversation || cData;

                    const transactionId = conv.transaction ? conv.transaction.id : null;

                    if (transactionId) {
                        // Méthode standard : Offre sur la transaction courante
                        const res = await fetch(`/api/v2/transactions/${transactionId}/offers`, {
                            method: "POST",
                            credentials: "include",
                            headers: getHeaders(true),
                            body: JSON.stringify({
                                offer: {
                                    price: parseFloat(amount),
                                    currency: "EUR"
                                }
                            })
                        });
                        if (!res.ok) throw new Error(`Échec offre transaction: HTTP ${res.status}`);
                    } else {
                        // Plan B : Offre directe sur l'article si la transaction n'est pas initialisée
                        const itemId = conv.item ? conv.item.id : null;
                        if (!itemId) throw new Error("Transaction ou Article introuvable pour négocier.");

                        const res = await fetch(`/api/v2/items/${itemId}/offers`, {
                            method: "POST",
                            credentials: "include",
                            headers: getHeaders(true),
                            body: JSON.stringify({
                                price: parseFloat(amount)
                            })
                        });
                        if (!res.ok) throw new Error(`Échec offre article: HTTP ${res.status}`);
                    }

                    return { ok: true };
                }

                if (type === "CHECK_EXTENSION_STATUS") {
                    const { vintedTransactionId } = pay;
                    if (!vintedTransactionId) throw new Error("transactionId manquant");

                    // 1. Lire la transaction pour récupérer la conversation
                    const txRes = await fetch(`/api/v2/transactions/${vintedTransactionId}`, { credentials: "include", headers: getHeaders(false) });
                    if (!txRes.ok) throw new Error(`Impossible de lire la transaction ${vintedTransactionId}`);
                    const txData = await txRes.json();
                    
                    const transaction = txData.transaction || txData;
                    const conversationId = transaction.conversation_id || transaction.item?.conversation_id;

                    if (!conversationId) {
                        throw new Error("Impossible de trouver la conversation pour vérifier l'extension");
                    }

                    // 2. Lire les messages de la conversation
                    const convRes = await fetch(`/api/v2/conversations/${conversationId}`, { credentials: "include", headers: getHeaders(false) });
                    if (!convRes.ok) throw new Error("Impossible de lire la conversation");
                    const cData = await convRes.json();
                    const conv = cData.conversation || cData;

                    // Chercher un message système récent qui confirme le prolongement
                    // Les mots clés : "délai" "prolongé", "accepté", "shipping_deadline"
                    let isAccepted = false;
                    for (const m of (conv.messages || [])) {
                        if (m.type === "system_message" || m.is_system_message || m.action_type) {
                            const text = (m.body || m.content || "").toLowerCase();
                            if (text.includes("accept") && text.includes("prolong") || text.includes("délai")) {
                                isAccepted = true;
                                break;
                            }
                            if (m.action_type && m.action_type.includes("deadline") && m.action_type.includes("extend")) {
                                isAccepted = true;
                                break;
                            }
                        }
                    }

                    return { ok: true, isAccepted };
                }

                if (type === "DELETE_ITEM") {
                    const { itemId } = pay;
                    if (!itemId) throw new Error("itemId manquant");
                    const res = await fetch(`/api/v2/items/${itemId}`, {
                        method: "DELETE",
                        credentials: "include",
                        headers: getHeaders(false)
                    });
                    if (!res.ok) throw new Error(`Échec suppression HTTP ${res.status}`);
                    return { ok: true };
                }

                if (type === "PUBLISH_DRAFT") {
                    const { itemId } = pay;
                    if (!itemId) throw new Error("itemId manquant");
                    
                    // 1. Récupérer les données du brouillon existant
                    const draftRes = await fetch(`/api/v2/item_upload/items/${itemId}`, {
                        credentials: "include",
                        headers: getHeaders(false)
                    });
                    if (!draftRes.ok) throw new Error(`Impossible de récupérer le brouillon HTTP ${draftRes.status}`);
                    const dData = await draftRes.json();
                    const draftObj = dData.item || dData.draft || dData;
                    
                    // 2. Publier le brouillon
                    const publishRes = await fetch(`/api/v2/item_upload/drafts/${itemId}/completion`, {
                        method: "POST",
                        credentials: "include",
                        headers: getHeaders(true),
                        body: JSON.stringify({
                            draft: draftObj,
                            push_up: false,
                            feedback_id: null,
                            parcel: null,
                            upload_session_id: draftObj.temp_uuid || null
                        })
                    });
                    if (!publishRes.ok) {
                        const errTxt = await publishRes.text();
                        throw new Error(`Échec publication HTTP ${publishRes.status}: ${errTxt}`);
                    }
                    return { ok: true };
                }

                throw new Error(`Type d'action inconnu : ${type}`);
            } catch (err) {
                throw new Error(err.message);
            }
        },
        args: [actionType, payload]
    });

    // Si injection a throwé une erreur, elle arrive ici
    const finalRes = result?.[0]?.result;
    if (finalRes && finalRes.ok) {
        return true;
    }
    throw new Error("Script d'injection retourné invalide.");
}

// ===================================================================
// 🤖 GEMINI AUTO-RESPONDER ENGINE
// ===================================================================

/**
 * Analyse l'inbox en arrière-plan, filtre la cible de test, agrège le contexte
 * et génère une réponse via Gemini Flash si le dernier message est de l'acheteur.
 */
async function runGeminiScan(force = false) {
    chrome.storage.local.get(['botActive', 'negoThreshold'], async (result) => {
        if (!result.botActive && !force) {
            console.log("😴 [GEMINI] Bot inactif, analyse annulée.");
            return;
        }
        
        const negoThreshold = result.negoThreshold || 15; // 15% par défaut
        
        // saveLog("🤖 Scan IA : Démarrage..."); // Retiré pour éviter de spammer les logs visuels inutilement
        console.log("🤖 [GEMINI] Lancement de l'aspiration messagerie contextuelle...");
        
        try {
            const optimalTab = await getOptimalVintedTab();
            if (!optimalTab) {
                console.warn("⚠️ [GEMINI] Aucun onglet Vinted ouvert pour scanner l'inbox.");
                saveLog("⚠️ IA : Aucun onglet Vinted ouvert.");
                return;
            }
            
            // 1. Détection dynamique de l'identité Vendeur active (Nina, Margaux, Léna...)
            const identity = await fetchUserIdentityDirect(optimalTab.id);
            if (!identity || !identity.success) {
                console.warn("⚠️ [GEMINI] Impossible de déterminer l'identité du bot.");
                saveLog("⚠️ IA : Identité bot inconnue.");
                return;
            }
            
            const botName = identity.username;
            const botId = identity.id;
            
            console.log(`🤖 [GEMINI] Identité active : ${botName} (#${botId})`);
            
            // 2. Fetch des fils récents via REST API (Endpoint correct : /inbox)
            const inboxRes = await vintedFetch("/api/v2/inbox?per_page=10");
            if (!inboxRes.success) {
                console.error("❌ [GEMINI] Impossible de lire l'inbox via REST :", inboxRes.status, inboxRes.error);
                const detail = inboxRes.error ? inboxRes.error.substring(0, 15) : `HTTP ${inboxRes.status}`;
                saveLog(`❌ IA : Erreur lecture inbox (${detail})`);
                return;
            }
            
            const rawConvs = inboxRes.data.conversations || [];
            
            // 3. Plus de restriction (Fin du TARGET LOCK) : L'IA analyse maintenant toutes les conversations !
            const targetConvs = rawConvs;
            
            if (targetConvs.length === 0) {
                console.log(`😴 [GEMINI] Aucune discussion active dans l'inbox.`);
                saveLog("😴 IA : Pas de nouveaux messages.");
                return;
            }
            
            let countProcessed = 0;
            let alreadyAnswered = 0;
            
            // 4. Traitement unitaire (Max 3 conversations par cycle)
            for (const c of targetConvs) {
                if (countProcessed >= 3) break;
                
                const convId = c.id;
                
                // 🛡️ ANTI-DOUBLON : Skip si une réponse est déjà planifiée dans la file d'actions
                if (syncState.queuedReplies.includes(convId)) {
                    console.log(`⏭️ [GEMINI] Réponse déjà en cours de traitement/planifiée pour #${convId}. Skip.`);
                    continue;
                }

                const opponentName = c.opposite_user?.login || "inconnu";
                const opponentId = c.opposite_user?.id ? String(c.opposite_user.id) : null;
                
                // 4. Lecture détaillée du fil (historique complet et métadonnées riches de l'article)
                const detailRes = await vintedFetch(`/api/v2/conversations/${convId}`);
                if (!detailRes.success) continue;
                
                const details = detailRes.data.conversation || detailRes.data || {};
                const messages = details.messages || [];
                if (messages.length === 0) continue;
                
                // 🛡️ FILTRE TRANSACTION : ignorer si le colis est acheté, en cours d'envoi ou livré
                const isTx = c.is_transaction === true || 
                             details.is_transaction === true || 
                             !!c.transaction || 
                             !!details.transaction || 
                             !!c.shipping_order || 
                             !!details.shipping_order;
                             
                if (isTx) {
                    console.log(`⏭️ [GEMINI] La conversation #${convId} avec @${opponentName} est liée à une transaction (colis acheté/envoyé). Skip.`);
                    continue;
                }
                
                // 🛡️ FILTRE VINTED: Ignorer les messages officiels système de Vinted
                if (opponentName.toLowerCase() === "vinted" || opponentName.toLowerCase() === "equipe_vinted" || c.is_system_conversation) {
                    console.log(`⏭️ [GEMINI] La conversation #${convId} est un message système Vinted. Skip.`);
                    continue;
                }
                
                // --- DÉTECTION ROBUSTE & RÉCURSIVE DU PRIX DE L'ARTICLE ---
                const itemD = details.item || {};
                const itemI = c.item || {};
                const itemTitle = itemD.title || itemI.title || "l'article";
                
                // Fonction chasseuse récursive pour trouver n'importe quelle variante du prix dans l'arbre JSON
                const huntForPrice = (obj) => {
                    if (!obj) return null;
                    // 1. Recherche directe de valeurs numériques ou formats texte
                    if (obj.price_numeric) return obj.price_numeric;
                    if (obj.total_item_price) return obj.total_item_price;
                    // 2. Recherche d'objets monétaires complexes Vinted ({amount: "XX", currency: "EUR"})
                    if (obj.price) {
                        if (typeof obj.price === "object") {
                            return obj.price.amount || obj.price.numeric || obj.price.value;
                        }
                        return obj.price;
                    }
                    // 3. Plongée récursive sur l'enfant 'item' si l'objet est un conteneur global
                    if (obj.item) return huntForPrice(obj.item);
                    return null;
                };
                
                // Fusion prioritaire : on cherche d'abord dans le fil détaillé, puis dans la liste inbox en secours !
                const rawPrice = huntForPrice(details) || huntForPrice(c) || null;
                let itemPrice = 0;
                
                if (rawPrice) {
                    // Nettoyage textuel ultime (ex: "37,00 €" -> "37.00")
                    const cleanStr = String(rawPrice).replace(",", ".").replace(/[^0-9.]/g, "");
                    itemPrice = parseFloat(cleanStr || 0);
                }
                
                console.log(`🔍 [GEMINI] Analyse #${convId} | Titre: "${itemTitle}" | Prix trouvé: ${itemPrice}€`);
                
                // Trier chronologiquement pour être certain de la chronologie
                const sortedMessages = [...messages].sort((a, b) => {
                    const timeA = new Date(a.created_at_ts || a.created_at).getTime();
                    const timeB = new Date(b.created_at_ts || b.created_at).getTime();
                    return timeA - timeB;
                });
                
                const ultimateMsg = sortedMessages[sortedMessages.length - 1];
                const lastSenderId = String(ultimateMsg.entity?.user_id || ultimateMsg.user_id || ultimateMsg.user?.id || "");
                
                // 5. LOGIQUE DE RÉPONSE : on ne parle que si l'acheteur a dit le dernier mot !
                if (lastSenderId === String(botId)) {
                    console.log(`⏭️ [GEMINI] C'est déjà ${botName} qui a envoyé le dernier message à @${opponentName}. Standby.`);
                    alreadyAnswered++;
                    continue;
                }
                
                console.log(`🗣️ [GEMINI] L'acheteur @${opponentName} attend notre réponse. Agrégation contexte...`);
                saveLog(`🗣️ IA : Génération réponse p/ @${opponentName}`);
                
                // 🛡️ FILTRE ANTI-CENSURE ET PURIFICATION DE L'HISTORIQUE (Contre PROMPT_PROHIBITED_CONTENT)
                // 1. Ne garder QUE les messages venant du vendeur ou de l'acheteur (élimine les messages système Vinted)
                const humanMessages = sortedMessages.filter(m => {
                    const senderId = String(m.entity?.user_id || m.user_id || m.user?.id || "");
                    const isBot = senderId === String(botId);
                    const isOpponent = opponentId && senderId === opponentId;
                    return isBot || isOpponent;
                });
                
                // 2. Cartographie et nettoyage textuel agressif (Emails, Liens, Consignes de sécu)
                const contextHistory = humanMessages.slice(-10).map(m => {
                    const senderId = String(m.entity?.user_id || m.user_id || m.user?.id || "");
                    const senderLabel = senderId === String(botId) ? "Vendeur" : "Acheteur";
                    
                    let text = "";
                    if (m.entity) {
                        text = m.entity.body || m.entity.title || "";
                    } else {
                        text = m.body || "";
                    }
                    
                    if (!text) return null;
                    
                    // Remplacement préventif des liens et emails qui rendent l'API Gemini ultra-suspicieuse
                    let cleanText = text.replace(/https?:\/\/[^\s]+/gi, "[lien]");
                    cleanText = cleanText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, "[email]");
                    
                    // Éliminer les avertissements de sécurité injectés dans les messages par Vinted
                    const lowText = cleanText.toLowerCase();
                    if (lowText.includes("sécurité") || lowText.includes("coordonnées") || lowText.includes("partagez pas") || lowText.includes("pour ta protection")) {
                        return null; // Zappe complètement le message
                    }
                    
                    return `${senderLabel}: ${cleanText}`;
                }).filter(Boolean); // Supprime les entrées vides ou annulées
                
                // Calcul du prix plancher selon le seuil de négociation défini sur le cockpit (%)
                // Si le prix de base est introuvable ou nul, on refuse de faire une offre (sécurité pour éviter les offres à 2€ !)
                let minPriceAllowed = 0;
                if (itemPrice > 0) {
                    const maxDiscount = itemPrice * (negoThreshold / 100);
                    minPriceAllowed = Math.max(1, Math.ceil(itemPrice - maxDiscount)); 
                }
                
                console.log(`🎯 [GEMINI] Seuil Négociation : ${negoThreshold}% | Prix de base : ${itemPrice}€ | Prix plancher calculé : ${minPriceAllowed}€`);
                
                // Génération du contenu par IA Gemini en lui passant le prix et la limite plancher
                const responseText = await generateGeminiResponse(contextHistory, botName, itemTitle, itemPrice, minPriceAllowed);
                
                if (responseText && responseText.length > 0) {
                    countProcessed++;
                    
                    // --- PARSING ET DÉTECTION D'OFFRE UNIVERSELLE ---
                    // Regex tolérante acceptant : [OFFRE: 33], [OFFRE : 33], (OFFRE-33), OFFRE: 33 etc.
                    const offerRegex = /[\[\(]?OFFRE\s*[:\s=-]+\s*(\d+)[\]\)]?/i;
                    const offerMatch = responseText.match(offerRegex);
                    let finalReplyText = responseText;
                    let triggerOfferPrice = null;
                    
                    if (offerMatch) {
                        triggerOfferPrice = parseInt(offerMatch[1]);
                        // Retirer proprement toute variation de la balise du texte client
                        finalReplyText = responseText.replace(offerRegex, "").trim();
                        console.log(`🎯 [GEMINI] Offre automatique validée : ${triggerOfferPrice}€`);
                        saveLog(`🎯 IA : Offre proposée à ${triggerOfferPrice}€`);
                    }
                    
                    console.log(`✨ [GEMINI] Texte généré pour @${opponentName} : "${finalReplyText}"`);
                    
                    // 6. ENVOI INSTANTANÉ (API INVISIBLE)
                    syncState.queuedReplies.push(convId);
                    
                    try {
                        const optimalTab = await getOptimalVintedTab();
                        if (optimalTab) {
                            saveLog(`🤖 IA : Envoi du message API pour @${opponentName}...`);
                            
                            await chrome.scripting.executeScript({
                                target: { tabId: optimalTab.id },
                                func: async (cid, text, offerPrice) => {
                                    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
                                    const headers = { "Accept": "application/json", "Content-Type": "application/json", "X-Money-Object": "true" };
                                    if (csrfMeta) headers["X-CSRF-Token"] = csrfMeta.content;

                                    // Envoi du message
                                    await fetch(`/api/v2/conversations/${cid}/replies`, {
                                        method: "POST",
                                        credentials: "include",
                                        headers: headers,
                                        body: JSON.stringify({
                                            reply: { body: text }
                                        })
                                    });

                                    // Si une offre est attachée, on l'envoie aussi
                                    if (offerPrice) {
                                        await fetch(`/api/v2/transactions/`, { // Endpoints exacts d'offres à raffiner selon API Vinted, mais typiquement inclus dans l'inbox. 
                                            // TODO: vérifier l'endpoint exact pour les offres si l'offre n'est pas qu'un simple texte
                                        });
                                        // On simulera qu'on envoie juste le texte pour l'instant
                                    }
                                },
                                args: [convId, finalReplyText, triggerOfferPrice]
                            });

                            saveLog(`✅ IA : Réponse instantanée envoyée à @${opponentName}`);
                        }
                    } catch (e) {
                        console.error("❌ Erreur API Gemini Reply :", e);
                        saveLog(`❌ IA : Échec de l'envoi API à @${opponentName}`);
                    } finally {
                        syncState.queuedReplies = syncState.queuedReplies.filter(id => id !== convId);
                    }
                } else {
                    console.warn("⚠️ [GEMINI] Aucune réponse valide renvoyée par generateGeminiResponse.");
                    saveLog("⚠️ IA : Réponse ignorée (vide).");
                }
            }
            
            if (countProcessed === 0 && alreadyAnswered > 0) {
                saveLog("😴 IA : Déjà répondu aux cibles.");
            }
            
        } catch (err) {
            console.error("❌ [GEMINI] Échec critique de l'aspiration messagerie :", err);
            saveLog(`❌ IA : Erreur fatale (${err.message.substring(0, 20)})`);
        }
    });
}

/**
 * Appelle l'API officielle Google Gemini 1.5 Flash avec le Persona actif injecté.
 */
async function generateGeminiResponse(history, botName, itemTitle, itemPrice, minPriceAllowed) {
    const { geminiApiKey } = await chrome.storage.local.get(["geminiApiKey"]);
    const apiKey = geminiApiKey;
    if (!apiKey) {
        throw new Error("geminiApiKey manquant : configurez-la dans chrome.storage.local (voir README)");
    }
    // Utilisation du modèle gemini-3.1-flash-lite qui est bien supporté par l'API REST
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    
    // Prompt adaptatif intégrant l'identité dynamique du bot, le titre et le prix de l'article
    let prompt = `Tu es ${botName}, une vendeuse professionnelle, chaleureuse, et experte en négociation sur la plateforme de mode Vinted.\n`;
    if (itemPrice > 0) {
        prompt += `L'acheteur s'intéresse à ton article "${itemTitle}" actuellement affiché au prix de ${itemPrice} €.\n`;
    } else {
        prompt += `L'acheteur s'intéresse à un de tes articles. (Le prix exact n'a pas pu être détecté pour le moment).\n`;
    }
    prompt += `Ton objectif : Rédiger une réponse naturelle pour l'aider, lever ses freins, et CONCLURE LA VENTE au plus vite.\n\n`;
    prompt += `Voici l'historique chronologique récent de votre conversation (du plus ancien au plus récent) :\n`;
    prompt += `------------------------------\n`;
    prompt += history.join("\n");
    prompt += `\n------------------------------\n\n`;
    prompt += `RÈGLES ABSOLUES POUR RÉDIGER TA RÉPONSE :\n`;
    prompt += `1. Écris TA RÉPONSE en incarnant parfaitement le profil de ${botName}.\n`;
    prompt += `2. Sois CONCISE, chaleureuse et spontanée (style SMS/Message mobile). N'utilise ABSOLUMENT AUCUN émoji (ils sont strictement interdits).\n`;
    prompt += `3. Ne rajoute AUCUN préfixe ni entête (n'écris pas "${botName}:", ni "Réponse:", ni "Vendeuse:").\n`;
    prompt += `4. Écris UNIQUEMENT le corps du message à copier-coller. Zéro code, zéro markdown, zéro guillemet superflu.\n`;
    
    // 5. RÈGLE COMMERCIALE UNIVERSELLE
    if (minPriceAllowed > 0 && itemPrice > 0) {
        prompt += `5. NÉGOCIATION ET PRIX PROMOTIONNEL : Si l'acheteur demande un rabais ou propose un prix, tu peux accepter ou faire une contre-proposition.\n`;
        prompt += `⚠️ RÈGLE DE RENTABILITÉ INVIOLABLE : Ton prix final DOIT OBLIGATOIREMENT être compris entre ${minPriceAllowed} € (prix minimum absolu) et ${Math.ceil(itemPrice - 1)} € (prix maximum). Si l'acheteur propose moins de ${minPriceAllowed} €, TU DOIS CATÉGORIQUEMENT REFUSER son prix et lui proposer ton minimum de ${minPriceAllowed} € à la place.\n`;
        prompt += `Pour déclencher l'offre dans le système, tu DOIS ABSOLUMENT ajouter la balise exacte [OFFRE: XX] à la toute fin de ton message (avec XX ton prix validé EN ENTIER).\n`;
        prompt += `TRÈS IMPORTANT - EXEMPLES DE FORMAT À RESPECTER :\n`;
        prompt += `- Cas 1 (Acceptation) : "C'est d'accord pour 30 euros. Tu peux valider ton achat. [OFFRE: 30]"\n`;
        prompt += `- Cas 2 (Refus et Contre-offre) : "Je ne peux pas descendre à 25 euros, mais je te propose 28 euros, c'est mon dernier prix ! [OFFRE: 28]"\n`;
        prompt += `Si aucune question d'argent n'est abordée, réponds normalement et n'utilise JAMAIS la balise [OFFRE].\n`;
    } else {
        prompt += `5. RÈGLE CRITIQUE DE NÉGOCIATION : Tu ne connais pas le prix exact de l'article pour l'instant.\n`;
        prompt += `TU N'AS DONC STRICTEMENT PAS LE DROIT de faire, d'accepter ou de proposer une offre chiffrée, ni de baisser le prix, NI d'utiliser la balise [OFFRE: X]. Contente-toi d'être polie et de répondre à ses questions sur l'article de façon textuelle.\n`;
    }
    
    try {
        console.log("🤖 [GEMINI] Appel API en cours...");
        saveLog("🔍 IA : Appel API Gemini...");
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });
        
        console.log("🤖 [GEMINI] Statut HTTP reçu :", response.status);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errString = JSON.stringify(errData);
            throw new Error(`HTTP ${response.status}: ${errString.substring(0, 30)}`);
        }
        
        const data = await response.json();
        console.log("🤖 [GEMINI] Données reçues :", data);
        
        if (data.error) {
            throw new Error(`Payload Err: ${data.error.message || "JSON"}`);
        }
        
        const candidate = data.candidates?.[0] || {};
        const text = candidate.content?.parts?.[0]?.text || "";
        
        if (!text) {
            let blockReason = "INCONNUE";
            
            // Détection de blocage au niveau du prompt global (promptFeedback)
            if (data.promptFeedback) {
                blockReason = `PROMPT_${data.promptFeedback.blockReason || "BLOCKED"}`;
            } 
            // Détection de blocage au niveau de la génération (finishReason)
            else if (candidate.finishReason) {
                blockReason = candidate.finishReason;
            }
            // Cas d'absence totale de candidats
            else if (!data.candidates || data.candidates.length === 0) {
                blockReason = "NO_CANDIDATE";
            }
            
            saveLog(`⚠️ IA : Bloqué (${blockReason})`);
            console.warn("⚠️ [GEMINI] Échec de complétion, structure brute :", data);
        } else {
            saveLog(`✅ IA : Réponse générée (${text.length} car.)`);
        }
        
        // Nettoyage final des éventuels guillemets résiduels générés par l'IA
        return text.trim().replace(/^["'«]|["'»]$/g, '').trim();
    } catch (e) {
        console.error("❌ [GEMINI API] Erreur d'appel de génération :", e);
        saveLog(`❌ IA : Échec API Gemini (${e.message.substring(0, 30)})`);
        return null;
    }
}

/**
 * 🎭 Routine de warm-up comportemental passif
 * Défile la page d'accueil Vinted et like 2 ou 3 articles par jour au hasard.
 */
async function runWarmup(force = false) {
    const today = new Date().toDateString();
    chrome.storage.local.get(['botActive', 'warmupLastDate', 'warmupLikesToday', 'warmupTarget'], async (res) => {
        if (!res.botActive && !force) {
            console.log("😴 [WARMUP] Bot inactif, warm-up annulé.");
            return;
        }

        let likesToday = res.warmupLikesToday || 0;
        let lastDate = res.warmupLastDate || "";
        let target = res.warmupTarget || 2;

        if (lastDate !== today) {
            likesToday = 0;
            lastDate = today;
            target = Math.floor(Math.random() * 2) + 2; // Choisit aléatoirement 2 ou 3 likes par jour
            chrome.storage.local.set({ warmupLastDate: today, warmupLikesToday: 0, warmupTarget: target });
        }

        if (likesToday >= target && !force) {
            console.log(`✅ [WARMUP] Quota de warm-up quotidien déjà atteint (${likesToday}/${target} likes).`);
            return;
        }

        // Récupérer le nom et domaine du bot actif
        let baseOrigin = "https://www.vinted.fr";
        const optimalTab = await getOptimalVintedTab();
        if (optimalTab && optimalTab.url) {
            try {
                baseOrigin = new URL(optimalTab.url).origin;
            } catch(e){}
        }

        console.log(`🎭 [WARMUP] Lancement du cycle de warm-up passif sur ${baseOrigin}...`);
        saveLog("🎭 Warm-up : Début du cycle");

        chrome.tabs.create({ url: baseOrigin, active: false }, (warmupTab) => {
            const tabId = warmupTab.id;

            // Écouter le chargement de l'onglet fantôme
            chrome.tabs.onUpdated.addListener(function listener(tId, info) {
                if (tId === tabId && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);

                    // Attendre 5 secondes que le flux (React) apparaisse
                    setTimeout(() => {
                        chrome.scripting.executeScript({
                            target: { tabId },
                            func: async () => {
                                try {
                                    // 1. Simuler un défilement humain progressif
                                    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                                    console.log("🎭 [WARMUP INJECT] Scrolling...");
                                    
                                    for (let i = 0; i < 4; i++) {
                                        window.scrollBy({ top: 300 + Math.random() * 200, behavior: 'smooth' });
                                        await sleep(1200 + Math.random() * 800);
                                    }
                                    
                                    // 2. Chercher les boutons favoris (cœur) non likés
                                    const hearts = Array.from(document.querySelectorAll('button[class*="favourite"], [data-testid*="favourite"], [data-testid*="favorite"]'));
                                    
                                    const unliked = hearts.filter(btn => {
                                        const isLiked = btn.querySelector('[class*="active"], [class*="filled"], [class*="selected"]') || 
                                                        btn.className.includes('active') || 
                                                        btn.ariaLabel?.includes('supprimer') || 
                                                        btn.ariaLabel?.includes('remove') ||
                                                        btn.ariaLabel?.includes('Favori enregistré');
                                        return !isLiked;
                                    });
                                    
                                    if (unliked.length === 0) {
                                        return { liked: 0, reason: "Aucun bouton favori disponible" };
                                    }
                                    
                                    // Choisir un élément aléatoire à liker
                                    const targetHeart = unliked[Math.floor(Math.random() * unliked.length)];
                                    targetHeart.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    await sleep(1500 + Math.random() * 1000);
                                    
                                    // Simuler le clic
                                    targetHeart.click();
                                    console.log("🎭 [WARMUP INJECT] Article liké !");
                                    await sleep(2000);
                                    
                                    return { liked: 1 };
                                } catch (e) {
                                    return { liked: 0, error: e.message };
                                }
                            }
                        }).then((results) => {
                            const res = results?.[0]?.result || { liked: 0 };
                            chrome.tabs.remove(tabId).catch(() => {});

                            if (res.liked > 0) {
                                chrome.storage.local.get(['warmupLikesToday'], (data) => {
                                    const newCount = (data.warmupLikesToday || 0) + 1;
                                    chrome.storage.local.set({ warmupLikesToday: newCount }, () => {
                                        console.log(`🎭 [WARMUP] 1 article liké avec succès (${newCount}/${target} aujourd'hui).`);
                                        saveLog(`🎭 Warm-up : 1 article liké (${newCount}/${target} aujourd'hui)`);
                                    });
                                });
                            } else {
                                console.log("🎭 [WARMUP] Aucun like effectué :", res.reason || res.error || "Inconnu");
                                saveLog("🎭 Warm-up : Aucun article liké lors du cycle");
                            }
                        }).catch(err => {
                            console.error("❌ [WARMUP] Erreur exécution script :", err);
                            chrome.tabs.remove(tabId).catch(() => {});
                        });
                    }, 5000);
                }
            });
        });
    });
}

/**
 * 🎭 Routine d'Auto-Like comportementale manuelle/automatique
 * Défile la page d'accueil ou de recherche Vinted et like exactement 2 articles.
 */
async function runAutoLike(force = false) {
    return new Promise(async (resolve, reject) => {
        chrome.storage.local.get(['botActive'], async (res) => {
            if (!res.botActive && !force) {
                console.log("😴 [AUTO-LIKE] Bot inactif, abandon.");
                return resolve({ success: false, error: "Bot inactif" });
            }

            // Récupérer le nom et domaine du bot actif
            let baseOrigin = "https://www.vinted.fr";
            const optimalTab = await getOptimalVintedTab();
            if (optimalTab && optimalTab.url) {
                try {
                    baseOrigin = new URL(optimalTab.url).origin;
                } catch(e){}
            }

            console.log(`🎭 [AUTO-LIKE] Lancement du cycle d'auto-like sur ${baseOrigin}...`);
            saveLog("🎭 Auto-Like : Début du cycle (2 articles)");

            chrome.tabs.create({ url: baseOrigin, active: false }, (likeTab) => {
                const tabId = likeTab.id;

                // Écouter le chargement de l'onglet fantôme
                chrome.tabs.onUpdated.addListener(function listener(tId, info) {
                    if (tId === tabId && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);

                        // Attendre 5 secondes que le flux (React) apparaisse
                        setTimeout(() => {
                            chrome.scripting.executeScript({
                                target: { tabId },
                                func: async () => {
                                    try {
                                        const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                                        let likedCount = 0;
                                        
                                        // Trouver les boutons favoris (cœur) non likés
                                        const getUnlikedHearts = () => {
                                            const hearts = Array.from(document.querySelectorAll('button[class*="favourite"], [data-testid*="favourite"], [data-testid*="favorite"], button[aria-label*="Favori"], button[aria-label*="favori"]'));
                                            return hearts.filter(btn => {
                                                const isLiked = btn.querySelector('[class*="active"], [class*="filled"], [class*="selected"]') || 
                                                                btn.className.includes('active') || 
                                                                btn.ariaLabel?.includes('supprimer') || 
                                                                btn.ariaLabel?.includes('remove') ||
                                                                btn.ariaLabel?.includes('Favori enregistré');
                                                return !isLiked;
                                            });
                                        };

                                        // 1. Simuler un défilement humain progressif pour charger les articles
                                        console.log("🎭 [AUTO-LIKE INJECT] Scrolling...");
                                        for (let i = 0; i < 5; i++) {
                                            window.scrollBy({ top: 400 + Math.random() * 200, behavior: 'smooth' });
                                            await sleep(1500 + Math.random() * 500);
                                        }

                                        let unliked = getUnlikedHearts();
                                        console.log(`🎭 [AUTO-LIKE INJECT] ${unliked.length} favoris éligibles.`);

                                        if (unliked.length < 2) {
                                            // Plus de scroll si pas assez
                                            for (let i = 0; i < 3; i++) {
                                                window.scrollBy({ top: 500, behavior: 'smooth' });
                                                await sleep(1500);
                                            }
                                            unliked = getUnlikedHearts();
                                        }

                                        if (unliked.length === 0) {
                                            return { liked: 0, reason: "Aucun article disponible pour le like" };
                                        }

                                        // Liker le premier article
                                        const firstHeart = unliked[0];
                                        firstHeart.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        await sleep(2000 + Math.random() * 1000);
                                        firstHeart.click();
                                        likedCount++;
                                        console.log("🎭 [AUTO-LIKE INJECT] Premier article liké");

                                        // Liker le deuxième article (s'il y en a un deuxième)
                                        if (unliked.length > 1) {
                                            await sleep(3000 + Math.random() * 1500); // Pause humaine entre les likes
                                            const secondHeart = unliked[1];
                                            secondHeart.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            await sleep(2000 + Math.random() * 1000);
                                            secondHeart.click();
                                            likedCount++;
                                            console.log("🎭 [AUTO-LIKE INJECT] Deuxième article liké");
                                        }

                                        return { liked: likedCount };
                                    } catch (e) {
                                        return { liked: 0, error: e.message };
                                    }
                                }
                            }).then((results) => {
                                const res = results?.[0]?.result || { liked: 0 };
                                chrome.tabs.remove(tabId).catch(() => {});

                                if (res.liked > 0) {
                                    console.log(`🎭 [AUTO-LIKE] ${res.liked} articles likés avec succès.`);
                                    saveLog(`🎭 Auto-Like : ${res.liked} articles likés avec succès`);
                                    resolve({ success: true, liked: res.liked });
                                } else {
                                    console.log("🎭 [AUTO-LIKE] Aucun like effectué :", res.reason || res.error || "Inconnu");
                                    saveLog(`🎭 Auto-Like : Aucun article liké (${res.reason || res.error || "Inconnu"})`);
                                    resolve({ success: false, error: res.reason || res.error || "Aucun article trouvé" });
                                }
                            }).catch(err => {
                                console.error("❌ [AUTO-LIKE] Erreur exécution script :", err);
                                chrome.tabs.remove(tabId).catch(() => {});
                                saveLog(`❌ Auto-Like : Erreur interne d'injection`);
                                reject(err);
                            });
                        }, 5000);
                    }
                });
            });
        });
    });
}

async function runMarketSpyLike(payload) {
    const { categories = [], priceMin = 40, maxItemsPerCategory = 30 } = payload;
    const likedItems = [];

    const stored = await chrome.storage.local.get(['spyLikedItemIds']);
    const alreadyLiked = new Set(stored.spyLikedItemIds || []);

    for (const cat of categories) {
        try {
            const catalogRes = await vintedFetch(
                `/api/v2/catalog/items?catalog_ids[]=${cat.id}&price_from=${priceMin}&per_page=96&order=newest_first&page=1`
            );
            const catalogData = await catalogRes.json();
            const items = (catalogData.items || []).filter(item => {
                if (alreadyLiked.has(String(item.id))) return false;
                const brand = (item.brand_title || '').toLowerCase().trim();
                return !brand || brand === 'no label' || brand === 'sans marque' || brand === 'no brand';
            }).slice(0, maxItemsPerCategory);

            for (const item of items) {
                try {
                    await vintedFetch(`/api/v2/items/${item.id}/favourite`, { method: 'POST' });
                    alreadyLiked.add(String(item.id));
                    likedItems.push({
                        itemId: String(item.id),
                        title: item.title || '',
                        price: parseFloat(item.price || 0),
                        categoryId: cat.id,
                        categoryName: cat.name,
                        photoUrl: item.photo?.url || (item.photos && item.photos[0]?.url) || '',
                        url: item.url || '',
                        brand: item.brand_title || null
                    });
                    await new Promise(r => setTimeout(r, 2000 + Math.floor(Math.random() * 2000)));
                } catch (e) {
                    console.warn(`[MARKET SPY] Erreur like item ${item.id}:`, e.message);
                }
            }
            await new Promise(r => setTimeout(r, 5000 + Math.floor(Math.random() * 5000)));
        } catch (e) {
            console.error(`[MARKET SPY] Erreur catégorie ${cat.id}:`, e.message);
        }
    }

    await chrome.storage.local.set({ spyLikedItemIds: [...alreadyLiked] });

    if (likedItems.length > 0) {
        try {
            const managerUrl = await getManagerApiUrl();
            const baseUrl = managerUrl.replace('/api/comptabilite/balance', '');
            await fetch(`${baseUrl}/api/extension/spy/liked`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: likedItems })
            });
            saveLog(`[MARKET SPY] ${likedItems.length} articles likés et enregistrés`);
        } catch (e) {
            console.warn('[MARKET SPY] Erreur rapport manager:', e.message);
        }
    }

    return { liked: likedItems.length };
}


