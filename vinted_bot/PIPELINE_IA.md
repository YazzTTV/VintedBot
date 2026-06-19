# Pipeline Annonces IA — Génération d'images (Nano Banana) + Publication multi-comptes

> Mise à jour : 2026-06-18. Chaîne complète **produit → 3 images IA par compte → annonce Vinted** sur les 5 comptes.

## 1. Vue d'ensemble du flux

```
1 photo produit (capture Shein/desktop)
   └─ processor.py        → analyse Gemini native (gemini-3.1-flash-lite)
   │                        → titre + description (dans la langue du compte) + prompt anglais
   └─ nano_banana.py      → génération images Gemini (gemini-3.1-flash-image)
   │                        → 3 images/compte : selfie / profil / cintre (avatar+hanger du compte)
   └─ vinted_publisher.py → remplit le formulaire Vinted (Brave/CDP) et sauve en brouillon
```

Le générateur **nano_banana.py** a remplacé l'ancien pipeline navigateur (Gemini Web / `chatgpt_upscaler.py` / `edge_browser.py`) : tout passe par l'API officielle `google-genai` (~5-10 s/image).

## 2. Scripts d'orchestration (ajoutés cette session)

- **`generer_tous.py <photo>`** — analyse + génère les 3 images pour les 5 comptes (langue/taille de chaque compte). Sortie : `vinted_bot/_test_out_<compte>/` (images + titre.txt + description.txt).
- **`publier_tous.py`** — publie (brouillon par défaut, `--submit` pour publier en vrai) sur tous les comptes via **une seule instance Brave** (port 9220). Pour chaque compte : retrouve son onglet par le login Vinted (`/api/v2/users/current`), le marque `?bot_profile=<compte>`, puis appelle le publisher.

### Workflow type (2 commandes)
```
.venv\Scripts\python vinted_bot\generer_tous.py "C:\...\Desktop\PRODUIT.png"
.venv\Scripts\python vinted_bot\publier_tous.py
```
Prérequis : Brave lancé avec `--remote-debugging-port=9220` + toutes les fenêtres de profils ouvertes/connectées à Vinted.

## 3. Environnement (sur CE PC)

- venv dédié : `vinted_bot/../.venv` (Python 3.11.15). Deps : google-genai, Pillow, numpy, opencv-python, python-dotenv, playwright (+ chromium), requests.
- Clé : `vinted_bot/.env` → `GEMINI_API_KEY` (non commité).
- Microsoft VC++ x64 Redistributable installé (requis par greenlet/playwright).

## 4. Réglages du publisher (en dur dans vinted_publisher.py)

- Prix : **55 €** · Marque : **« Vintage chic »** · État : **« Très bon état »** · Colis : **« Petit »**.
- Ordre des photos : **selfie → profil → cintre** (pas de tri alphabétique).

## 5. Correctifs appliqués cette session

- `nano_banana.py` : prompts du cintre interdisent toute **étiquette/marque/logo/texte** (plus de fausse étiquette inventée).
- `vinted_publisher.py` : `networkidle` → `domcontentloaded` (Vinted ne déclenche jamais networkidle) ; prix 50→55 ; état « Neuf » → « Très bon état » ; ordre photos corrigé ; navigation post-sauvegarde dans try/except (plus de faux « ECHEC »).
- `processor.py` : imports `playwright`/`edge_browser` (legacy) rendus optionnels — l'analyse n'a plus de dépendance navigateur.
- `config_manager.py` : `ignored_accounts` vidé (les 5 comptes sont actifs).
- `niche_definitions/garment.json` : recette = selfie / profil / cintre (3 images).

## 6. Mapping comptes (CE PC) — ⚠️ spécifique machine, NE PAS pousser sur git

| Compte | Profil Brave | Login Vinted | Langue |
|---|---|---|---|
| emma | Profile 1 | emma_clt3 | fr |
| Yazz | Profile 2 | yazz_tw | fr |
| nina | Profile 4 | nina_mamey | fr |
| lena | Profile 5 | lenabalvade | nl |
| orane | Profile 6 | orane_dlt | nl |

Tous sur le **port CDP 9220** (une instance Brave, plusieurs fenêtres de profils — le `/json` du port expose les onglets de tous les profils, chaque onglet gardant sa session).

## 7. Contraintes serveur (importantes)

- **6 Go de RAM** : ne pas lancer 5 instances Brave séparées en parallèle (saturation → timeouts CDP). → une seule instance, tous les profils dedans.
- **Ne PAS copier les profils Brave** dans des user-data-dir séparés : se reconnecter au même compte depuis un profil copié = « nouvelle machine » → **Vinted invalide la session d'origine**. (Tentative « Option B » abandonnée pour ça.)
- Fermeture gracieuse de Brave inopérante (taskkill inefficace) → force-kill, qui peut perdre une session fraîche non flushée. Donc : connecter PUIS publier sans tuer Brave entre les deux.

## 8. Repost des articles VENDUS (2026-06-19)

**Problème** : une fois un article vendu, **Vinted le retire de son API** (`/api/v2/items/{id}` → 404, la transaction porte `removed_item_title`). Impossible donc de copier un vendu depuis Vinted (plus de photos/catégorie). Même approche que Vinteo : **snapshot avant la vente**.

- **`vinted-extension/background.js`** :
  - `snapshotActiveItems()` : à chaque sync du dressing, sauvegarde les données complètes des articles **actifs** (via `/api/v2/item_upload/items/{id}` : photos full-size + catalog/size/brand/color/package/status) dans `chrome.storage.local` (`vb_snapshot_<id>`). Rate-limité : 8/cycle, seulement les non-encore-sauvegardés, délais humains. **Envoie aussi** chaque snapshot au Manager.
  - `repostItemInPage()` : ordre de lecture = API live → **snapshot local** → **snapshot Manager** → scraping HTML (fallback associé) → erreur. Photos re-téléchargées du CDN (qui survit à la vente, testé).
- **`vinted-manager`** : modèle Prisma **`ItemSnapshot`** (`vintedItemId`, `payload`, `account`) + route **`POST/GET /api/extension/snapshot`** (upsert lot + lecture par id). → persistance durable (survit reload/réinstall extension, changement de PC).
- **UI `dressing/page.tsx`** : repost + dupliquer disponibles sur l'onglet **« Vendu »** ; `deleteAfter=false` pour les vendus (Vinted refuse de supprimer une vente).
- **`manifest.json`** : permission `unlimitedStorage`.
- ⚠️ **Limite** : ne marche que pour les articles vus **actifs APRÈS** activation du snapshot (les articles vendus avant n'ont aucun snapshot → non repostables).
- ⚠️ Le repost s'exécute dans l'onglet du compte « optimal » (la file `/api/extension/actions` est interrogée pour le compte de cet onglet) → garder le bon compte ouvert/actif.

## 9. Validé

- 5 comptes : 3 images générées par compte + annonce en brouillon (produit test « robe verte », puis produit « robe blanche dos nu »). Catégorie auto-détectée par Vinted, titres FR/NL selon le compte. ✅
- Repost vendus : UI déployée (Vercel prod), snapshots créés et vérifiés (données complètes + photos CDN OK), route Manager `/api/extension/snapshot` live (testée). Test end-to-end réel = à la prochaine vente d'un article snapshotté. ✅
