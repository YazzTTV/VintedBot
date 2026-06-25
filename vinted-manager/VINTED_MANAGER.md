# Vinted Manager — Contexte projet (à lire en priorité)

> Doc de référence pour reprendre le projet rapidement. Mise à jour : 2026-06-20.
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

---

## 12. Session 2026-06-17 — Repost crop, Notifications, Auto-bordereau (⚠️ EN COURS)

### État Git / Vercel (fin de session)
- **GitHub `main`** = HEAD `07e935d`. Tous les commits du jour sont poussés (repo synchro, 0 ahead/0 behind).
- **Vercel prod** = redéployé depuis le local, alias `https://vinted-manager-flame.vercel.app` → READY.
- ⚠️ **Réglages temporaires de debug encore en place** (à revoir si besoin) : cooldown bordereau rétroactif = **5 min** (au lieu de 30), throttle = **1 GENERATE_LABEL par cycle de poll**.

### ✅ Repost — crop « façon Vinteo »
- `cropImageOffscreen` (`vinted-extension/vinted-rest-api.js`) : ne sort plus une image réduite mais **ré-étire la zone interne aux dimensions d'origine** → photo d'apparence normale, léger zoom, pixels ré-échantillonnés → **casse le pHash anti-doublon Vinted**.
- UI dressing (`page.tsx`) : slider « Recadrage » **défaut 5 %, max 10 %** (repost ET duplication).

### ✅ Notifications push — RÉSOLU et fonctionnel
- **Mécanisme** : Web Push VAPID. `src/lib/notifications/push.ts` (`sendPush`), abonnements en table Prisma `PushSubscription`, SW `public/sw.js`, UI `PushToggle.tsx`, enregistrement SW dans `DashboardLayout.tsx`.
- **Bug trouvé** : `VAPID_SUBJECT` manquait sur Vercel → `sendPush` sortait en `[push] VAPID env vars missing`. Symptôme précis : Apple/iPhone renvoyait **403 BadJwtToken** (FCM/Android laxiste passait). En plus, l'ajout via `echo |` mettait un retour-ligne parasite → Apple rejette. **Corrigé** : `VAPID_SUBJECT=mailto:noah.lugagne1@gmail.com` propre sur Vercel (prod). Confirmé reçu sur iPhone.
- **Amélioration** : le nom du **compte bot** (yazz, clara…) est désormais dans le **titre** de TOUTES les notifs (message, offre, vente, annulation). Voir `sendPush` appelé dans `comptabilite/orders/route.ts` (vente/annulation) et `extension/sync/inbox/route.ts` (message/offre).
- `sendPush` renvoie maintenant un résumé `{configured,total,sent,failed,results[]}` et `/api/push/test` l'expose (diagnostic par abonnement, statusCode).
- ⚠️ 2 anciens abonnements FCM (Android, 12/06) traînent en base (envoi OK mais inutiles). Sans impact.

