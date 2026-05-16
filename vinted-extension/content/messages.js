// Script pour automatiser les messages sur Vinted — V6 ENTER KEY + REMOTE LOGS

// === REMOTE LOG : envoie les logs au Service Worker pour tout voir au même endroit ===
function ghostLog(msg) {
    console.log(msg);
    try {
        chrome.runtime.sendMessage({ action: "ghostLog", log: msg });
    } catch(e) {}
}

ghostLog("🤖 [MESSAGES.JS V6] Script chargé sur : " + window.location.href);

// === FONCTION CRITIQUE : Écrire dans un textarea React ===
function setReactTextareaValue(textarea, value) {
    ghostLog("✍️ [REACT] Écriture dans le textarea...");
    
    // Méthode 1 : Native Input Value Setter (contourne React)
    const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
    )?.set;
    
    if (nativeSetter) {
        nativeSetter.call(textarea, value);
        ghostLog("✍️ [REACT] nativeSetter OK");
    } else {
        textarea.value = value;
        ghostLog("✍️ [REACT] fallback .value");
    }
    
    // Focus le textarea pour que Vinted le reconnaisse
    textarea.focus();
    
    // Déclencher les événements React
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    ghostLog("✍️ [REACT] Valeur : " + textarea.value.substring(0, 50) + "...");
}

// === FONCTION : Envoyer le message avec Entrée (le plus fiable) ===
function sendMessageWithEnter(textarea) {
    ghostLog("🚀 [SEND] Envoi par touche Entrée...");
    
    textarea.focus();
    
    // Simuler Entrée (c'est ce que fait un vrai utilisateur)
    const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter', 
        keyCode: 13, 
        which: 13,
        bubbles: true,
        cancelable: true
    });
    textarea.dispatchEvent(enterEvent);
    
    ghostLog("✅ [SEND] Touche Entrée envoyée !");
    
    // Vérifier après 2s si le message est parti (textarea vidé)
    setTimeout(() => {
        if (textarea.value === '' || textarea.value.length < 5) {
            ghostLog("🎉 [SEND] Message envoyé avec succès ! (textarea vidé)");
        } else {
            ghostLog("⚠️ [SEND] Entrée n'a pas marché, tentative bouton...");
            clickSendButton(textarea);
        }
    }, 2000);
}

// === FONCTION FALLBACK : Cliquer sur le bouton Envoyer ===
function clickSendButton(textarea) {
    const allButtons = document.querySelectorAll('button');
    ghostLog("🔍 [SEND-BTN] " + allButtons.length + " boutons trouvés");
    
    // Log tous les boutons pour debug
    allButtons.forEach((btn, i) => {
        const text = btn.innerText.trim();
        const testId = btn.getAttribute('data-testid') || '';
        const hasSvg = btn.querySelector('svg') ? 'SVG' : '';
        const disabled = btn.disabled ? 'OFF' : 'ON';
        if (text || testId || hasSvg) {
            ghostLog(`   📌 [${i}] "${text}" testid=${testId} ${hasSvg} ${disabled}`);
        }
    });
    
    const sendBtn = 
        document.querySelector('button[data-testid="message-send"]') || 
        document.querySelector('button[data-testid="send-message-button"]') ||
        document.querySelector('button[type="submit"]') ||
        // Chercher bouton SVG près du textarea
        (() => {
            if (textarea) {
                const form = textarea.closest('form');
                if (form) return form.querySelector('button[type="submit"], button:last-child');
                // Chercher le bouton frère du textarea
                const parent = textarea.parentElement;
                if (parent) {
                    const sibling = parent.nextElementSibling;
                    if (sibling?.tagName === 'BUTTON') return sibling;
                    const btn = parent.querySelector('button') || parent.parentElement?.querySelector('button:not([id^="vinted-bot"])');
                    if (btn) return btn;
                }
            }
            return null;
        })() ||
        Array.from(allButtons).find(btn => 
            btn.querySelector('svg') && btn.innerText.trim().length < 3 && !btn.disabled && 
            !btn.id.startsWith('vinted-bot')
        );
    
    if (sendBtn) {
        ghostLog("🚀 [SEND-BTN] Bouton trouvé : " + sendBtn.outerHTML.substring(0, 150));
        sendBtn.click();
        ghostLog("✅ [SEND-BTN] CLIC !");
    } else {
        ghostLog("❌ [SEND-BTN] Aucun bouton trouvé");
        // DERNIER RECOURS : submit le form
        const form = textarea?.closest('form');
        if (form) {
            ghostLog("🔄 [SEND-FORM] Tentative form.submit()...");
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    }
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
            const message = "Bonjour, j'ai vu que cet article te plaisait ! As-tu des questions ?";
            ghostLog("💬 [AUTO] Lancement envoi message auto...");
            
            setReactTextareaValue(textarea, message);
            
            // Attendre que React digère, puis envoyer avec Entrée
            setTimeout(() => {
                ghostLog("💬 [AUTO] Textarea prêt, envoi...");
                sendMessageWithEnter(textarea);
            }, 1500);
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
                        ghostLog(`✍️ [GEMINI] Écriture de la réponse IA : "${decodedText.substring(0, 30)}..."`);
                        setTimeout(() => {
                            setReactTextareaValue(textarea, decodedText);
                            setTimeout(() => {
                                sendMessageWithEnter(textarea);
                                
                                // Si une offre de prix a été négociée par l'IA, on la déclenche juste après
                                if (offerPrice) {
                                    ghostLog(`🎯 [GEMINI] Planification de l'offre à ${offerPrice}€ dans 4 secondes...`);
                                    setTimeout(() => {
                                        triggerOfferAutomation(offerPrice);
                                    }, 4000);
                                }
                            }, 1500);
                        }, 4000);
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
        if (offerPrice && origPrice) {
            const disc = ((origPrice - offerPrice) / origPrice) * 100;
            msg = disc <= threshold 
                ? `Votre offre à ${offerPrice}€ me convient !` 
                : `Je peux descendre jusqu'à ${Math.round(origPrice * (1 - threshold/100))}€.`;
        }
        setReactTextareaValue(textarea, msg);
        if (autoSend) setTimeout(() => sendMessageWithEnter(textarea), 1500);
    });
}

