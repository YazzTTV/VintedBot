/**
 * ⚡ Vinted REST API Utility Engine
 * 🤖 Module développé pour propulser vinted-extension de manière furtive et ultra-rapide.
 * Basé sur la rétro-ingénierie du moteur REST natif (zéro DOM / zéro Selenium).
 */

// Base URL dynamique — détectée depuis l'onglet Vinted actif
let _cachedBaseUrl = null;

async function getVintedBaseUrl() {
    if (_cachedBaseUrl) return _cachedBaseUrl;
    return new Promise((resolve) => {
        chrome.tabs.query({ url: ["*://*.vinted.fr/*", "*://*.vinted.com/*", "*://*.vinted.nl/*", "*://*.vinted.be/*", "*://*.vinted.de/*", "*://*.vinted.es/*", "*://*.vinted.it/*", "*://*.vinted.pl/*", "*://*.vinted.pt/*", "*://*.vinted.lt/*"] }, (tabs) => {
            if (tabs && tabs.length > 0) {
                const url = new URL(tabs[0].url);
                _cachedBaseUrl = url.origin; // ex: "https://www.vinted.nl"
            } else {
                _cachedBaseUrl = "https://www.vinted.fr"; // Fallback FR
            }
            resolve(_cachedBaseUrl);
        });
    });
}

// Invalider le cache toutes les 10 min (en cas de changement de profil)
setInterval(() => { _cachedBaseUrl = null; }, 10 * 60 * 1000);

/**
 * Génère un UUID v4 aléatoire.
 */
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Récupère le jeton CSRF avec cache de 5 minutes pour éviter les allers-retours excessifs.
 */
let _csrfCache = { token: null, expiry: 0 };
const CSRF_TTL_MS = 5 * 60 * 1000;

async function getCsrfToken() {
    // Retourner le cache si encore valide
    if (_csrfCache.token && Date.now() < _csrfCache.expiry) {
        return _csrfCache.token;
    }

    return new Promise((resolve) => {
        chrome.tabs.query({ url: ["*://*.vinted.fr/*", "*://*.vinted.com/*", "*://*.vinted.nl/*", "*://*.vinted.be/*", "*://*.vinted.de/*", "*://*.vinted.es/*", "*://*.vinted.it/*"] }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.warn("⚠️ Aucun onglet Vinted ouvert pour extraire le Token CSRF.");
                resolve(null);
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: "getCsrfToken" }, (response) => {
                if (chrome.runtime.lastError) {
                    resolve(null);
                    return;
                }
                const token = response ? response.token : null;
                if (token) {
                    _csrfCache = { token, expiry: Date.now() + CSRF_TTL_MS };
                }
                resolve(token);
            });
        });
    });
}

/**
 * Récupère la valeur d'un cookie spécifique via l'API chrome.cookies.
 */
async function getCookie(name, url = VINTED_BASE_URL) {
    return new Promise((resolve) => {
        chrome.cookies.get({ url: url, name: name }, (cookie) => {
            resolve(cookie ? cookie.value : null);
        });
    });
}

/**
 * Exécute une requête HTTP Fetch vers Vinted avec injection automatique de l'authentification REST.
 */
