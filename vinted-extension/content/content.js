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

    const isSellPage = window.location.href.includes('/items/new');
    const isItemPage = window.location.href.includes('/items/') && !isSellPage;

    // On n'affiche le bouton Actions Bot QUE sur les fiches articles (pour extraire) 
    // ou la page de vente (pour coller). Partout ailleurs, on garde l'interface propre !
    if (!isSellPage && !isItemPage) return;

    // Détection si l'article est vendu
    let isSold = false;
    if (isItemPage) {
        // Vinted utilise souvent des badges ou des textes spécifiques
        const soldBadge = Array.from(document.querySelectorAll('span, div, h2')).find(el => 
            el.innerText.trim().toUpperCase() === 'VENDU' || 
            el.innerText.trim().toUpperCase() === 'SOLD' ||
            el.classList.contains('status--sold')
        );
        
        // Autre indicateur : le bouton d'achat est absent et on est sur une page item
        const buyButton = document.querySelector('[data-testid="item-buy-button"]');
        
        if (soldBadge || (!buyButton && isItemPage)) {
            isSold = true;
            console.log("🚩 Cet article semble être VENDU.");
        }
    }

    // --- BOUTON FLOTTANT ---
    const botBtn = document.createElement('button');
    botBtn.id = 'vinted-bot-btn';
    botBtn.innerText = isSellPage ? '🤖 Coller l\'annonce' : (isSold ? '🔄 Republier' : '🤖 Actions Bot');
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

    // Mode "Page de vente" : Un seul bouton pour coller
    if (isSellPage) {
        botBtn.addEventListener('click', () => {
            fillSellForm();
        });
        document.body.appendChild(botBtn);
        return;
    }

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

    if (isItemPage) {
        dashboard.innerHTML = `
            <h3 style="margin-top: 0; color: #09b1ba; border-bottom: 1px solid #eee; padding-bottom: 10px;">🤖 Vinted Pro Bot</h3>
            
            <div style="margin-top: 15px;">
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Actions disponibles :</p>
                <button id="bot-extract-btn" style="width: 100%; padding: 10px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 6px; cursor: pointer; font-weight: bold; text-align: left; margin-bottom: 10px; transition: 0.2s;">
                    📥 Extraire cette annonce
                </button>
                ${isSold ? `
                <button id="bot-repost-fast-btn" style="width: 100%; padding: 10px; background: #09b1ba; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; text-align: left; transition: 0.2s;">
                    🔄 Republier immédiatement
                </button>
                ` : ''}
            </div>
        `;
    } else {
        dashboard.innerHTML = `
            <h3 style="margin-top: 0; color: #09b1ba; border-bottom: 1px solid #eee; padding-bottom: 10px;">🤖 Vinted Pro Bot</h3>
            <p style="font-size: 14px; color: #666; margin-top: 15px;">Veuillez ouvrir la page d'un article spécifique.</p>
        `;
    }

    botBtn.addEventListener('click', () => {
        dashboard.style.display = dashboard.style.display === 'none' ? 'block' : 'none';
    });

    document.body.appendChild(botBtn);
    document.body.appendChild(dashboard);

    if (isItemPage) {
        document.getElementById('bot-extract-btn').addEventListener('click', () => {
            extractItemData();
        });

        if (isSold) {
            const fastBtn = document.getElementById('bot-repost-fast-btn');
            fastBtn.addEventListener('click', () => {
                extractItemData(true);
            });
        }
    }
}