// === FONCTION : Déclencher l'offre de prix sur l'article (Faire une offre) ===
function triggerOfferAutomation(price) {
    ghostLog(`🎯 [OFFER] Automatisation de l'offre à ${price}€ déclenchée !`);
    
    // 1. Chercher le bouton "Faire une offre" dans le bandeau produit en haut
    const allButtons = Array.from(document.querySelectorAll('button, a'));
    const offerBtn = allButtons.find(btn => {
        const text = btn.innerText.trim().toLowerCase();
        return text === 'faire une offre' || text === 'make an offer';
    });
    
    if (!offerBtn) {
        ghostLog("❌ [OFFER] Bouton 'Faire une offre' introuvable sur la page.");
        return;
    }
    
    ghostLog("🎯 [OFFER] Bouton cliqué, attente du modal...");
    offerBtn.click();
    
    // 2. Attendre l'ouverture du modal (2.5s)
    setTimeout(() => {
        ghostLog("🎯 [OFFER] Analyse du modal de négociation...");
        
        // Étape A : Forcer le clic sur la carte "Autre / Propose un prix" pour activer le mode libre
        const allElements = Array.from(document.querySelectorAll('div[role="dialog"] *, .ui-modal *'));
        const autreBtn = allElements.find(el => {
            const text = el.innerText?.trim().toLowerCase() || '';
            return text === 'autre' || text === 'propose un prix' || text === 'propose a price' || text === 'other';
        });
        
        if (autreBtn) {
            ghostLog("🎯 [OFFER] Clic forcé sur la carte 'Autre'...");
            autreBtn.click();
        }
        
        // Étape B : Attendre 2s pour l'activation stable de l'input libre
        setTimeout(() => {
            ghostLog("🎯 [OFFER] Recherche de la zone d'édition...");
            
            // Vérifier si un tag input classique est accessible directement
            let input = document.querySelector('div[role="dialog"] input') || 
                        document.querySelector('.ui-modal input') ||
                        document.querySelector('input[name="price"]') || 
                        document.querySelector('input[type="number"]') ||
                        document.querySelector('input[type="text"]') ||
                        document.querySelector('input[type="tel"]');
                        
            if (!input) {
                ghostLog("⚠️ [OFFER] Aucun input direct. Recherche de la zone de prix hors cartes...");
                
                // Chercher les éléments courts affichant des montants en Euros
                const rawPriceElements = Array.from(document.querySelectorAll('div[role="dialog"] *, .ui-modal *')).filter(el => {
                    const text = el.innerText?.trim() || '';
                    const hasEuro = text.includes('€');
                    const hasDigits = /\d+/.test(text);
                    const isShort = text.length < 15 && text.length > 1;
                    
                    return hasEuro && hasDigits && isShort;
                });
                
                // 🛡️ ISOLATION ABSOLUE : Exclure tous les éléments situés à l'intérieur d'une carte de réduction !
                const finalPriceTrigger = rawPriceElements.find(el => {
                    let parent = el.parentElement;
                    while (parent && parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
                        const parentText = parent.innerText || '';
                        // Si un parent mentionne '%' ou 'réduction' ou 'autre', c'est une carte du haut -> À BANNIR
                        if (parentText.includes('%') || parentText.toLowerCase().includes('réduction') || parentText.toLowerCase().includes('autre')) {
                            return false; 
                        }
                        parent = parent.parentElement;
                    }
                    return true; // Cet élément est hors des cartes, c'est la bonne zone de prix !
                });
                
                if (finalPriceTrigger) {
                    ghostLog(`🎯 [OFFER] Zone prix hors cartes trouvée ('${finalPriceTrigger.innerText}'). Clic de réveil...`);
                    finalPriceTrigger.click();
                    try { finalPriceTrigger.focus(); } catch(e) {}
                    
                    // Attendre 1s après clic de réveil
                    setTimeout(() => {
                        const nestedInput = document.querySelector('div[role="dialog"] input, .ui-modal input, input[type="text"], input[type="number"]');
                        if (nestedInput) {
                            executePriceInjection(nestedInput, price);
                        } else {
                            ghostLog("❌ [OFFER] Échec : Toujours aucun input détecté après réveil.");
                        }
                    }, 1000);
                    return;
                }
            }
            
            if (input) {
                executePriceInjection(input, price);
            } else {
                ghostLog("❌ [OFFER] Zone d'écriture introuvable.");
            }
            
        }, 2000);
    }, 2500);

    // --- SOUS-ROUTINE D'INJECTION ET VALIDATION PAR FRACTION DE CLAVIER (EXECCOMMAND) ---
    function executePriceInjection(targetElement, targetPrice) {
        ghostLog(`🎯 [OFFER] Début de l'écriture du prix ${targetPrice}€...`);
        
        // 1. Focus et Simulation physique du curseur
        targetElement.focus();
        try { targetElement.click(); } catch(e) {}
        
        // 2. Tenter de sélectionner tout le texte existant (le prix de base) pour le remplacer
        try {
            if (typeof targetElement.select === 'function') {
                targetElement.select();
            } else if (typeof targetElement.setSelectionRange === 'function') {
                targetElement.setSelectionRange(0, String(targetElement.value || "").length);
            }
        } catch(err) {
            ghostLog("⚠️ [OFFER] Note : Sélection sélective impossible.");
        }
        
        // 3. LE SAINT GRAAL : Utiliser document.execCommand('insertText')
        // Cette méthode imite une frappe physique clavier à 100%.
        // Elle traverse TOUTES les barrières virtuelles de React, Angular et Vue instantanément !
        let typed = false;
        try {
            typed = document.execCommand('insertText', false, String(targetPrice));
            ghostLog(`🎯 [OFFER] Frappe simulée clavier via execCommand : ${typed ? "SUCCÈS" : "ÉCHEC"}`);
        } catch (e) {
            ghostLog("❌ [OFFER] Erreur fatale execCommand : " + e.message);
        }
        
        // 4. INJECTION CLASSIQUE (Fiable)
        targetElement.value = targetPrice;
        targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
        ghostLog(`🎯 [OFFER] Valeur finale injectée dans le DOM : '${targetElement.value}'`);
        
        // Étape C : Cliquer sur le bouton final via son identifiant exact (Découverte via Diagnostic)
        let attempts = 0;
        const clickInterval = setInterval(() => {
            attempts++;
            
            // Grâce à ton diagnostic, on sait que Vinted a un tag précis pour ce bouton !
            const btn = document.querySelector('[data-testid="offer-submit-button"]');
            
            if (btn) {
                // 1. VICTOIRE : Vinted a mis le bouton en chargement ("aria-busy"). L'API est en cours !
                if (btn.getAttribute('aria-busy') === 'true') {
                    ghostLog("✅ [OFFER] SUCCÈS CONFIRMÉ : L'offre part vers Vinted (loader détecté) !");
                    clearInterval(clickInterval);
                    return;
                }
                
                // 2. ATTENTE : Si le bouton est disabled (parce que React n'a pas fini de digérer le prix)
                if (btn.disabled) {
                    ghostLog(`⏳ [OFFER] Bouton désactivé. Attente de React (Essai ${attempts})...`);
                    // On refait un petit coup de pinceau pour forcer React à se réveiller
                    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                    return;
                }

                // 3. ACTION : Le bouton est actif, on l'écrase de clics
                ghostLog(`🎯 [OFFER] Bouton prêt ! Clic natif...`);
                btn.click();
                
                // En bonus, on glisse un appui sur la touche "Entrée"
                targetElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));

            } else {
                ghostLog(`⚠️ [OFFER] Recherche du bouton (Essai ${attempts})...`);
            }

            // Timeout de sécurité après 8 secondes
            if (attempts > 16) {
                ghostLog("❌ [OFFER] ÉCHEC : Impossible de valider l'offre après 8 secondes.");
                clearInterval(clickInterval);
            }
        }, 500);
    }
}