async function vintedFetch(endpoint, options = {}) {
    const baseUrl = await getVintedBaseUrl();
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
    
    // Récupérer en parallèle les identifiants nécessaires
    const csrfToken = await getCsrfToken();
    const anonId = await getCookie("anon_id", url);

    // Configurer les en-têtes standard imitant parfaitement Vinted Web
    const headers = Object.assign({
        "Accept": "application/json, text/plain, */*",
        "X-Money-Object": "true"
    }, options.headers || {});

    if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
    }
    if (anonId) {
        headers["X-Anon-Id"] = anonId;
    }

    // Ne pas forcer le Content-Type si on utilise du FormData (le navigateur doit ajouter le boundary lui-même)
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const fetchOptions = {
        method: options.method || "GET",
        headers: headers,
        credentials: "include" // CRITIQUE : Envoie les cookies réels du compte Vinted !
    };

    if (options.body) {
        fetchOptions.body = options.body;
    }

    try {
        const response = await fetch(url, fetchOptions);
        
        // Si Vinted répond en JSON, parser directement
        const contentType = response.headers.get("content-type") || "";
        let responseData;
        
        if (contentType.includes("application/json")) {
            responseData = await response.json();
        } else {
            responseData = await response.text();
        }

        return {
            success: response.ok,
            status: response.status,
            data: responseData
        };

    } catch (error) {
        console.error(`❌ Erreur réseau vintedFetch sur ${url} :`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Récupère le solde du Wallet (Comptabilité réelle) de l'utilisateur actuellement connecté.
 */
async function fetchWalletBalance() {
    console.log("💰 Lecture du solde en temps réel par API...");
    const res = await vintedFetch("/api/v2/wallet/history");
    if (!res.success) {
        throw new Error(`Échec de la lecture du portefeuille : statut ${res.status}`);
    }

    const data = res.data;
    let pending = 0;
    let available = 0;

    if (data.wallet) {
        pending = parseFloat(data.wallet.pending_amount || 0);
        available = parseFloat(data.wallet.available_amount || 0);
    } else if (data.balance) {
        pending = parseFloat(data.balance.pending || 0);
        available = parseFloat(data.balance.available || 0);
    } else {
        pending = parseFloat(data.pending_amount || 0);
        available = parseFloat(data.available_amount || 0);
    }

    return {
        pending,
        available
    };
}

/**
 * Télécharge une photo brute vers les serveurs d'hébergement de Vinted.
 * @param {Blob} photoBlob Le blob de l'image à héberger.
 * @param {string} filename Le nom du fichier à assigner.
 * @returns {number} L'identifiant unique de la photo hébergée chez Vinted.
 */
async function uploadPhotoToVinted(photoBlob, filename = "photo.jpg") {
    console.log("📸 Uploading photo vers les serveurs Vinted...");
    
    const formData = new FormData();
    formData.append("photo[type]", "item");
    formData.append("photo[file]", photoBlob, filename);
    formData.append("photo[temp_uuid]", generateUUID());

    const res = await vintedFetch("/api/v2/photos", {
        method: "POST",
        body: formData
    });

    if (!res.success) {
        throw new Error("Échec de l'upload de la photo chez Vinted");
    }

    const photoId = res.data.photo ? res.data.photo.id : res.data.id;
    if (!photoId) {
        throw new Error("La photo a été uploadée mais Vinted n'a pas retourné d'identifiant ID");
    }

    console.log(`✅ Photo validée chez Vinted, ID assigné : ${photoId}`);
    return photoId;
}

/**
 * Crée un brouillon d'annonce (Draft) et le publie définitivement en 2 requêtes JSON.
 * @param {Object} draftPayload La structure complète de l'article.
 */
async function publishItemREST(draftPayload) {
    console.log("📝 Création du brouillon d'annonce REST...");
    
    const draftUuid = generateUUID();
    
    // Structure attendue par le validateur interne de Vinted
    const draftWrapper = {
        draft: Object.assign({
            id: null,
            currency: "EUR",
            temp_uuid: draftUuid,
            is_unisex: false,
            shipment_prices: { domestic: null, international: null },
            measurement_length: null,
            measurement_width: null,
            manufacturer: null,
            model: null
        }, draftPayload),
        feedback_id: null,
        parcel: null,
        upload_session_id: draftUuid
    };

    // ÉTAPE 1 : Envoi du brouillon
    const draftRes = await vintedFetch("/api/v2/item_upload/drafts", {
        method: "POST",
        body: JSON.stringify(draftWrapper)
    });

    if (!draftRes.success) {
        console.error("❌ Échec création brouillon Vinted :", draftRes.data);
        throw new Error(`Erreur création Draft (HTTP ${draftRes.status})`);
    }

    const createdDraft = draftRes.data.draft || draftRes.data;
    const draftId = createdDraft.id;
    if (!draftId) {
        throw new Error("Draft créé mais ID non retourné par le serveur");
    }

    console.log(`✅ Brouillon #${draftId} créé. En attente de publication finale...`);
    
    // Petite pause naturelle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ÉTAPE 2 : Validation et Mise en ligne immédiate
    const completionWrapper = {
        draft: createdDraft,
        feedback_id: null,
        parcel: null,
        push_up: false,
        upload_session_id: createdDraft.temp_uuid || draftUuid
    };

    const pubRes = await vintedFetch(`/api/v2/item_upload/drafts/${draftId}/completion`, {
        method: "POST",
        body: JSON.stringify(completionWrapper)
    });

    if (!pubRes.success) {
        console.error("❌ Échec mise en ligne définitive :", pubRes.data);
        throw new Error(`Erreur finalisation publication (HTTP ${pubRes.status})`);
    }

    const finalItem = pubRes.data.item || pubRes.data;
    const finalId = finalItem.id || draftId;
    
    const baseUrl = await getVintedBaseUrl();
    console.log(`🚀 L'ARTICLE EST OFFICIELLEMENT EN LIGNE SUR VINTED ! ID : ${finalId}`);
    return {
        itemId: finalId,
        url: `${baseUrl}/items/${finalId}`
    };
}

/**
 * 🎨 Hash Modification en Service Worker (Furtivité Absolue)
 * Utilise OffscreenCanvas pour tronquer de 1px et re-compresser l'image,
 * changeant instantanément le MD5/Hash perceptuel pour bypasser les filtres anti-spam Vinted.
 */
async function processImageOffscreen(imageBlob) {
    try {
        // createImageBitmap est supporté nativement dans les Service Workers MV3 !
        const bitmap = await createImageBitmap(imageBlob);

        // Créer un canevas virtuel 1px plus petit
        const targetWidth = Math.max(1, bitmap.width - 1);
        const targetHeight = Math.max(1, bitmap.height - 1);

        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');

        // Dessiner avec rognage infime pour forcer un ré-échantillonnage des pixels
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

        // Convertir en Blob JPEG avec légère variation de qualité
        const processedBlob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: 0.92
        });

        // Libérer la mémoire
        bitmap.close();

        return processedBlob;
    } catch (error) {
        console.warn("⚠️ Échec processImageOffscreen, utilisation du blob original :", error);
        return imageBlob;
    }
}

