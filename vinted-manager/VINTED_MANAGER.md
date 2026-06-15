# Vinted Manager — Contexte projet (à lire en priorité)

> Doc de référence pour reprendre le projet rapidement. Mise à jour : 2026-06-16.
> Répondre **toujours en français** (préférence utilisateur).
>
> **⚠️ Repo partagé avec un autre dev.** GitHub `https://github.com/YazzTTV/VintedBot` (branche `main`).
> Toujours `git fetch` avant de bosser ; l'autre dev peut avoir poussé. Voir §10 pour le dernier état de synchro.

---

## 1. Vue d'ensemble

Le système a **deux composants** qui travaillent ensemble :

1. **`vinted-manager/`** — App **Next.js 16.2.6** (App Router, Turbopack), déployée sur **Vercel**.
   - URL prod : `https://vinted-manager-flame.vercel.app`
   - Base de données : **PostgreSQL (Supabase)** via **Prisma v7.8.0**
   - Sert de tableau de bord : dressing, ventes, comptabilité, dashboard, sourcing, inbox, expéditions.

2. **`vinted-extension/`** — Extension **Chrome Manifest V3** ("Vinted Pro Bot GHOST V4").
   - C'est elle qui parle à Vinted (l'app Vinted n'a pas d'API publique).
   - Pousse les données vers le Manager via les routes `/api/extension/*` et `/api/comptabilite/*`.
   - Fichiers clés : `background.js` (service worker, ~2700 lignes) et `vinted-rest-api.js` (moteur REST).

**Flux** : Extension lit Vinted (injection same-origin) → POST vers le Manager → Manager stocke en base → l'utilisateur consulte le dashboard.

---

## 2. Démarrage / déploiement