// === FONCTION DE DIAGNOSTIC DE L'OFFRE ===
window.runOfferDiagnostics = function() {
    ghostLog("====== 🩺 DÉBUT DIAGNOSTIC DE L'OFFRE ======");
    const allElements = Array.from(document.querySelectorAll('div[role="dialog"] *, .ui-modal *'));
    
    // Trouver le bouton "Proposer"
    let proposerEl = null;
    for (let el of allElements) {
        const txt = (el.innerText || '').trim().toLowerCase();
        if (txt.includes('proposer') && txt.length < 30) {
            proposerEl = el;
            break;
        }
    }

    if (!proposerEl) {
        ghostLog("❌ [DIAG] Bouton 'Proposer' introuvable !");
        alert("Ouvrez la fenêtre 'Faire une offre', tapez un prix, puis cliquez sur Diagnostic.");
        return;
    }

    ghostLog("✅ [DIAG] Élément trouvé !");
    ghostLog("📌 TAG: " + proposerEl.tagName);
    ghostLog("📌 CLASSES: " + proposerEl.className);
    ghostLog("📌 DISABLED: " + proposerEl.disabled);
    
    const form = proposerEl.closest('form');
    if (form) {
        ghostLog("✅ [DIAG] Formulaire parent trouvé !");
    } else {
        ghostLog("⚠️ [DIAG] Aucun <form> parent trouvé.");
    }

    // Tester les méthodes une par une
    ghostLog("🔄 [DIAG] Lancement automatique des 3 tests de validation espacés de 2.5 secondes...");
    
    setTimeout(() => {
        ghostLog("🧪 TEST 1 : el.click() natif pur...");
        proposerEl.click();
        
        setTimeout(() => {
            if (!document.querySelector('div[role="dialog"], .ui-modal')) {
                ghostLog("🎉 SUCCÈS : Le Test 1 (click) a fonctionné !"); return;
            }
            ghostLog("❌ TEST 1 ÉCHOUÉ (Modal toujours ouvert). Passage au Test 2...");
            
            ghostLog("🧪 TEST 2 : form.dispatchEvent(submit)...");
            if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            } else {
                ghostLog("Ignoré car pas de <form>.");
            }
            
            setTimeout(() => {
                if (!document.querySelector('div[role="dialog"], .ui-modal')) {
                    ghostLog("🎉 SUCCÈS : Le Test 2 (submit form) a fonctionné !"); return;
                }
                ghostLog("❌ TEST 2 ÉCHOUÉ. Passage au Test 3...");
                
                ghostLog("🧪 TEST 3 : Pointer Events (Clic Physique Complet)...");
                const rect = proposerEl.getBoundingClientRect();
                const x = rect.left + (rect.width / 2);
                const y = rect.top + (rect.height / 2);
                const eventOpts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", button: 0, buttons: 1, isPrimary: true };
                
                proposerEl.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
                proposerEl.dispatchEvent(new MouseEvent('mousedown', eventOpts));
                eventOpts.buttons = 0;
                proposerEl.dispatchEvent(new PointerEvent('pointerup', eventOpts));
                proposerEl.dispatchEvent(new MouseEvent('mouseup', eventOpts));
                proposerEl.dispatchEvent(new MouseEvent('click', eventOpts));
                
                setTimeout(() => {
                    if (!document.querySelector('div[role="dialog"], .ui-modal')) {
                        ghostLog("🎉 SUCCÈS : Le Test 3 (PointerEvents) a fonctionné !"); return;
                    }
                    ghostLog("❌ TEST 3 ÉCHOUÉ. Les sécurités React bloquent tout. Analyse manuelle du HTML requise.");
                    ghostLog("HTML Complet du Bouton : " + proposerEl.outerHTML);
                    if (form) ghostLog("HTML Complet du Form (tronqué) : " + form.outerHTML.substring(0, 500));
                }, 2500);
            }, 2500);
        }, 2500);
    }, 1000);
};

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