/**
 * 🔪 Rognage Intelligent : Rogne un pourcentage donné sur CHAQUE bord d'une image.
 * Si cropPercent <= 0 ou n'est pas un nombre, délègue à processImageOffscreen (anti-hash).
 * @param {Blob} imageBlob L'image à rogner.
 * @param {number} cropPercent Le pourcentage à couper sur chaque bord (0-50). Ex: 5 = 5% gauche + 5% droite + 5% haut + 5% bas.
 * @returns {Blob} L'image rognée et recompressée.
 */
async function cropImageOffscreen(imageBlob, cropPercent) {
    // Validation : si cropPercent n'est pas un nombre positif, déléguer au comportement anti-hash existant
    if (typeof cropPercent !== 'number' || cropPercent <= 0 || cropPercent >= 50) {
        console.log(`🎨 cropPercent invalide (${cropPercent}). Délégation à processImageOffscreen.`);
        return processImageOffscreen(imageBlob);
    }

    try {
        const bitmap = await createImageBitmap(imageBlob);
        const width = bitmap.width;
        const height = bitmap.height;

        // Calculer les dimensions de la zone rognée
        const cropPixelsX = Math.round(width * cropPercent / 100);
        const cropPixelsY = Math.round(height * cropPercent / 100);

        const srcX = cropPixelsX;
        const srcY = cropPixelsY;
        const srcWidth = width - 2 * cropPixelsX;
        const srcHeight = height - 2 * cropPixelsY;

        // Validation de sécurité : s'assurer que la zone source est valide
        if (srcWidth <= 0 || srcHeight <= 0) {
            console.warn(`⚠️ Rognage trop agressif (${cropPercent}%). Zone source invalide. Retour au blob original.`);
            bitmap.close();
            return imageBlob;
        }

        // Créer un canvas de la taille finale
        const canvas = new OffscreenCanvas(srcWidth, srcHeight);
        const ctx = canvas.getContext('2d');

        // Dessiner la région rognée sur le nouveau canvas
        ctx.drawImage(bitmap, srcX, srcY, srcWidth, srcHeight, 0, 0, srcWidth, srcHeight);

        // Convertir en Blob JPEG
        const croppedBlob = await canvas.convertToBlob({
            type: 'image/jpeg',
            quality: 0.92
        });

        bitmap.close();

        console.log(`🔪 Rognage appliqué : ${cropPercent}% sur chaque bord (${width}x${height} -> ${srcWidth}x${srcHeight})`);
        return croppedBlob;
    } catch (error) {
        console.warn("⚠️ Échec cropImageOffscreen, retour au blob original :", error);
        return imageBlob;
    }
}