function extractItemData(immediateRedirect = false) {
    try {
        // --- Titre ---
        let title = "Titre non trouvé";
        // Utiliser les meta tags est beaucoup plus fiable car Vinted change souvent ses classes HTML
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) {
            title = metaTitle.content.split(' - ')[0]; // Retire la marque et "Vinted"
        }

        // --- Prix ---
        let price = "Prix non trouvé";
        const metaPrice = document.querySelector('meta[property="product:price:amount"]') || document.querySelector('meta[property="og:price:amount"]');
        if (metaPrice) {
            price = metaPrice.content + " €";
        } else {
            // Plan B : chercher dans le texte court
            const priceElements = Array.from(document.querySelectorAll('div, span, h1, h2')).filter(el => el.innerText && el.innerText.includes('€') && el.innerText.length < 10);
            if (priceElements.length > 0) {
                price = priceElements[priceElements.length - 1].innerText.trim(); 
            }
        }

        // --- Description ---
        let description = "";
        const metaDesc = document.querySelector('meta[property="og:description"]');
        if (metaDesc) {
            description = metaDesc.content;
        }

        // --- Détails (Marque, Taille, État, Couleur, Matériau) ---
        let brand = "Marque non trouvée";
        let size = "Taille non trouvée";
        let condition = "État non trouvé";
        let color = "Couleur non trouvée";
        let material = "Matériau non trouvé";

        const detailItems = document.querySelectorAll('.details-list__item');
        detailItems.forEach(item => {
            const labelEl = item.querySelector('.details-list__item-label');
            const valueEl = item.querySelector('.details-list__item-value');
            
            if (labelEl && valueEl) {
                const label = labelEl.innerText.trim();
                const value = valueEl.innerText.trim();
                
                console.log('Label détecté : ' + label);
                
                const lowerLabel = label.toLowerCase();
                if (lowerLabel.includes('marque')) brand = value;
                else if (lowerLabel.includes('taille')) size = value;
                else if (lowerLabel.includes('état') || lowerLabel.includes('etat')) condition = value;
                else if (lowerLabel.includes('couleur')) color = value;
                else if (lowerLabel.includes('matière') || lowerLabel.includes('matériau')) material = value;
            }
        });

        // --- Images ---
        const images = Array.from(document.querySelectorAll(".item-thumbnail img")).map(img => img.src);

        const itemData = { title, price, description, brand, size, condition, color, material, images, url: window.location.href };
        chrome.storage.local.set({ copiedItem: itemData }, () => {
            if (immediateRedirect) {
                window.location.href = "https://www.vinted.fr/items/new";
            } else {
                const goToSell = confirm(`✅ Annonce extraite :\nTitre : ${title}\nPrix : ${price}\nMarque : ${brand}\nTaille : ${size}\nÉtat : ${condition}\nCouleur : ${color}\nMatériau : ${material}\nImages : ${images.length} trouvées\n\nVeux-tu ouvrir la page "Vendre" pour la republier maintenant ?`);
                if (goToSell) {
                    window.location.href = "https://www.vinted.fr/items/new";
                }
            }
        });

    } catch (error) {
        console.error("Erreur lors de l'extraction", error);
        alert("Erreur lors de l'extraction de l'annonce.");
    }
}

async function selectVintedOption(labelSearch, valueToSelect) {
    if (!valueToSelect || valueToSelect.includes('non trouvé')) return;

    console.log(`🔍 Tentative de sélection pour ${labelSearch} : ${valueToSelect}`);

    try {
        // Trouver le conteneur du champ basé sur le label
        const allItems = Array.from(document.querySelectorAll('.u-form-item, .form-group, .cell-title, label'));
        let container = allItems.find(el => el.innerText.toLowerCase().includes(labelSearch.toLowerCase()));

        if (!container) {
            // Recherche élargie
            const labels = Array.from(document.querySelectorAll('.u-title, .u-label, span'));
            const labelEl = labels.find(el => el.innerText.trim().toLowerCase() === labelSearch.toLowerCase());
            if (labelEl) container = labelEl.closest('.u-form-item, .form-group') || labelEl.parentElement;
        }

        if (!container) return;

        // Trouver le trigger (input ou div cliquable)
        const trigger = container.querySelector('input, [role="button"], .u-input, .c-input, .u-flexbox');
        if (!trigger) return;

        trigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
        trigger.click();
        
        await new Promise(r => setTimeout(r, 800)); // Attendre l'ouverture

        // Si c'est un input (Marque), on tape le texte
        if (trigger.tagName === 'INPUT') {
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(trigger, valueToSelect);
            trigger.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise(r => setTimeout(r, 1200)); // Attendre les suggestions
        }

        // Chercher l'option dans les menus déroulants
        // On cherche dans tout le document car les menus sont souvent des portails
        const options = Array.from(document.querySelectorAll('.u-dropdown-item, .c-list-item, .u-list-item__title, [role="option"], .u-flexbox'));
        const option = options.find(el => {
            const text = el.innerText.trim().toLowerCase();
            const target = valueToSelect.toLowerCase();
            return text === target || text.includes(target);
        });
        
        if (option) {
            option.click();
            console.log(`✅ ${labelSearch} sélectionné : ${valueToSelect}`);
        } else {
            console.warn(`⚠️ Option "${valueToSelect}" non trouvée pour "${labelSearch}"`);
        }
    } catch (e) {
        console.error(`Erreur lors de la sélection de ${labelSearch} :`, e);
    }
}

