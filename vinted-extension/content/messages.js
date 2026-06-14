// Script pour automatiser les messages sur Vinted — V6 ENTER KEY + REMOTE LOGS

// === REMOTE LOG : envoie les logs au Service Worker pour tout voir au même endroit ===
function ghostLog(msg) {
    console.log(msg);
    try {
        chrome.runtime.sendMessage({ action: "ghostLog", log: msg });
    } catch(e) {}
}

ghostLog("🤖 [MESSAGES.JS V6] Script chargé sur : " + window.location.href);

// === HELPER API INVISIBLE ===
function extractConversationIds() {
    const match = window.location.pathname.match(/\/(?:inbox|messages)\/(\d+)/);
    const conversationId = match ? match[1] : null;

    let itemId = null;
    const itemLink = document.querySelector('a[href*="/items/"]');
    if (itemLink) {
        const itemMatch = itemLink.href.match(/\/items\/(\d+)/);
        if (itemMatch) itemId = itemMatch[1];
    }
    return { conversationId, itemId };
}

function dispatchMessageAndOfferREST(conversationId, itemId, text, offerPrice) {
    if (!conversationId) {
        ghostLog("❌ [API] conversationId introuvable !");
        return;
    }
    
    ghostLog(`🤖 [API] Envoi message furtif (conv: ${conversationId})...`);
    chrome.runtime.sendMessage({ action: "sendMessageREST", conversationId: conversationId, text: text }, (resMsg) => {
        if (!resMsg || !resMsg.success) {
            ghostLog("❌ [API] Échec envoi message : " + (resMsg ? resMsg.error : "Inconnu"));
            return;
        }
        ghostLog("✅ [API] Message furtif envoyé !");
        
        if (itemId && offerPrice > 0) {
            setTimeout(() => {
                ghostLog(`🤝 [API] Envoi offre furtive de ${offerPrice}€ (item: ${itemId})...`);
                chrome.runtime.sendMessage({ action: "sendOfferREST", itemId: itemId, price: offerPrice }, (resOffer) => {
                    if (!resOffer || !resOffer.success) {
                        ghostLog("❌ [API] Échec envoi offre : " + (resOffer ? resOffer.error : "Inconnu"));
                    } else {
                        ghostLog("✅ [API] Offre furtive envoyée !");
                    }
                });
            }, 1000);
        }
    });
}