- **Déployer le Manager** : depuis `vinted-manager/`, `vercel --prod --yes` (CLI installée v54+, projet lié dans `.vercel/` → `vinted-manager`, compte `huilo1806-5829`). Build distant ~37s. Le déploiement se fait **depuis le local** (pas depuis GitHub) → c'est le local qui fait foi en prod.
- **Git** : le dossier racine `VintedBot-main/` est un dépôt git lié à `origin = github.com/YazzTTV/VintedBot`. (Au départ c'était un ZIP non versionné ; relié le 2026-06-15.)
- **Build** : `package.json` → `"build": "prisma db push && prisma generate && next build"` (pas de fichiers de migration ; `db push` synchronise le schéma).
- **Recharger l'extension** : `chrome://extensions` → bouton ↻. **Toute modif de `background.js` / `vinted-rest-api.js` exige un rechargement de l'extension** (pas de déploiement).
- Naviguateur de l'utilisateur : **Brave** (Chromium). Un onglet Vinted **connecté** doit être ouvert pour que l'extension fonctionne.

---

## 3. Authentification & routing (piège connu)

- Next.js 16.2 utilise **`src/proxy.ts`** comme middleware (nouveau nom remplaçant `middleware.ts`). **NE PAS créer `middleware.ts`** en plus → erreur de build "Both middleware file and proxy file detected".
- `proxy.ts` : toutes les routes `/api/*` sont **publiques** (l'extension appelle depuis vinted.fr, sans cookie de session). Seules les **pages UI** exigent le cookie `app_auth_session`.
- Login : `/api/auth/login`, mot de passe via `process.env.APP_PASSWORD` (fallback `vinted2026`).

---

## 4. Modèles Prisma importants

- **`VintedItemMetrics`** — articles du dressing. Champs clés : `id` (item id Vinted), `status` (string normalisé : `Vendu` / `Masqué` / `Brouillon` / `Réservé` / `Actif`), `orderIndex Int?` (ordre d'affichage), `viewCount`, `favouriteCount`, `isWinner`.
- **`VintedOrderSynced`** — commandes Vinted. `itemId String?` (id article Vinted), `articleId String?` (id article manager, lien réconciliation conservé entre upserts), `status`.
- **`Vente`** — ventes côté manager. Enum `StatutVente` inclut `ANNULEE`, `EXPEDIEE`, `EN_ATTENTE`, `COMMANDE_A_FAIRE`, etc.
- **`BotAccount`** — compte Vinted (clé : `vintedAccountId`). `name` = base du username (avant `.`/`_`).

---

## 5. Synchronisations (toutes dans `background.js`)

| Fonction | Rôle | Endpoint Vinted lu | Route Manager |
|---|---|---|---|
| `syncVintedItemMetricsToManager` | Dressing | `/api/v2/wardrobe/{userId}/items`, `/item_upload/drafts` | `/api/extension/sync/metrics` |
| `syncVintedOrdersToManager` | Ventes | `/api/v2/my_orders?type=sold&status=all` | `/api/comptabilite/orders` |
| `syncAccountBalanceToManager` | Solde wallet | scrape DOM `/wallet/balance` | `/api/comptabilite/balance` |
| `syncVintedInboxToManager` | Messagerie | `/api/v2/conversations` | `/api/extension/sync/inbox` |
| `pollActionQueueFromManager` | File d'actions (repost, etc.) | — | `/api/extension/actions` |

`getManagerApiUrl()` → `DEFAULT_MANAGER_URL = https://vinted-manager-flame.vercel.app/api/comptabilite/balance` (l'extension dérive les autres URLs à partir de celle-ci).

---

## 6. ⚡ Connaissances API Vinted (durement acquises — CRUCIAL)

Vinted n'a pas d'API publique. On utilise l'API privée `/api/v2/*` par injection. **Règles essentielles :**

1. **Origin / same-origin** : les endpoints sensibles (upload photo, création article) **REJETTENT** les requêtes du service worker (`Origin: chrome-extension://` → `403 access_denied`). Il faut les exécuter **dans le contexte de la page** via `chrome.scripting.executeScript({ world: "MAIN" })`. Les GET simples passent depuis le SW.
2. **CDN images** (`images*.vinted.net`) : accessible **depuis le SW** (host_permissions) mais **bloqué par CORS depuis la page**. → Pour le repost : on **télécharge/traite les images dans le SW**, on les passe en base64 à la page, qui les **uploade en same-origin**. (architecture hybride)
3. **Tokens** : `x-csrf-token` + `x-anon-id`. Capturés via un listener **`webRequest.onBeforeSendHeaders`** sur `*://*.vinted.*/api/*` (variable `vintedTokens` en haut de `background.js`) → plus fiable que le scraping du meta tag. Fallback meta tag + cookie `anon_id`.
4. **`X-Money-Object: true`** : quand cet en-tête est envoyé, Vinted renvoie le **prix comme objet** `{amount: "X.XX", currency}` au lieu d'un nombre. → toujours extraire `price.amount` (sinon `parseFloat(objet)` = `NaN`).
5. **`my_orders` ne contient PAS d'`item_id`** ! Clés réelles : `conversation_id, transaction_id, title, price, status, date, photo, photo_url, transaction_user_status`. Pour avoir l'`item_id` d'une vente → consulter `/api/v2/transactions/{transaction_id}`. (⚠️ L'approche `my_orders → transactions → item_id` + cache `txItemCache` qu'on avait codée dans le **dressing** a été **retirée** au profit de la détection GitHub par flags — voir §11. La connaissance reste valable si on veut la rebrancher.)
6. **Anti-bot / rate limit** : code `106` (`rate_limit_exceeded` ou `access_denied`). Vinted flague l'automatisation au-delà de **~2-3 actions/min**. Quand un `429` survient sur les DM → on met en pause 5 min (`dmRateLimitUntil`) et on stoppe tout le scan (flag `rateLimitHit`). Garder des **délais humains** (1,5-2,5 s) entre actions d'écriture.
7. **Ordre du dressing** : l'API wardrobe renvoie l'ordre du closet (tient compte des **bumps/remontées**). **NE PAS re-trier par date de création** (ça casse l'ordre). La version GitHub adoptée lit `wardrobe?...&order=relevance` et la route `/api/dressing` trie par `uploadedAtVinted desc`. Le champ `orderIndex` (modèle Prisma) n'est **plus écrit** par `metrics/route.ts` côté GitHub (vestige inoffensif, colonne nullable conservée).

---

## 7. 🔄 Fonction REPOST (republication) — `repostItemInPage(tabId, itemId, options)`

C'est la fonction la plus délicate. Workflow (aligné sur le userscript de référence `lo-bi/vintedRelister` qui fonctionne) :

1. **SW** : lit l'article (`/api/v2/item_upload/items/{id}`, fallback `/items/{id}`), télécharge chaque photo du CDN, applique rognage (`cropImageOffscreen`, défaut 20% ou anti-hash 1px), convertit en data URL base64.
2. **Page (MAIN world)** : pour chaque photo, reconstruit le Blob et POST `/api/v2/photos` (multipart : `photo[type]=item`, `photo[temp_uuid]`, `photo[file]`). **Un SEUL `temp_uuid` partagé** entre toutes les photos ET la création article (sinon photos orphelines/refusées). Headers upload : `x-csrf-token`, `x-anon-id`, `x-enable-multiple-size-groups: true` (PAS de `X-Money-Object`).
3. Supprime l'ancien article (`/api/v2/items/{id}/delete` puis fallback `DELETE`).
4. Crée le nouvel article en **un seul appel** `POST /api/v2/item_upload/items` avec `{ item: {...}, upload_session_id: tempUuid }` (PAS le flux drafts+completion).

Déclenché par une action `REPOST_ITEM` dans la file (`pollActionQueueFromManager`) ou le message `repostItemREST`. ✅ **Fonctionne** (testé : "Chapelet rome" → nouvel id 9180485592).

L'ancienne fonction `repostItemREST` dans `vinted-rest-api.js` (tout en SW) est **obsolète** (gardée mais inutilisée) — elle échouait au `403` upload photo.

---

## 8. État au 2026-06-15 (où on en est)

### ✅ Fait et validé
- **Repost** : entièrement fonctionnel (architecture hybride SW+page, temp_uuid unique, endpoint item_upload/items, extraction prix objet).
- **Repost multi-sélection** (2026-06-16) : cases à cocher sur les cartes du dressing (onglet « En ligne ») + bouton « Tout sélectionner » → repost en lot via `/api/dressing/repost` qui crée une action `REPOST_ITEM` par article avec `delayBeforeMs` aléatoire entre Délai Min/Max (sauf le 1er). `background.js` respecte déjà `delayBeforeMs`. Tout le pipeline préexistait ; seule l'UI de sélection (`src/app/dressing/page.tsx`) manquait.
- **Suivi temps réel du repost** (2026-06-16) : après lancement, la modale passe en mode progression (barre + statut par article + compte à rebours avant prochain repost + état « Terminé »). Source : `GET /api/dressing/repost?ids=...` (lecture seule, ne mute pas le statut) poll toutes les 2 s. Le compte à rebours est calculé côté manager via `completedAt(précédent) + delayBeforeMs`.
- **DM Favoris — panneau d'activité en direct** (2026-06-16) : feed type terminal sur `/dm-favoris` qui poll `/api/extension/logs?botName=X` (5 s) + compte à rebours rate-limit parsé des logs (« reprise auto à HH:MM » ou « (Xs restantes) »). `background.js` logue désormais `🔍 X favoris détectés · X à DM` au scan (uniquement si nouveau à DM, anti-spam) → **nécessite un rechargement d'extension** (contrairement au repost). Les logs DM sent/erreur/rate-limit existaient déjà.
- **DM Favoris** : feature complète — modèle `DmFavoriEvent`, page `/dm-favoris` + `/api/dm-favoris`, entrée de nav (`DashboardLayout`).
- **Auth/proxy** : `proxy.ts` corrigé, API publiques, plus de 401 sur `/api/ventes/[id]`.
- **Rate limit DM** : pause 5 min + arrêt complet du scan au premier 429.
- **Dashboard** : périodes 7j/15j/30j/90j + graphique dynamique, CA/bénéfice **excluent les `ANNULEE`**.
- **Détection auto annulations** : `comptabilite/orders` passe la `Vente` liée en `ANNULEE` + push (via `articleId` conservé).
- **Dressing** : détection statut/vendus + onglets + badges = **version GitHub adoptée** (voir §11).

### 🟡 À valider au prochain test
- **Dressing — détection des vendus (version GitHub)** : basée sur les flags du wardrobe (`is_sold`/`is_reserved`/`status_id 3/4/6`/`badge.title`/`item_closing_action`). À confirmer que tous les vendus remontent. **Limite connue** : un article vendu **et disparu** du wardrobe est marqué `Supprimé` (donc masqué), pas `Vendu`. Si ça pose problème → rebrancher l'approche `my_orders`/`txElement` (retirée, voir §5 et §11).

---

## 9. Pièges à retenir

- **Toujours `node --check background.js`** après édition de l'extension (gros fichier, facile de casser une accolade).
- Fonctions injectées via `executeScript` : **self-contained** (pas de référence au scope externe), args **JSON-sérialisables** (pas de Blob → passer en base64/dataURL).
- `created_at_ts` (wardrobe) est en **secondes** (× 1000 pour Date). Souvent absent sur drafts/sold → fallback `new Date()`.
- Le prix Vinted doit être **≥ 1.0 €** (sinon `validation_error`).
- Répondre **en français**.

---

## 10. Dernière synchro Git + Vercel (2026-06-16)

- **GitHub `main`** = HEAD `2eadc13` *"feat: suivi temps reel repost + panneau activite DM favoris"*. Historique récent : `2eadc13` (suivi repost + panneau DM) → `e318406` (repost multi-sélection) → `0d1bee2` (autre dev : notifications ventes, page network/logs, sync inbox enrichie, pullé en fast-forward) → `a434f9f` (repost, DM Favoris, dashboard periods, proxy fix).
- **Vercel prod** = redéployé depuis le local (`vercel --prod --yes`), alias `https://vinted-manager-flame.vercel.app` → READY (dernier `dpl_2S1md8...`).
- ⚠️ **Le déploiement vient du LOCAL, pas de GitHub.** Si l'autre dev redéploie depuis sa machine, il peut écraser. Toujours vérifier `git fetch` + l'état du local avant de redéployer.
- **Note dépendances** : le pull `0d1bee2` a ajouté `sonner` + `react-force-graph-2d` au `package.json` (non installés en local → erreurs tsc `Cannot find module` côté `layout.tsx`/`NetworkGraph.tsx`/`GlobalNotificationSystem.tsx`, inoffensives car le build Vercel fait `npm install`). Lancer `npm install` en local si besoin de dev.
- **Extension** : `background.js` modifié (log détection DM `🔍 X favoris détectés · X à DM`) → **recharger l'extension** (`chrome://extensions` → ↻) pour l'activer. Le suivi repost côté Manager ne nécessite aucun rechargement.

---

## 11. Décision dressing (2026-06-15) — pourquoi le local et GitHub divergeaient

Le local et GitHub avaient **deux implémentations différentes** de la détection des vendus au dressing :

- **Local (notre travail, plus complexe)** : croisait `my_orders → /transactions/{id} → item_id` + cache `txItemCache`, gérait les vendus disparus du wardrobe. Logs `🧾 my_orders: …`.
- **GitHub (autre dev, plus simple)** : détection directe via les flags du payload wardrobe (`is_sold`, `is_reserved`, `status_id`, `badge.title`, `item_closing_action`).

**Choix de l'utilisateur : garder la version GitHub du dressing.** Donc :
- Restaurés à la version GitHub : `src/app/dressing/page.tsx`, `src/app/api/dressing/route.ts`, `src/app/api/extension/sync/metrics/route.ts`.
- Dans `background.js`, **seule** la fonction `syncVintedItemMetricsToManager` a été remplacée par celle de GitHub (le reste — repost, DM favoris — est resté local). Splice fait par script Node en UTF-8 pour préserver accents/emojis.
- Tout le reste de notre travail (repost, DM Favoris, dashboard, proxy, auto-annulation) a été conservé puis poussé.
