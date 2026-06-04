# Cahier des Charges — Module "Dressing" (Vinted Manager)

> Objectif : reproduire l'interface "Dressing" de Vinteo dans notre vinted-manager. Voir toutes les annonces d'un compte, les republier avec crop (pourcentage choisi), changer titre/description/prix, réordonner les photos, le tout avec des timers anti-détection entre republications.

**Dossier de travail (À JOUR) :** `/Users/noah/Documents/Claude_Cowork/VintedBot/`
(NE PAS utiliser `02 Projects/VintedBot` qui est 4 commits en retard.)

---

## 1. Architecture retenue

```
┌──────────────────────┐     POST /api/dressing/repost      ┌──────────────────────┐
│  Manager (Next.js)   │ ──────────────────────────────────▶│   BotActionQueue (DB) │
│  Page /dressing      │     crée N actions REPOST_ITEM      │   actionType=REPOST   │
└──────────────────────┘                                     └───────────┬──────────┘
         ▲                                                                │
         │ GET /api/dressing (liste annonces du compte)        GET /api/extension/actions
         │                                                                ▼
┌──────────────────────┐                                     ┌──────────────────────┐
│  VintedItemMetrics    │◀──── sync metrics (existant) ──────│  Extension Chrome     │
│  (DB, déjà alimenté)  │                                     │  background.js (SW)   │
└──────────────────────┘                                     │  + vinted-rest-api.js │
                                                              └───────────┬──────────┘
                                                                          │ repostItemREST()
                                                                          ▼
                                                                  API Vinted native
                                                          (drafts → completion, photos, delete)
```

**Principe clé :** Vinted n'expose pas d'endpoint d'édition propre. La technique Vinteo = **supprimer + recréer** l'annonce (`repostItemREST` existe déjà). Donc TOUT changement (crop, titre, bio, prix, ordre photos) passe par un repost avec overrides. Le repost remonte l'annonce en tête des recherches (le but business).

**Limitation V1 assumée :** un repost crée une nouvelle annonce (nouveau lien, vues/favoris remis à zéro). C'est le comportement attendu d'un "bump" Vinted.

---

## 2. Contrats partagés (À RESPECTER À LA LETTRE par les 3 missions)

### 2.1 Action queue — `actionType: "REPOST_ITEM"`
Payload stocké dans `BotActionQueue.payload` (Json) :
```jsonc
{
  "itemId": "1283928",          // id natif Vinted de l'annonce à reposter
  "cropPercent": 5,              // 0-20 : % de rognage sur chaque bord (0 = juste hash 1px)
  "newTitle": null,              // string ou null (null = garder l'original)
  "newDescription": null,        // string ou null
  "newPrice": null,              // number ou null
  "photoOrder": null,            // number[] (indices réordonnés) ou null = ordre original
  "delayBeforeMs": 0             // délai à attendre AVANT d'exécuter (0 pour le 1er de la série)
}
```

### 2.2 `GET /api/dressing?botAccountName=<name>`
Réponse :
```jsonc
{ "success": true, "data": [
  { "id": "1283928", "title": "Robe verte", "price": 55, "photoUrl": "https://...",
    "viewCount": 0, "favouriteCount": 0, "status": "Actif",
    "url": "https://vinted.fr/items/1283928", "uploadedAtVinted": "2026-06-01T10:00:00Z" }
]}
```

### 2.3 `GET /api/dressing/accounts`
Réponse :
```jsonc
{ "success": true, "data": [ { "name": "emma", "vintedUsername": "emma_clt3", "itemCount": 16 } ] }
```

### 2.4 `POST /api/dressing/repost`
Body reçu du front :
```jsonc
{
  "botAccountName": "emma",
  "items": [ { "itemId": "123", "cropPercent": 5, "newTitle": null,
               "newDescription": null, "newPrice": null, "photoOrder": null } ],
  "timing": { "minDelaySec": 80, "maxDelaySec": 120 }
}
```
Comportement : pour chaque item, créer une action `REPOST_ITEM`. `delayBeforeMs` = 0 pour le premier, `random(minDelaySec, maxDelaySec) * 1000` pour les suivants.

---

## 3. MISSION A — Manager Backend (Prisma + routes API)

Fichiers à créer/modifier (zone exclusive) :
- `vinted-manager/prisma/schema.prisma` : ajouter `price Decimal? @db.Decimal(10,2)` au modèle `VintedItemMetrics`.
- `vinted-manager/src/app/api/extension/sync/metrics/route.ts` : dans le POST, stocker `price` (Number(item.price) si fourni) en create + update.
- `vinted-manager/src/app/api/dressing/route.ts` : GET (contrat 2.2) — lit `VintedItemMetrics` filtré par `botAccount.name`.
- `vinted-manager/src/app/api/dressing/accounts/route.ts` : GET (contrat 2.3).
- `vinted-manager/src/app/api/dressing/repost/route.ts` : POST (contrat 2.4) — réutilise le pattern de `src/app/api/extension/actions/route.ts` (POST) pour créer les actions dans `BotActionQueue`.