// === FONCTION PRINCIPALE ===
function injectAutoMessageButton() {
    if (document.getElementById('vinted-bot-msg-container')) return;

    const url = window.location.href;
    const isMessagePage = url.includes('/inbox') || url.includes('/messages');
    const isItemPage = url.includes('/items/') && !url.includes('/items/new');
    const isGhostMode = url.includes('ghost=1');
    const isGeminiMode = url.includes('gemini=1');
    
    ghostLog("📍 [PAGE] inbox=" + isMessagePage + " | item=" + isItemPage + " | ghost=" + isGhostMode + " | gemini=" + isGeminiMode);
    
    if (!isMessagePage && !isItemPage) return;

    if (isItemPage) handleItemPage();

    const textarea = document.querySelector('textarea[name="message"]') || document.querySelector('textarea');
    
    if (textarea) {
        ghostLog("✅ [PAGE] Textarea trouvé ! Tag=" + textarea.tagName + " name=" + textarea.name);
        // On ne crée plus les boutons visuels, l'extension gère tout silencieusement en arrière-plan.
        const sendAutoMessage = () => {
            ghostLog("💬 [AUTO] Lancement génération message personnalisé + offre (API INVISIBLE)...");
            
            let itemName = "cet article";
            let originalPrice = 0;
            let buyerName = "";

            // Extraction du Pseudo Acheteur
            const userHeader = document.querySelector('h2') || document.querySelector('[data-testid="conversation-user-name"]');
            if (userHeader) buyerName = userHeader.innerText.trim();

            // Extraction du Nom de l'Article
            const titleEl = document.querySelector('.u-text-wrap') || document.querySelector('[data-testid="item-title"]');
            if (titleEl) itemName = titleEl.innerText.trim();

            // Extraction du Prix
            const priceEl = document.querySelector('[data-testid="item-price"]') || document.querySelector('.u-title-4');
            if (priceEl) {
                const priceMatch = priceEl.innerText.replace(/[^\d.,]/g, '').replace(',', '.');
                if (priceMatch) originalPrice = parseFloat(priceMatch);
            }

            // Calcul de l'offre (Prix - 10€, minimum 1€)
            let offerPrice = originalPrice - 10;
            if (offerPrice < 1) offerPrice = 1;

            const message = `Hello ! Merci pour ton intérêt pour mon article ${itemName} 😊. Je fais un petit tri dans mon dressing, du coup je te propose de te le laisser pour ${offerPrice} au lieu de ${originalPrice}. Si ça te tente, n'hésite pas, l'envoi sera rapide ! Belle journée, ${buyerName}`;

            ghostLog(`💬 [AUTO] Paramètres extraits : convId/itemId en cours...`);
            const ids = extractConversationIds();
            dispatchMessageAndOfferREST(ids.conversationId, ids.itemId, message, offerPrice);
            
            // Recharger la page pour voir le message après 3s
            setTimeout(() => location.reload(), 3000);
        };

        // --- AUTO-TRIGGER ---
        chrome.storage.local.get(['botActive'], (result) => {
            ghostLog("🤖 [TRIGGER] botActive=" + result.botActive + " ghost=" + isGhostMode);
            
            if (result.botActive) {
                if (isGeminiMode) {
                    ghostLog("🤖 [GEMINI] MODE RÉPONSE IA ACTIVÉ");
                    const urlParams = new URLSearchParams(window.location.search);
                    const textToReply = urlParams.get('reply_text');
                    const offerPrice = urlParams.get('offer_price');
                    
                    if (textToReply) {
                        const decodedText = decodeURIComponent(textToReply);
                        ghostLog(`✍️ [GEMINI] Injection via API INVISIBLE : "${decodedText.substring(0, 30)}..."`);
                        
                        const ids = extractConversationIds();
                        const parsedOffer = offerPrice ? parseFloat(offerPrice) : 0;
                        dispatchMessageAndOfferREST(ids.conversationId, ids.itemId, decodedText, parsedOffer);
                        
                        setTimeout(() => location.reload(), 3000);
                    } else {
                        ghostLog("⚠️ [GEMINI] Aucun texte trouvé dans 'reply_text'");
                    }
                    return;
                }

                if (isGhostMode) {
                    ghostLog("👻 [GHOST] MODE FANTÔME → Analyse renforcée dans 6s...");
                    // On augmente à 6s car les onglets en arrière-plan chargent plus lentement (React lag)
                    setTimeout(() => {
                        // 1. Sélecteurs Classiques
                        const classicBubbles = document.querySelectorAll('.message-bubble, [class*="MessageBody"]');
                        
                        // 2. Sélecteurs Modernes & Alternatifs (Plus large)
                        const wideBubbles = document.querySelectorAll('[class*="ConversationItem"], [class*="chat-bubble"], [data-testid*="message"], [data-testid*="thread-item"]');
                        
                        // 3. Détection textuelle (Indicateurs formels d'historique)
                        const pageText = document.body.innerText;
                        const hasTranslateLink = pageText.includes("Traduire la conversation") || pageText.includes("See translation");
                        const hasFullDate = /\d{2}\/\d{2}\/20\d{2}/.test(pageText); // Ex: 11/05/2026 qui n'apparait que dans les séparateurs de chat

                        ghostLog(`📊 [DIAGNOSTIC] Bulles Classiques:${classicBubbles.length} | Larges:${wideBubbles.length} | Traduire:${hasTranslateLink} | Date:${hasFullDate}`);

                        const hasHistory = classicBubbles.length > 0 || wideBubbles.length > 0 || hasTranslateLink || hasFullDate;

                        if (!hasHistory) {
                            ghostLog("✅ [GHOST] Historique vierge à 100%. Envoi du message auto...");
                            sendAutoMessage();
                        } else {
                            ghostLog("🛑 [GHOST] HISTORIQUE DÉTECTÉ (Preuve trouvée). Abandon de la mission.");
                        }
                    }, 6000);
                } else if (isItemPage) {
                    ghostLog("🤖 [BOT] Page article → envoi auto dans 2s");
                    setTimeout(sendAutoMessage, 2000);
                } else {
                    // On ne déclenche l'envoi automatique que si l'utilisateur provient d'un clic automatisé sur "Contacter" (MacroDroid)
                    const isAutoRedirect = sessionStorage.getItem('vinted_bot_auto_contact') === 'true';
                    
                    if (isAutoRedirect) {
                        ghostLog("🤖 [BOT] Redirection automatique détectée. Envoi du message autorisé.");
                        sessionStorage.removeItem('vinted_bot_auto_contact');
                        
                        const msgs = document.querySelectorAll('.message-bubble, [class*="MessageBody"]');
                        if (msgs.length === 0) {
                            setTimeout(sendAutoMessage, 1000);
                        }
                    } else {
                        ghostLog("🛑 [BOT] Navigation manuelle détectée sur l'Inbox. Auto-message bloqué par sécurité.");
                    }
                }
            }
        });
    } else {
        ghostLog("⚠️ [PAGE] Aucun textarea trouvé");
    }
}