/**
 * 🗑️ Supprime un article définitivement via REST API
 */
async function deleteItemREST(itemId) {
    console.log(`🗑️ Suppression de l'article #${itemId}...`);
    
    // Tentative 1 : POST direct de suppression (Standard Vinted Web)
    const resPost = await vintedFetch(`/api/v2/items/${itemId}/delete`, {
        method: "POST",
        body: JSON.stringify({})
    });

    if (resPost.success) {
        console.log(`✅ Article #${itemId} supprimé avec succès via POST`);
        return true;
    }

    // Tentative 2 : DELETE natif (Alternative)
    const resDelete = await vintedFetch(`/api/v2/items/${itemId}`, {
        method: "DELETE"
    });

    if (resDelete.success) {
        console.log(`✅ Article #${itemId} supprimé avec succès via DELETE`);
        return true;
    }

    console.error(`❌ Impossible de supprimer l'article #${itemId}`);
    return false;
}

/**
 * 🔄 REPOSTE FURTIF : Clone un article existant avec de nouvelles photos uniques puis détruit l'ancien.
 * @param {string|number} itemId L'identifiant de l'article à cloner.
 * @param {Object} options Options optionnelles :
 *   - deleteAfter {boolean} : supprimer l'ancien après reposte (défaut: true)
 *   - cropPercent {number} : pourcentage à rogner sur chaque bord des photos (ex: 5 pour 5% de chaque côté)
 *   - newTitle {string} : nouveau titre (défaut: original.title)
 *   - newDescription {string} : nouvelle description (défaut: original.description)
 *   - newPrice {number|string} : nouveau prix (défaut: original.price_numeric)
 *   - photoOrder {Array<number>} : indices de réordonnancement des photos (ex: [2, 0, 1])
 */