Contraintes : CORS headers identiques aux routes extension existantes. Pattern Prisma : `import prisma from '@/lib/prisma'`. Pas de migration SQL à appliquer (DB distante) — juste écrire le schema + noter qu'il faudra `npx prisma generate && npx prisma db push`.

---

## 4. MISSION B — Manager Frontend (page + nav)

Fichiers à créer/modifier (zone exclusive) :
- `vinted-manager/src/app/dressing/page.tsx` : la page complète.
- `vinted-manager/src/components/DashboardLayout.tsx` : ajouter `{ name: 'Dressing 👗', href: '/dressing', icon: Shirt }` dans `navigation` (importer `Shirt` de lucide-react).

UI attendue (calquée sur la capture Vinteo, thème zinc/emerald existant) :
- Sélecteur de compte bot en haut (dropdown, fetch `/api/dressing/accounts`).
- Barre de recherche + compteur d'annonces.
- "Tout sélectionner" + sélection multiple (checkbox par carte).
- Boutons d'action : **Reposter la sélection** (ouvre modale config), **Modifier les prix**, **Changer titre/bio**.
- Grille de cartes : photo, titre, prix, vues, favoris, "il y a X" (date relative).
- Modale "Reposter" : slider pourcentage de crop (0-20%), champs optionnels nouveau titre/description/prix, réglage timing (min/max secondes, défaut 80/120). À la validation → `POST /api/dressing/repost`.

Pattern : Client Component (`"use client"`), `fetch` + `useState`/`useEffect`/`useMemo`. Copier le style des pages `winners`/`sourcing`/`stock` existantes (les lire d'abord). Icônes lucide-react. Pas de shadcn (n'existe pas).

---

## 5. MISSION C — Extension Chrome (repost étendu + crop + timers)

Fichiers à modifier (zone exclusive) :
- `vinted-extension/vinted-rest-api.js`
- `vinted-extension/background.js`

### 5.1 `vinted-rest-api.js`
1. Ajouter `cropImageOffscreen(imageBlob, cropPercent)` : via OffscreenCanvas, rogne `cropPercent`% sur chaque bord puis recompresse JPEG q0.92. Si `cropPercent` <= 0, retomber sur le comportement `processImageOffscreen` (rognage 1px anti-hash). Gérer les erreurs (retour blob original).
2. Étendre `repostItemREST(itemId, options)` pour accepter `options` : `{ cropPercent, newTitle, newDescription, newPrice, photoOrder }`.
   - Utiliser `cropImageOffscreen(blob, options.cropPercent)` au lieu de `processImageOffscreen`.
   - Appliquer les overrides sur le `draftPayload` : `title = options.newTitle ?? original.title`, idem description, `price = options.newPrice ?? parseFloat(original.price_numeric...)`.
   - Si `options.photoOrder` (array d'indices) fourni, réordonner `newPhotoIds` selon ces indices avant de construire `assigned_photos`.
3. Inclure `price_numeric` dans le sync metrics : trouver `syncVintedItemMetricsToManager` (dans background.js) et ajouter `price: it.price_numeric ?? null` au mapping envoyé à `/api/extension/sync/metrics`.

### 5.2 `background.js`
1. Router le nouveau type dans le flux d'exécution des actions. ATTENTION : `executeBotAction` exécute via `chrome.scripting.executeScript` (contexte onglet). Le repost, lui, doit tourner dans le **service worker** (il utilise `vintedFetch`, `uploadPhotoToVinted`, `cropImageOffscreen`/OffscreenCanvas). Donc : dans `pollActionQueueFromManager`, AVANT d'appeler `executeBotAction`, intercepter `action.actionType === "REPOST_ITEM"` et appeler directement `await repostItemREST(payload.itemId, payload)` depuis le SW. Marquer SUCCESS/FAILED via le PATCH habituel.
2. Timers : pour les actions REPOST_ITEM, respecter `payload.delayBeforeMs` AVANT exécution (`await sleep(delayBeforeMs)`) au lieu des 1500ms standards.
3. Keep-alive MV3 : pendant le traitement d'une série de reposts (délais de 80-120s qui dépassent la durée de vie d'un service worker MV3), maintenir le SW éveillé. Implémenter un keep-alive simple : pendant la boucle de reposts, un `setInterval` qui appelle `chrome.runtime.getPlatformInfo()` toutes les 20s, arrêté en fin de série. Documenter en commentaire.

Lire `background.js` en entier d'abord (il a évolué) — repérer `pollActionQueueFromManager`, `executeBotAction`, `syncVintedItemMetricsToManager`, et comment `repostItemREST` est accessible (vérifier les `importScripts` / l'ordre de chargement dans `manifest.json`).

---

## 6. Définition de "fini"
- `npx tsc --noEmit` (ou `next build`) passe sans erreur dans vinted-manager.
- La page `/dressing` s'affiche, liste les annonces d'un compte, sélection multiple OK, modale repost fonctionnelle qui POST les actions.
- L'extension route REPOST_ITEM, crop appliqué, timers respectés, keep-alive en place.
- Cohérence des contrats (section 2) entre les 3 zones.
