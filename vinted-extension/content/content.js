// Agent 2 : Le Manipulateur DOM (Content Script)

console.log("🤖 Vinted Pro Bot : Content script injecté !");

async function uniquifyImage(blob) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // On réduit de 1px pour modifier le hash de l'image (anti-détection)
            canvas.width = img.width - 1;
            canvas.height = img.height - 1;
            
            ctx.drawImage(img, 0, 0, img.width - 1, img.height - 1, 0, 0, img.width - 1, img.height - 1);
            
            canvas.toBlob((newBlob) => {
                URL.revokeObjectURL(img.src);
                resolve(newBlob);
            }, 'image/jpeg', 0.92); // Légère compression pour varier aussi les données
        };
        img.src = URL.createObjectURL(blob);
    });
}

function injectDashboardButton() {
    if (document.getElementById('vinted-bot-btn')) return;

    const isItemPage = window.location.href.includes('/items/') && !window.location.href.includes('/items/new');
    if (!isItemPage) return; // On affiche uniquement sur la page d'un article

    // Détection si l'article est vendu
    let isSold = false;
    const soldBadge = Array.from(document.querySelectorAll('span, div, h2')).find(el => 
        el.innerText.trim().toUpperCase() === 'VENDU' || 
        el.innerText.trim().toUpperCase() === 'SOLD' ||
        el.classList.contains('status--sold')
    );
    
    const buyButton = document.querySelector('[data-testid="item-buy-button"]');
    
    if (soldBadge || !buyButton) {
        isSold = true;
        console.log("🚩 Cet article semble être VENDU.");
    }

    // --- BOUTON FLOTTANT ---
    const botBtn = document.createElement('button');
    botBtn.id = 'vinted-bot-btn';
    botBtn.innerText = isSold ? '🔄 Republier' : '🤖 Actions Bot';
    botBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        background-color: #09b1ba;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        transition: transform 0.2s;
    `;
    
    botBtn.onmouseover = () => botBtn.style.transform = 'scale(1.05)';
    botBtn.onmouseout = () => botBtn.style.transform = 'scale(1)';

    // --- PANNEAU DASHBOARD ---
    const dashboard = document.createElement('div');
    dashboard.id = 'vinted-bot-dashboard';
    dashboard.style.cssText = `
        position: fixed;
        bottom: 70px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 999998;
        padding: 20px;
        display: none;
        font-family: Arial, sans-serif;
        color: #333;
    `;

    dashboard.innerHTML = `
        <h3 style="margin-top: 0; color: #09b1ba; border-bottom: 1px solid #eee; padding-bottom: 10px;">🤖 Vinted Pro Bot</h3>
        
        <div style="margin-top: 15px;">
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Actions API (Silencieuses) :</p>
            <button id="bot-extract-btn" style="width: 100%; padding: 10px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-weight: bold; text-align: left; margin-bottom: 10px; transition: 0.2s;">
                👯 Dupliquer l'annonce
            </button>
            ${isSold ? `
            <button id="bot-repost-fast-btn" style="width: 100%; padding: 10px; background: #09b1ba; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; text-align: left; transition: 0.2s;">
                🔄 Republier (Supprime l'ancien)
            </button>
            ` : ''}
        </div>
    `;

    botBtn.addEventListener('click', () => {
        dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
    });

    document.body.appendChild(botBtn);
    document.body.appendChild(dashboard);

    document.getElementById('bot-extract-btn').addEventListener('click', () => {
        extractItemData(false);
    });

    if (isSold) {
        document.getElementById('bot-repost-fast-btn').addEventListener('click', () => {
            extractItemData(true);
        });
    }
}

function extractItemData(isRepost = false) {
    const match = window.location.pathname.match(/\/items\/(\d+)/);
    const itemId = match ? match[1] : null;

    if (!itemId) {
        alert("Erreur : Impossible de trouver l'ID de l'article dans l'URL.");
        return;
    }

    if (isRepost) {
        const confirmMsg = confirm(`🔄 Veux-tu REPUBLIER cet article (#${itemId}) silencieusement via l'API ?\n\nL'ancien article sera supprimé et le nouveau publié instantanément en arrière-plan avec de nouveaux ID de photos (Anti-Spam Vinted).`);
        if (confirmMsg) {
            chrome.runtime.sendMessage({ action: "repostItemREST", itemId: itemId, options: { deleteAfter: true } }, (res) => {
                if (res && res.success) {
                    alert("✅ Article republié avec succès !\n\nNouveau lien : " + res.url);
                } else {
                    alert("❌ Échec du reposte : " + (res ? res.error : "Erreur inconnue"));
                }
            });
            alert("⏳ Le reposte furtif a été lancé en arrière-plan... \n\nLaisse cette page ouverte quelques instants (environ 10 secondes) pour que Vinted valide les nouvelles photos.");
        }
    } else {
        const confirmMsg = confirm(`👯 Veux-tu DUPLIQUER cet article (#${itemId}) silencieusement via l'API ?\n\nL'article original sera conservé.`);
        if (confirmMsg) {
            chrome.runtime.sendMessage({ action: "repostItemREST", itemId: itemId, options: { deleteAfter: false } }, (res) => {
                if (res && res.success) {
                    alert("✅ Article dupliqué avec succès !\n\nLien du duplicata : " + res.url);
                } else {
                    alert("❌ Échec de la duplication : " + (res ? res.error : "Erreur inconnue"));
                }
            });
            alert("⏳ La duplication furtive a été lancée en arrière-plan... \n\nLaisse cette page ouverte quelques instants.");
        }
    }
}