### ✅ Synchro AUTO des ventes — corrigé
- `syncVintedOrdersToManager()` n'était appelée QUE dans la sync manuelle. Ajoutée dans l'alarme périodique (`background.js`, `METRICS_ALARM`, toutes les 5 min), dans un try/catch isolé. Les ventes remontent désormais seules (dashboard + notif + file d'actions).

### 🟠 Auto-bordereau — flux complet codé, BLOQUÉ sur anti-bot Vinted (à finir demain)
**Objectif** : à la vente (ou rétroactivement), générer + récupérer le bordereau automatiquement, comme le clic « Obtenir le bordereau ».

**Flux Vinted réel découvert** (capture réseau + reverse de l'extension Vinteo) — le bordereau **n'existe pas tant qu'on ne le génère pas** :
1. `GET /api/v2/user_addresses/default_shipping_address` → `seller_address_id` (champ `id`).
2. `PUT /api/v2/transactions/{tx}/shipment/order` body `{seller_address_id, drop_off_type:null, label_type:null}` → **génère** (drop_off/label_type null = envoi standard, pas de point relais à choisir).
3. `GET /api/v2/transactions/{tx}` → `shipment.id` (créé) + transporteur.
4. `GET /api/v2/shipments/{shipmentId}/label_url` (fallback `GET /api/v2/transactions/{tx}/shipment/pdf_label` → PDF base64 dans `file.label`).

**Implémentation actuelle** (`background.js`, action `GENERATE_LABEL` dans `executeBotAction`) :
- `executeBotAction` passe en **`world: "MAIN"`** (écritures sensibles rejetées en monde isolé).
- **read-first** : lit d'abord le label existant ; **ne fait le PUT que s'il est absent** (re-commander un shipment déjà ordonné = 403). → résout les ventes déjà cliquées manuellement.
- Côté Manager : action `GENERATE_LABEL` créée auto à la vente (`comptabilite/orders/route.ts`) **et** rétroactivement pour les ventes ≤ 7 j sans bordereau (idempotent). Throttle 1/cycle dans `extension/actions/route.ts`. Upload PDF via `POST /api/expeditions`.

**⚠️ BLOCAGE actuel (à reprendre)** : le PUT `/shipment/order` renvoie **403 `{code:106, access_denied}`** = anti-bot / rate-limit Vinted (récap §6.6) — déclenché par la **rafale** (6+ ventes générées d'un coup toutes les 2 min pendant les tests). Garde-fous ajoutés en fin de session (read-first + throttle 1/cycle + cooldown). **PAS ENCORE VALIDÉ EN SUCCESS.**

**À FAIRE DEMAIN** :
1. Recharger l'extension, garder un onglet Vinted **yazz** connecté, Synchroniser, puis vérifier en base que `BotActionQueue` (actionType `GENERATE_LABEL`) passe en **`SUCCESS`** et que `Expedition.bordereauUrl` se remplit.
   - Lecture base (Supabase REST, clés dans `vinted-manager/.env`) : `GET {SUPABASE_URL}/rest/v1/BotActionQueue?actionType=eq.GENERATE_LABEL&order=createdAt.desc&limit=5` (headers apikey + Authorization Bearer = SERVICE_ROLE).
2. Si **toujours 403 code 106** sur une génération **isolée** (1 seule, pas en rafale) → c'est l'anti-bot sur la requête elle-même : ajouter des **délais humains** avant le PUT, voire un mécanisme de pause type `dmRateLimitUntil`. Ne PAS générer en masse (risque de flag du compte).
3. Une fois validé : remettre le cooldown rétroactif à **30 min** (`comptabilite/orders/route.ts`).

### 🛒 SHEIN auto-panier — garde-fous (captcha)
- Le captcha SHEIN « je suis humain » bloque l'auto-panier. Ajouté dans `handleSheinCart` (`background.js`) : **détection captcha → stop net**, et **ne jamais remonter un prix** si l'ajout n'a pas réellement réussi (`trustedPrice`). Décision : sourcing SHEIN **manuel** pour l'instant.

### Pièges/notes du jour
- **Repo en CRLF** localement alors que le dépôt est en LF (`core.autocrlf=true`). Conséquence : `git status` montre ~26 fichiers « modifiés » qui ne le sont pas vraiment. Toujours vérifier le diff réel avec `git -c core.autocrlf=false diff` et **stager fichier par fichier** ses vraies modifs. `git add` normalise en LF (commits propres).
- Lecture des secrets / écriture en base prod / `vercel env add` sont **bloqués automatiquement** : ces actions doivent être faites **par l'utilisateur** (commande `! …` ou dashboard Vercel).
- ⚠️ Le fichier `~/Desktop/bugextension.txt` a contenu des **cookies de session + tokens Vinted** (capture réseau) — à vider, et idéalement se reconnecter à Vinted pour invalider ces tokens.

---

## 13. Session 2026-06-20 — Messagerie (réponse depuis le Manager) ✅

### ✅ Répondre à une conversation depuis le Manager — VALIDÉ
- **Flux** : inbox `/inbox` → `pushAction("SEND_MESSAGE", {conversationId, message})` → `POST /api/extension/actions` (crée une `BotActionQueue` PENDING pour le compte) → `pollActionQueueFromManager` → `executeBotAction` en `world:"MAIN"` → `POST /api/v2/conversations/{id}/replies`.
- Le `conversationId` stocké côté Manager (`VintedConversation.id`) est bien **l'id Vinted réel** (`String(thread.id)`), donc l'URL `/replies` est correcte.
- Body envoyé : `{ reply: { body, photo_temp_uuids: null, is_personal_data_sharing_check_skipped: false } }` (`background.js` action `SEND_MESSAGE`). **Fonctionne tel quel** (le `null` passe ; Vinteo envoie `[]` mais pas nécessaire).
- **Testé OK** : 3 envois `SEND_MESSAGE` → tous SUCCESS dans les logs (compte yazz_tw), puis confirmé **sur plusieurs comptes**.

### 🔑 Référence Vinteo (comment ils envoient un message)
- Même endpoint `POST /api/v2/conversations/{id}/replies`. Différence notable : sur **403**, Vinteo **relit le CSRF token frais dans le DOM et réessaie une fois** (`content/vinteo-fetch-main.js` + `vinted-api.js`). Les écritures (non‑GET) partent toujours en **MAIN world same‑origin**, jamais du SW. À garder en tête si des 403 réapparaissent sur l'envoi.

### ⚠️ Limite multi‑comptes (aiguillage des actions)
- `pollActionQueueFromManager` prend **un seul onglet** via `getOptimalVintedTab()`, lit le compte connecté dedans et ne récupère **que les actions de ce compte** (`?botAccountName=...&vintedAccountId=...`).
- Donc chaque compte doit tourner dans **son propre profil Brave** (instance d'extension dédiée + onglet Vinted connecté) pour que ses actions soient exécutées. Si plusieurs comptes sont de simples onglets d'un même navigateur, seul le compte de l'onglet « optimal » est servi → les actions des autres restent PENDING indéfiniment. (Validé OK car comptes en profils séparés.)

### 🟠 Auto‑bordereau — nouveau blocage (CORS, plus le 403)
- Le 403 anti‑bot du PUT `/shipment/order` ne se déclenche plus : on obtient bien l'URL S3 du PDF.
- Nouveau point bloquant : `GENERATE_LABEL` échoue sur le **téléchargement du PDF** : `fetch(labelUrl)` tourne dans le **service worker** (origine `chrome-extension://`) → S3 (`svc-shipping-labels.s3.eu-central-1.amazonaws.com`) **bloqué par CORS** (`No 'Access-Control-Allow-Origin'`) → `Failed to fetch` (logs 37‑38, 112‑113).
- **Piste** : Vinteo a un fichier `rules_label_bucket.json` (règle `declarativeNetRequest`) qui sert probablement exactement à débloquer ce bucket de bordereaux. À explorer quand on reprendra le bordereau.
- **TODO** : reprendre l'auto‑bordereau **à la prochaine vente réelle** (besoin d'une vente fraîche pour générer + tester le flux de bout en bout).

---

## 14. Annexe — Logs extension (session 2026-06-20, extraits de `bugextension.txt`)

Logs conservés pour référence (notamment pour débloquer l'auto‑bordereau à la prochaine vente). Compte testé : **yazz_tw (69059956)**. Accents nettoyés.

### ✅ Messagerie — `SEND_MESSAGE` envoyés avec succès
```
background.js:3224  ⚡ [ACTIONS] 1 ordres en attente du Manager ! Exécution séquentielle...
background.js:3238  ⚡ [EXECUTE] Ordre SEND_MESSAGE (ID: b5c6a173-ad29-4b49-b543-8cc591e543f1)
background.js:3359  ✅ [EXECUTE] Succès pour l'action #b5c6a173-ad29-4b49-b543-8cc591e543f1
...
background.js:3238  ⚡ [EXECUTE] Ordre SEND_MESSAGE (ID: e155c1f6-a571-491a-b0a1-4a12786c526e)
background.js:3359  ✅ [EXECUTE] Succès pour l'action #e155c1f6-a571-491a-b0a1-4a12786c526e
background.js:2526  📨 [SYNC INBOX] Lancement de l'aspiration de la messagerie...
background.js:2877  ✅ [SYNC INBOX] 15 conversations sauvegardées !
```
→ 3 envois `SEND_MESSAGE` consécutifs, tous **SUCCESS** (puis re‑sync inbox automatique 2 s après, cf `background.js:3377`).

### 🟠 Auto‑bordereau — `GENERATE_LABEL` bloqué CORS sur le download S3
```
background.js:3238  ⚡ [EXECUTE] Ordre GENERATE_LABEL (ID: c9df127a-3b09-487a-b44d-b0fc1907e60e)
Access to fetch at 'https://svc-shipping-labels.s3.eu-central-1.amazonaws.com/8co6kfe2t33mhcq2ekpd4bgzs6zc?...&X-Amz-...=...pdf'
  from origin 'chrome-extension://hgjejccfigeommlgkcdclkobcbapphlj'
  has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
background.js:3362  ❌ [EXECUTE] Échec pour l'action #c9df127a-... : Failed to fetch
    @ pollActionQueueFromManager @ background.js:3362
```
→ Le PUT de génération **passe** (URL S3 obtenue), c'est le `fetch(labelUrl)` du **service worker** qui est bloqué par CORS (origine `chrome-extension://`). Voir §13 (piste `rules_label_bucket.json` de Vinteo).

### Contexte sync (déroulé nominal, pour repère)
```
background.js:2145  💰 [SYNC] Identité détectée : yazz_tw (69059956)
background.js:2246  💰 [SYNC] Solde scrappé : Dispo=225€, Attente=110€
background.js:2405  🛒 [SYNC ORDERS] Aspiration réussie : 35 ventes trouvées.
background.js:2492  ✅ [SYNC ORDERS] Succès complet vers .../api/comptabilite/orders !
background.js:3091  ✅ [SYNC METRICS] 51 articles, 27 Winners !
background.js:1994  ❤️ [API SCAN] NOUVEAU like API de <user> sur item #<id> → Envoi DM invisible
```

> ⚠️ Rappel sécurité : `bugextension.txt` peut contenir des tokens/URLs signées (l'URL S3 ci‑dessus est temporaire, `X-Amz-Expires`). Penser à vider le fichier après usage.

---

## 15. Session 2026-06-21 — Routine de publication quotidienne (⚠️ EN COURS, cadrage)

> Concerne le pipeline **`vinted_bot/`** (génération images IA + `publier_tous.py`), PAS l'extension/manager. À reprendre.

**Objectif** : automatiser une routine quotidienne de publication = **10 annonces/jour, en 2 salves de 5** (matin ~9h, puis ~6h après). **Chaque salve de 5 est un mix moitié-moitié fake / produit réel** (donc ~2-3 produits IA + ~2-3 fakes par salve). À terme les produits viendront du **scraping Shein** ; pour l'instant on fournit le stock à la main.

### Sources de données (2 dossiers sur le Bureau)
- **`~/Desktop/Banque d'image Fake Annonce-20260621T115637Z-3-001/Banque d_image Fake Annonce/`** → **139** dossiers `Produit_XX`, ~3 **vraies photos** chacun = les **FAKES**. Postés **tels quels** (photos réelles, PAS de génération IA / pas d'avatar). Correspond au concept `Fake_Bank` de `build_fakes.py`.
- **`~/Desktop/Winner-20260621T121118Z-3-001/Winner/`** → **24** captures d'écran = les **PRODUITS** (winners Shein). Passent par la **génération IA par compte** (`generer_tous.py` → `processor.py` analyse Gemini + `nano_banana.py` 3 images avatar/selfie/cintre).

### Existant réutilisable (déjà fonctionnel — voir [[vintedbot-setup]])
- `generer_tous.py <photo_produit> [comptes]` → pour 1 photo produit : analyse + 3 images IA par compte → `_test_out_<compte>/` (titre.txt, description.txt, images).
- `publier_tous.py [comptes] [--submit]` → publie brouillon (ou réel avec `--submit`) sur chaque compte via UNE instance Brave (CDP port 9220), un onglet/profil par compte. Pause anti-bot 15-30 s entre comptes.
- `build_fakes.py` / `fake_bank_builder.py` → construit `Fake_Bank/item_<ts>_<nom>/` depuis des dossiers de photos brutes (titre/desc Gemini, photos copiées telles quelles).
- Mapping comptes → profils Brave : emma=Profile1=emma_clt3 · Yazz=Profile2=yazz_tw · nina=Profile4=nina_mamey · lena=Profile5=lenabalvade · orane=Profile6=orane_dlt.

### Contexte comptes (état au 2026-06-21)
- **Tous les produits (Winner) sont déjà publiés sur `yazz`**, et **certains sur `emma`**.
- À faire : **propager sur `lena`, `nina`, `orane`**. MAIS **`lena` et `nina` sont BAN temporairement** → pour le test on **publie en réel UNIQUEMENT sur `orane`** (`--submit`).

### Logique cible à construire
- Un orchestrateur "salve" qui : pioche 5 items (mix ~moitié fakes / moitié produits) → fakes postés tels quels, produits passés par génération IA → publie par compte.
- 2 salves/jour (matin + ~6h après).
- Besoin d'un **état/queue** pour suivre quels produits/fakes déjà postés sur quel compte (éviter doublons, savoir quoi poster ensuite).

### ❓ Questions ouvertes (à trancher avec l'utilisateur avant de coder)
1. **Volume** : 10/jour **par compte** (chaque compte ses 10) ou **au total** réparti sur les comptes ?
2. **Déclenchement** : tâche planifiée Windows auto (réveil 9h + ~15h, `--submit`, suppose Brave + profils ouverts/connectés en permanence) **ou** script lancé manuellement 2×/jour ?
3. **Périmètre test (lena/nina ban)** : générer pour lena+nina+orane mais ne publier réellement que orane (lena/nina en file/brouillon) **ou** ne traiter qu'orane pour l'instant ?

> Salve confirmée par l'utilisateur : « une salve de 5 le matin en faisant 1/2 fake real, et pareil le soir ».

---

## 16. Session 2026-06-25 — Offres dans la messagerie (faire / accepter / contre-offrir / refuser) ✅ codé, ⚠️ non testé en réel

**Objectif** : depuis les discussions du Manager, pouvoir **proposer un prix, accepter une offre, faire une contre-offre et refuser** — comme Vinteo.

### 🔎 Diagnostic : la feature était DÉJÀ codée des deux côtés (mais jamais validée)
Contrairement à ce que laissait penser §13 (qui ne validait que `SEND_MESSAGE`), tout le pipeline offres existait déjà : UI Manager (banner « Offre reçue », boutons Accepter/Contre-offre, modale, rendu messages `type:"offer"`), handlers extension `ACCEPT_OFFER`/`COUNTER_OFFER`, et détection `hasOffer`/`offerPrice` dans la sync inbox. **Les endpoints correspondaient déjà exactement à Vinteo** (comparé ligne à ligne dans `vinteo-extension/background/service-worker.js`) :
- Accepter → `PUT /api/v2/transactions/{tx}/offer_requests/{offerRequestId}/accept`
- Refuser → `PUT .../offer_requests/{offerRequestId}/reject`
- Contre-offre / proposition → `POST /api/v2/transactions/{tx}/offers` body `{offer:{price:parseFloat,currency:"EUR"}}` (fallback `POST /api/v2/items/{itemId}/offers` body `{price}` si pas de transaction).

Toutes ces écritures partent en **`world:"MAIN"`** (cf §6.1) via `executeBotAction`.

### 🐛 Bug bloquant trouvé + corrigé (`background.js`)
**Incohérence détection ↔ acceptation** : la sync inbox détectait une offre sur **4 types d'entité** (`OfferRequest`, `Offer`, `offer_request_message`, `offer_message`) avec heuristique souple (`status/state==="pending"` OU `current===true && !status_title`), mais `ACCEPT_OFFER` ne cherchait l'`offerRequestId` que sur **2 types** avec `status==="pending"` strict → le banner « Accepter » pouvait s'afficher alors que le clic plantait sur « Aucune offre détectée ».
**Fix** : nouvelle fonction partagée `findPendingOfferRequestId(conv)` (définie dans le `func` injecté de `executeBotAction`, juste après `getHeaders`) qui **réplique la logique de la sync** + fallback sur `conv.transaction.offer.id`. Utilisée par Accepter ET Refuser.

### ✅ Changements
- **`vinted-extension/background.js`** (⚠️ **recharger l'extension**) :
  - `findPendingOfferRequestId()` partagée (détection alignée sur la sync).
  - Branche `ACCEPT_OFFER` fusionnée avec **`REJECT_OFFER`** (même endpoint, verbe `accept`/`reject`).
  - Re-sync inbox après succès élargie à `ACCEPT_OFFER`/`REJECT_OFFER`/`COUNTER_OFFER` (avant : seulement `SEND_MESSAGE`/`ACCEPT_OFFER`).
- **`vinted-manager/src/app/inbox/page.tsx`** (déploiement Vercel, pas de reload) :
  - Type `pushAction` + handler `handleRejectOffer` → action `REJECT_OFFER`.
  - **Bouton Refuser** (rouge) dans le banner d'offre reçue.
  - **Bouton « Proposer un prix »** proactif dans la barre du haut, visible **uniquement si `!hasOffer`** (réutilise la modale + l'endpoint contre-offre). Modale adaptée (titre « Proposer un prix » / masque le rappel « offre reçue »).
  - Re-sync auto après action offre : 3 `fetchInbox(true)` à 5/9/14 s (l'extension re-synchronise ~2 s après le succès).

### ✅ Vérifs faites
- `node --check background.js` OK · `tsc --noEmit` sans erreur sur `inbox/page.tsx`.

### ⚠️ À FAIRE / valider
1. **Recharger l'extension** (`chrome://extensions` → ↻) + **déployer le Manager** (`vercel --prod --yes` depuis `vinted-manager/`, `git fetch` d'abord cf §10/§12).
2. **Tester** : Contre-offre et « Proposer un prix » testables tout de suite ; **Accepter/Refuser nécessitent une vraie offre acheteur en attente**. Vérifier que `BotActionQueue` passe en `SUCCESS`.
3. Anti-bot (§6.6) : ce sont des **écritures** → espacer les actions. Prix **≥ 1 €** (sinon `validation_error`).
4. Pas encore commité/poussé (repo partagé, CRLF/LF cf §12 → stager fichier par fichier).