async function fillSellForm() {
    chrome.storage.local.get(['copiedItem'], async (result) => {
        const item = result.copiedItem;
        if (!item) {
            alert("Aucune annonce n'a été copiée ! Va sur une annonce et clique sur 'Extraire cette annonce'.");
            return;
        }

        console.log("🚀 Début du remplissage du formulaire...");

        // Remplir le titre
        const titleInput = document.querySelector('input[name="title"]') || document.querySelector('input[id="title"]');
        if (titleInput) {
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(titleInput, item.title);
            titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Remplir la description
        const descInput = document.querySelector('textarea[name="description"]') || document.querySelector('textarea[id="description"]');
        if (descInput) {
            Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(descInput, item.description);
            descInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Remplir le prix
        const priceInput = document.querySelector('input[name="price"]') || document.querySelector('input[id="price"]');
        if (priceInput && item.price) {
            let cleanPrice = item.price.replace(/[^\d.,]/g, '').replace(',', '.');
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(priceInput, cleanPrice);
            priceInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Remplir les menus (Marque, Taille, État, Couleur)
        // Note: l'ordre est important car certains champs dépendent d'autres
        await selectVintedOption('Marque', item.brand);
        await selectVintedOption('Taille', item.size);
        await selectVintedOption('État', item.condition);
        await selectVintedOption('Couleur', item.color);

        // Support des photos
        if (item.images && item.images.length > 0) {
            console.log("📸 [CONTENT] Tentative de téléchargement de " + item.images.length + " photos...");
            
            const dt = new DataTransfer();
            const fileInput = document.querySelector('input[type="file"]');

            if (fileInput) {
                console.log("📸 [CONTENT] Input file trouvé, début du traitement des images...");
                for (const [index, url] of item.images.entries()) {
                    await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ action: 'downloadImage', url: url }, async (response) => {
                            if (response && response.base64) {
                                try {
                                    const res = await fetch(response.base64);
                                    let blob = await res.blob();
                                    
                                    // Application de uniquifyImage
                                    console.log(`📸 [CONTENT] Modification de l'image ${index}...`);
                                    blob = await uniquifyImage(blob);
                                    
                                    const extension = url.split('.').pop().split('?')[0] || 'jpg';
                                    const file = new File([blob], `photo_${index}.${extension}`, { type: blob.type });
                                    dt.items.add(file);
                                } catch (err) {
                                    console.error(`📸 [CONTENT] Erreur conversion photo ${index} :`, err);
                                }
                            }
                            resolve();
                        });
                    });
                }

                if (dt.items.length > 0) {
                    fileInput.files = dt.files;
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log("✅ [CONTENT] Photos ajoutées !");
                }
            }
        }

        alert("✅ Formulaire rempli ! Vérifie bien la Catégorie si elle n'a pas été détectée automatiquement.");
    });
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
        fetch("/api/v2/users/current", { credentials: "include", headers: { Accept: "application/json" } })
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