async function repostItemREST(itemId, options = {}) {
    console.log(`🔄 Démarrage du clonage furtif de l'article #${itemId}...`);
    const deleteAfter = options.deleteAfter !== undefined ? options.deleteAfter : true;
    const cropPercent = options.cropPercent;
    const newTitle = options.newTitle;
    const newDescription = options.newDescription;
    const newPrice = options.newPrice;
    const photoOrder = options.photoOrder;

    // ÉTAPE 1 : Récupérer les détails internes de l'annonce existante
    let itemRes = await vintedFetch(`/api/v2/item_upload/items/${itemId}`);
    if (!itemRes.success) {
        console.warn("Fallback sur endpoint /items/ public car /item_upload/items a échoué.");
        itemRes = await vintedFetch(`/api/v2/items/${itemId}`);
    }

    if (!itemRes.success) {
        throw new Error(`Impossible de récupérer les données de l'article ${itemId} (HTTP ${itemRes.status})`);
    }

    const original = itemRes.data.item || itemRes.data;
    if (!original) {
        throw new Error("Format de réponse Vinted inconnu lors de la lecture de l'article.");
    }

    console.log(`📖 Analyse de l'annonce : "${original.title}" (${original.price_numeric || original.price}€)`);

    // ÉTAPE 2 : Extraire, modifier et re-héberger chaque photo
    const originalPhotos = original.photos || [];
    const newPhotoIds = [];

    if (originalPhotos.length === 0) {
        throw new Error("L'annonce originale ne contient aucune photo. Reposte impossible.");
    }

    for (let i = 0; i < originalPhotos.length; i++) {
        const photoObj = originalPhotos[i];
        const photoUrl = photoObj.full_size_url || photoObj.url;

        if (!photoUrl) continue;

        try {
            console.log(`📸 Téléchargement de la photo ${i + 1}/${originalPhotos.length}...`);
            const fetchPhoto = await fetch(photoUrl);
            const photoBlob = await fetchPhoto.blob();

            // Appliquer le traitement d'image : rognage si cropPercent fourni, sinon anti-hash par défaut
            console.log(`🎨 Modification furtive des pixels (image ${i + 1})...`);
            const processedBlob = await cropImageOffscreen(photoBlob, cropPercent);

            // Upload chez Vinted sous une nouvelle identité
            const newId = await uploadPhotoToVinted(processedBlob, `repost_${i}.jpg`);
            newPhotoIds.push({ id: newId, orientation: 0 });

            // Temporisation naturelle pour ne pas spammer l'infra photos
            await new Promise(r => setTimeout(r, 1200));
        } catch (err) {
            console.error(`⚠️ Échec du clonage de la photo #${i} :`, err);
        }
    }

    if (newPhotoIds.length === 0) {
        throw new Error("Échec critique : Aucune photo n'a pu être régénérée pour le reposte.");
    }

    // Appliquer le réordonnancement des photos si photoOrder est un tableau valide
    let finalPhotoIds = newPhotoIds;
    if (Array.isArray(photoOrder) && photoOrder.length > 0) {
        console.log(`🔀 Réordonnancement des photos selon l'ordre : ${photoOrder.join(',')}`);
        const reordered = [];
        for (const idx of photoOrder) {
            if (Number.isInteger(idx) && idx >= 0 && idx < newPhotoIds.length) {
                reordered.push(newPhotoIds[idx]);
            }
        }
        if (reordered.length > 0) {
            finalPhotoIds = reordered;
        } else {
            console.warn(`⚠️ photoOrder invalide, conservation de l'ordre original`);
        }
    }

    // ÉTAPE 3 : Assemblage de la charge utile du clone avec overrides optionnels
    const draftPayload = {
        title: newTitle != null ? newTitle : original.title,
        description: newDescription != null ? newDescription : (original.description || ""),
        catalog_id: original.catalog_id,
        brand_id: original.brand_id,
        size_id: original.size_id,
        status_id: original.status_id,
        package_size_id: original.package_size_id,
        color_ids: original.color_ids || [original.color1_id, original.color2_id].filter(Boolean),
        price: newPrice != null ? parseFloat(newPrice) : parseFloat(original.price_numeric || original.price || 0),
        currency: original.currency || "EUR",
        assigned_photos: finalPhotoIds
    };

    // ÉTAPE 4 : Supprimer l'ancien AVANT de publier (évite la détection de doublons)
    if (deleteAfter) {
        console.log("🧹 Suppression préventive de l'ancienne annonce...");
        await deleteItemREST(itemId);
        // Pause pour laisser Vinted propager la suppression
        await new Promise(r => setTimeout(r, 2000));
    }

    // ÉTAPE 5 : Publication instantanée du Clone
    console.log("🚀 Envoi du clone sur Vinted...");
    const publishResult = await publishItemREST(draftPayload);

    console.log(`🎉 Reposte terminé avec succès ! Nouveau lien : ${publishResult.url}`);
    return {
        success: true,
        oldId: itemId,
        newId: publishResult.itemId,
        url: publishResult.url
    };
}

/**
 * 👯 DUPLICATION INTER-COMPTES : Clone un article sans supprimer l'original.
 * Peut être publié immédiatement ou sauvegardé comme brouillon.
 * @param {string|number} itemId L'identifiant de l'article source.
 * @param {Object} options Options de duplication :
 *   - asDraft {boolean} : Ne pas publier, garder en brouillon (défaut: false)
 *   - cropPercent {number} : Pourcentage de rognage
 */