// Lancer l'injection une fois la page chargée
window.addEventListener('load', () => {
    setTimeout(injectDashboardButton, 1500);
});

// Écouteur pour extraire le Token CSRF et les données Vinted à la demande du Background Worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getCsrfToken") {
        // Méthode 1 : Meta Tag (Le plus courant et robuste)
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta && meta.content) {
            sendResponse({ token: meta.content });
            return true;
        }
        // Méthode 2 : Fallback dans les balises de scripts inline
        const re = /"csrf[_-]token"\s*[:,]\s*"([^"]+)"/;
        const scripts = document.querySelectorAll("script");
        for (let i = 0; i < scripts.length; i++) {
            const m = (scripts[i].textContent || "").match(re);
            if (m && m[1]) {
                sendResponse({ token: m[1] });
                return true;
            }
        }
        sendResponse({ token: null });
        return false;
    }

    // Lecture du Wallet depuis le contexte de la page (same-origin) — Multi-endpoint fallback
    if (request.action === "fetchWalletFromPage") {
        (async () => {
            // Extraire le CSRF token (requis par Vinted pour les endpoints financiers)
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.content : null;

            const headers = { Accept: "application/json" };
            if (csrfToken) {
                headers["X-CSRF-Token"] = csrfToken;
            }

            // Liste d'endpoints possibles, par ordre de priorité
            const endpoints = [
                "/api/v2/wallet",
                "/api/v2/wallet/balance",
                "/api/v2/wallet/history",
                "/api/v2/payments/wallet"
            ];

            for (const ep of endpoints) {
                try {
                    const r = await fetch(ep, { credentials: "include", headers });
                    if (!r.ok) continue;

                    const data = await r.json();
                    let pending = null, available = null;

                    // Parsing adaptatif selon la structure retournée
                    if (data.wallet) {
                        pending = parseFloat(data.wallet.pending_amount ?? data.wallet.pending ?? 0);
                        available = parseFloat(data.wallet.available_amount ?? data.wallet.available ?? 0);
                    } else if (data.balance && typeof data.balance === "object") {
                        pending = parseFloat(data.balance.pending ?? 0);
                        available = parseFloat(data.balance.available ?? 0);
                    } else {
                        pending = parseFloat(data.pending_amount ?? data.pending ?? 0);
                        available = parseFloat(data.available_amount ?? data.available ?? 0);
                    }

                    console.log(`[Vinted Extension] Wallet trouvé via ${ep} : Dispo=${available}, Attente=${pending}`);
                    sendResponse({ success: true, pending, available, endpoint: ep });
                    return;
                } catch (e) {
                    continue;
                }
            }

            // Dernier fallback : lire depuis le profil utilisateur
            try {
                const ur = await fetch("/api/v2/users/current", { credentials: "include", headers });
                if (ur.ok) {
                    const ud = await ur.json();
                    const user = ud.user || ud;
                    if (user.balance !== undefined || user.wallet_balance !== undefined) {
                        const available = parseFloat(user.balance ?? user.wallet_balance ?? 0);
                        sendResponse({ success: true, pending: 0, available, endpoint: "users/current" });
                        return;
                    }
                }
            } catch (e) {}

            sendResponse({ success: false, error: "Aucun endpoint wallet n'a répondu (tous 403/404)" });
        })();
        return true;
    }

    // Lecture de l'identité Vinted depuis le contexte de la page
    if (request.action === "fetchUserFromPage") {
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        const csrfToken = csrfMeta ? csrfMeta.content : null;
        const headers = { Accept: "application/json" };
        if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

        fetch("/api/v2/users/current", { credentials: "include", headers })
            .then(r => {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.json();
            })
            .then(data => {
                const user = data.user || data;
                sendResponse({ 
                    success: true, 
                    username: user.login || user.username, 
                    id: String(user.id) 
                });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    return false;
});