function handleItemPage() {
    if (window.vintedBotContactClicked) return;
    const contactBtn = document.querySelector('button[data-testid="item-message-button"]') || 
                       document.querySelector('button[data-testid="item-contact-button"]') ||
                       Array.from(document.querySelectorAll('button')).find(btn => {
                           const t = btn.innerText.toLowerCase();
                           return t.includes('message') || t.includes('contacter');
                       });
    if (contactBtn) {
        chrome.storage.local.get(['botActive'], (r) => {
            if (r.botActive) {
                ghostLog("🤖 [ITEM] Bouton contact trouvé, clic...");
                window.vintedBotContactClicked = true;
                sessionStorage.setItem('vinted_bot_auto_contact', 'true');
                contactBtn.click();
            }
        });
    }
}

function prepareAIResponse(textarea, autoSend = false) {
    const messages = Array.from(document.querySelectorAll('.message-bubble, [class*="MessageBody"]'));
    const last = messages.reverse().find(m => !m.classList.contains('message-bubble--right'));
    if (!last) return;
    const text = last.innerText.trim();
    chrome.storage.local.get(['negoThreshold'], (r) => {
        const threshold = r.negoThreshold || 15;
        const offer = text.match(/(\d+(?:[.,]\d+)?)\s*€/);
        const offerPrice = offer ? parseFloat(offer[1].replace(',', '.')) : null;
        const priceEl = document.querySelector('[data-testid="item-price"], .u-title-4');
        const origPrice = priceEl ? parseFloat(priceEl.innerText.replace(/[^\d.,]/g, '').replace(',', '.')) : null;
        let msg = "D'accord. Seriez-vous prêt à me faire une offre concrète ?";
        let finalOfferPrice = null;
        if (offerPrice && origPrice) {
            const disc = ((origPrice - offerPrice) / origPrice) * 100;
            if (disc <= threshold) {
                msg = `Votre offre à ${offerPrice}€ me convient !`;
                finalOfferPrice = offerPrice;
            } else {
                const lowest = Math.round(origPrice * (1 - threshold/100));
                msg = `Je peux descendre jusqu'à ${lowest}€.`;
                finalOfferPrice = lowest;
            }
        }
        
        if (autoSend) {
            const ids = extractConversationIds();
            dispatchMessageAndOfferREST(ids.conversationId, ids.itemId, msg, finalOfferPrice);
            setTimeout(() => location.reload(), 3000);
        } else {
            // S'il n'y a pas d'auto-envoi, on n'a plus l'ancien système d'écriture UI, donc on log juste.
            ghostLog("🤖 [GEMINI] Réponse préparée mais autoSend est false.");
        }
    });
}

setTimeout(injectAutoMessageButton, 3000);

let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        window.vintedBotContactClicked = false;
        setTimeout(injectAutoMessageButton, 3000);
    } else {
        injectAutoMessageButton();
    }
}).observe(document, {subtree: true, childList: true});