async function duplicateItemREST(itemId, options = {}) {
    console.log(`👯 Démarrage de la duplication de l'article #${itemId}...`);
    const asDraft = options.asDraft || false;
    const cropPercent = options.cropPercent;

    // ÉTAPE 1 : Récupérer les détails de l'annonce source
    let itemRes = await vintedFetch(`/api/v2/items/${itemId}`);
    if (!itemRes.success) {
        throw new Error(`Impossible de lire l'article source ${itemId} (HTTP ${itemRes.status}). Est-il bien en ligne ?`);
    }

    const original = itemRes.data.item || itemRes.data;
    if (!original) {
        throw new Error("Format de réponse inconnu lors de la lecture de l'article source.");
    }

    console.log(`📖 Analyse de l'annonce source : "${original.title}"`);

    // ÉTAPE 2 : Récupérer les photos
    const originalPhotos = original.photos || [];
    const newPhotoIds = [];

    if (originalPhotos.length === 0) {
        throw new Error("L'annonce source ne contient aucune photo.");
    }

    for (let i = 0; i < originalPhotos.length; i++) {
        const photoObj = originalPhotos[i];
        const photoUrl = photoObj.full_size_url || photoObj.url;
        if (!photoUrl) continue;

        try {
            console.log(`📸 Copie de la photo ${i + 1}/${originalPhotos.length}...`);
            const fetchPhoto = await fetch(photoUrl);
            const photoBlob = await fetchPhoto.blob();

            const processedBlob = await cropImageOffscreen(photoBlob, cropPercent);
            const newId = await uploadPhotoToVinted(processedBlob, `duplicate_${i}.jpg`);
            newPhotoIds.push({ id: newId, orientation: 0 });

            await new Promise(r => setTimeout(r, 1200));
        } catch (err) {
            console.error(`⚠️ Échec copie photo #${i} :`, err);
        }
    }

    if (newPhotoIds.length === 0) {
        throw new Error("Échec critique : Aucune photo n'a pu être uploadée.");
    }

    // ÉTAPE 3 : Payload de l'annonce
    const draftPayload = {
        title: original.title,
        description: original.description || "",
        catalog_id: original.catalog_id,
        brand_id: original.brand_id,
        size_id: original.size_id,
        status_id: original.status_id,
        package_size_id: original.package_size_id,
        color_ids: original.color_ids || [original.color1_id, original.color2_id].filter(Boolean),
        price: parseFloat(original.price_numeric || original.price || 0),
        currency: original.currency || "EUR",
        assigned_photos: newPhotoIds
    };

    console.log("📝 Création du brouillon local...");
    const draftUuid = generateUUID();
    const draftWrapper = {
        draft: Object.assign({
            id: null,
            currency: "EUR",
            temp_uuid: draftUuid,
            is_unisex: false,
            shipment_prices: { domestic: null, international: null },
            measurement_length: null,
            measurement_width: null,
            manufacturer: null,
            model: null
        }, draftPayload),
        feedback_id: null,
        parcel: null,
        upload_session_id: draftUuid
    };

    const draftRes = await vintedFetch("/api/v2/item_upload/drafts", {
        method: "POST",
        body: JSON.stringify(draftWrapper)
    });

    if (!draftRes.success) {
        throw new Error(`Erreur création Draft (HTTP ${draftRes.status})`);
    }

    const createdDraft = draftRes.data.draft || draftRes.data;
    const draftId = createdDraft.id;

    if (asDraft) {
        console.log(`✅ Duplication réussie ! Sauvegardé en brouillon #${draftId}`);
        return { success: true, newId: draftId, isDraft: true };
    }

    // Publication immédiate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("🚀 Validation et mise en ligne du duplicata...");
    const completionWrapper = {
        draft: createdDraft,
        feedback_id: null,
        parcel: null,
        push_up: false,
        upload_session_id: createdDraft.temp_uuid || draftUuid
    };

    const pubRes = await vintedFetch(`/api/v2/item_upload/drafts/${draftId}/completion`, {
        method: "POST",
        body: JSON.stringify(completionWrapper)
    });

    if (!pubRes.success) {
        throw new Error(`Erreur finalisation publication (HTTP ${pubRes.status})`);
    }

    const finalItem = pubRes.data.item || pubRes.data;
    const finalId = finalItem.id || draftId;
    
    const baseUrl = await getVintedBaseUrl();
    console.log(`🎉 Duplicata en ligne ! ID : ${finalId}`);
    return {
        success: true,
        newId: finalId,
        url: `${baseUrl}/items/${finalId}`,
        isDraft: false
    };
}
