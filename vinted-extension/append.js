
// === SHEIN RECORDER ===
async function recordSheinClicks(url) {
    if (!url) throw new Error("URL manquante");
    
    const newTab = await new Promise((resolve) => {
        chrome.tabs.create({ url, active: true }, (tab) => resolve(tab));
    });

    await new Promise(r => setTimeout(r, 4000)); // Laisser la page s'afficher

    const results = await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        func: () => {
            return new Promise((resolve) => {
                let recordedClicks = [];
                let hasClickedAddToCart = false;

                // Overlay d'enregistrement (visible sur Shein)
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '10px';
                overlay.style.left = '50%';
                overlay.style.transform = 'translateX(-50%)';
                overlay.style.padding = '10px 20px';
                overlay.style.background = '#dc2626';
                overlay.style.color = 'white';
                overlay.style.zIndex = '2147483647'; // Max z-index
                overlay.style.fontWeight = 'bold';
                overlay.style.borderRadius = '8px';
                overlay.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
                overlay.style.pointerEvents = 'none';
                overlay.textContent = "🔴 ENREGISTREMENT: Cliquez sur la TAILLE puis sur AJOUTER AU PANIER";
                document.body.appendChild(overlay);

                // On attache un listener "capture" (true) pour intercepter le clic AVANT que Shein ne le gère
                document.addEventListener('click', (e) => {
                    let node = e.target;
                    let path = [];
                    while (node && node.nodeName !== 'BODY' && node.nodeName !== 'HTML') {
                        let sel = node.nodeName.toLowerCase();
                        if (node.id) sel += '#' + node.id;
                        if (node.className && typeof node.className === 'string') {
                            sel += '.' + node.className.trim().replace(/\s+/g, '.');
                        }
                        path.unshift(sel);
                        node = node.parentNode;
                    }

                    const textContext = e.target.textContent?.trim().substring(0, 50) || "";
                    
                    const clickData = {
                        tag: e.target.tagName,
                        classes: e.target.className,
                        text: textContext,
                        path: path.join(' > ')
                    };
                    
                    recordedClicks.push(clickData);
                    console.log("[RECORDER] Clic capturé:", clickData);
                    
                    // Si on a cliqué sur "Ajouter au panier", on valide la session !
                    if (textContext.toUpperCase().includes('AJOUTER') || textContext.toUpperCase().includes('ADD TO CART') || clickData.classes?.includes('add-cart-btn')) {
                        hasClickedAddToCart = true;
                        overlay.textContent = "✅ Clics capturés ! Fermeture dans 1s...";
                        overlay.style.background = '#16a34a';
                        
                        // Retourne les données à l'extension
                        setTimeout(() => resolve(recordedClicks), 1000); 
                    }
                }, true); // Capture phase !

                // Timeout de sécurité si l'utilisateur ne fait rien
                setTimeout(() => {
                    if (!hasClickedAddToCart) {
                        resolve(recordedClicks);
                    }
                }, 30000);
            });
        }
    });

    return results[0]?.result || [];
}
