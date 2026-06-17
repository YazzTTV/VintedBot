# VintedBot — Architecture Complète
## Mécanisme de Création d'Annonces & Génération Photos IA

---

## 1. Vue d'ensemble du flux
```
SCRAPING (Shein)
    ↓
ANALYSE IA (Gemini)
    ↓
GÉNÉRATION IMAGES IA (Gemini Web)
    ↓
PUBLICATION (Vinted via Playwright + Extension Chrome)
    ↓
GESTION (Vinted Manager Next.js)
```

---

## 2. Phase 1 : SCRAPING (Shein)

### Fichier principal
`vinted_bot/scraper.py` — Async scraper Playwright qui navigué sur Shein et capture les produits.

### Processus
1. **Initialisation CDP** : Se connecte à l'instance Brave/Edge lancée par `edge_browser.py` (port 9222).
2. **Navigation vers l'URL Shein** (définie par la niche — ex: `garment.json` → `https://fr.shein.com/...`).
3. **Fermeture des pop-ups** : Captchas, banneau promo orange, cookies. Multiples sélecteurs pour être robuste.
4. **Scroll + scraping des produits** : Pour chaque produit visible :
   - URL du produit
   - Couleur
   - Prix
   - Images brutes
5. **Capture d'écran produit** : Prend une **capture HTML brute du produit Shein** (screenshot complet, pas juste le vetement).
6. **Stockage local** : Crée une structure `outputs/NICHE_NAME/[produit_1, produit_2, ...]/` avec les images et les URLs.

### Résultat
```
outputs/garment/PRODUCT_001/
    ├── screenshot_shein.png      # Capture brute Shein
    ├── image_1.jpg
    ├── image_2.jpg
    ├── url.txt                   # URL source Shein
    └── price.txt
```

---

## 3. Phase 2 : ANALYSE IA (Gemini API)

### Fichier principal
`vinted_bot/processor.py` — Analyse l'image Shein via **Google Gemini API Native** (pas Web).

### Processus
1. **Input** : `screenshot_shein.png` (la capture produit)
2. **API Gemini 3.1 Flash Lite** : Envoie le screenshot + un prompt multi-langue.
3. **Prompt personnalisé** (template du `niche_definitions/<niche>.json`) :
   - Pour `garment` : "Identifie le vêtement, génère un titre Vinted (max 40 chars), une description (3-4 phrases), un prompt d'image en anglais"
   - Pour `stroller` : même chose adaptée aux poussettes
   - **Variables injectées** : `{PERSONA}`, `{CONSIGNES_LANGUE}`, `{PHRASES_TYPIQUES}`, `{TAILLE_CIBLE}`

### Points clés

#### Prompts multi-langue
```python
if lang_lower == "nl":  # Néerlandais
    persona = "Tu es une vendeuse néerlandaise..."
    instructions_langue = "Rédige EXCLUSIVEMENT en Néerlandais..."
elif lang_lower == "lb":  # Luxembourgeois
    persona = "Tu es une vendeuse luxembourgeoise..."
```

#### Sécurité contre les marques de fabricants
```python
forbidden = r'\b(?:shein|temu|aliexpress|ali\s+express)\b'
# Toute mention de Shein/Temu dans le titre/desc est PURGÉE
# pour protéger la "valeur perçue" sur Vinted
```

#### Parsing robuste (3 fallbacks)
```
Format 1 : Balises explicites [TITRE_VINTED]...[/TITRE_VINTED]
        ↓ (si échoue)
Format 2 : Structure naturelle "Titre :" / "Description :" / "Prompt :"
        ↓ (si échoue)
Format 3 : JSON libre {}
```

### Sortie
```
{
  "titre_vinted": "Robe fleurie été",        # 40 chars max, sans emoji
  "description_vinted": "Jolie robe...",     # 3-4 phrases naturelles, sans hashtag
  "prompt_image_anglais": "A long floral summer dress with a v-neck"  # Pour générer photos
}
```

Sauvegardé dans `product_dir/titre.txt`, `description.txt`, `prompt_anglais.txt`.

---

## 4. Phase 3 : GÉNÉRATION IMAGES IA

### Fichiers principaux
- `vinted_bot/image_generator.py` — Orchestre les générations d'images
- `vinted_bot/edge_browser.py` — Gère la session Gemini Web (Edge CDP)
- `vinted_bot/chatgpt_upscaler.py` — Upscale les images finales

### Architecture
```
Gemini Web (Edge CDP)
    ↓
    ├── Étape 1 : Upload avatar + screenshot Shein
    ├── Étape 2 : Envoie un prompt "Clothes Swap"
    ├── Étape 3 : Attend 120s la génération
    └── Étape 4 : Télécharge l'image générée
         ↓
    Upscale (ChatGPT ou Higgsfield)
         ↓
    Nettoyage (crop 3:4 portrait, purge métadonnées)
```

### 4.1 Clothes Swap (fonction `generate_selfie`)

**Principe** : Mets la tête/silhouette d'un avatar dans les vêtements du produit Shein.

**Input** :
- `avatar` : Photo de profil (visage + silhouette)
- `input_image_path` : Screenshot Shein du produit
- `prompt_anglais` : "A long floral summer dress with a v-neck" (du processor)

**Prompt Gemini Web** (français) :
```
Prends la fille de l'image 1 (visage, coiffure, silhouette) et mets-lui la tenue de l'image 2.
Génère une SEULE photo ultra réaliste, style SELFIE naturel dans un miroir.
CHANGE le décor : place la fille dans [chambre lumineuse | dressing | salle de bain | etc. — aléatoire]
L'image doit être au format vertical portrait 3:4 (aspect ratio 3:4) et parfaitement centrée.
```

**Résultat** : `selfie.jpg` (avataar portant le vêtement Shein, fond varié, 3:4)

### 4.2 Flat Lay (fonction `generate_flat_lay`)

**Principe** : Vêtement à plat sur le sol (vue de dessus 90°), pas de mannequin.

**Input** :
- `template` : Une image modèle "vêtement à plat" (sol de référence)
- `input_image_path` : Screenshot Shein
- `prompt_anglais` : Du processor

**Prompt Gemini Web** :
```
Remplace le vêtement de l'image 1 par le vêtement de l'image 2.
Garde le vêtement PARFAITEMENT À PLAT (flat lay, vue 90°), mais change le sol.
Place-le sur [sol en parquet | tapis beige | lit blanc | béton ciré | etc. — aléatoire]
Ombres naturelles sous le vêtement pour le relief. Format 3:4 vertical.
```

**Résultat** : `flat_lay.jpg` (vêtement à plat, 3:4)

### 4.3 Stroller (pour niche `stroller`)

Deux variantes :
- **Stroller Domestic** : Poussette dans un appartement (salon, entrée, etc.)
- **Stroller with Dog** : Poussette + petit chien adorable dedans

Processus identique à Clothes Swap : upload + prompt + génération 120s.

### 4.4 Upscaling & Nettoyage d'images

**Étapes après génération** :

1. **Extraction base64** : L'image Gemini est en base64 ou URL HTTP → sauvegarde brute.
2. **Crop automatique en 3:4** :
   ```python
   if current_ratio > 3/4:  # Trop large
       rogne les côtés gauche/droit symétriquement
   elif current_ratio < 3/4:  # Trop haut
       rogne haut/bas symétriquement
   ```
3. **Purge métadonnées AI** (fonction `crop_black_borders`) :
   ```python
   pixel_data = np.array(img)
   sterile_img = Image.fromarray(pixel_data)
   sterile_img.save(output, "JPEG", quality=95, exif=b"", icc_profile=None)
   # 100% des métadonnées IA = PURGÉES
   ```
4. **Upscaling** (optionnel, via `chatgpt_upscaler.py`) :
   - ChatGPT Upscaler API (`real_esrgan_x2plus`)
   - OU Higgsfield Upscaler (gratuit, slowmo)
   - Améliore la résolution 2x sans artefacts
5. **Renommage** :
   ```
   selfie.jpg  → selfie_upscaled.jpg
   flat_lay.jpg  → flat_lay_upscaled.jpg
   hanger.jpg  → hanger_upscaled.jpg
   profile.jpg  → profile_upscaled.jpg
   folded.jpg  → folded_upscaled.jpg
   selfie_hand_in_hair.jpg  → selfie_hand_in_hair_upscaled.jpg
   ```

### 4.5 Recipe d'images par niche

Définie dans `niche_definitions/<niche>.json` → clé `image_recipe` :

```json
{
  "name": "garment",
  "image_recipe": ["selfie", "profile", "selfie_hand_in_hair", "flat_lay", "hanger", "folded"]
}
```

Cela veut dire : générer 6 images pour chaque vêtement. Chaque clé = une fonction dans `image_generator.py`.

---

## 5. Phase 4 : PUBLICATION (Vinted)

### 5.1 Via Playwright + Vinted Publisher

**Fichier** : `vinted_bot/vinted_publisher.py`

**Processus** :

1. **Connexion CDP** : Se connecte à l'instance Brave déjà ouverte sur `vinted.fr` (port CDP 9222).
2. **Navigation vers page d'upload** : `https://www.vinted.fr/items/new`
3. **Remplissage du formulaire** (en ordre) :
   - **Images** : Upload 6 images upscalées (selfie, profile, etc.) via `set_input_files()`
   - **Titre** : Lecture depuis `titre.txt`, paste dans l'input
   - **Description** : Lecture depuis `description.txt`, paste dans textarea
   - **Catégorie** : Clic sur l'input → attend suggestion auto → clic 1ère suggestion
   - **Marque** : Type "Vintage chic" (hardcodé pour cohérence)
   - **Couleur** : Clic 1ère couleur suggérée
   - **Prix** : Valeur par défaut `50€` (modifiable après)
   - **État** : "Neuf sans étiquette" (radio button)
   - **Taille** : Si `uses_size: true` dans la niche, sélectionne la taille (ex: "S")
   - **Format de colis** : "Petit"
4. **Soumission** (optionnel) :
   - Si `auto_submit=True` → clic le bouton "Ajouter"
   - Si `save_draft=True` → sauvegarde en brouillon
   - Sinon → formulaire reste ouvert pour validation manuelle
5. **Marqueur de succès** : Crée un fichier `published.txt` pour éviter les doublons.

**Config compte** :
- Lit depuis `vinted_bot/Accounts/<account_name>/config.yaml`
- Récupère : `brave_profile`, `cdp_port`, `niche_def`, `size`, `bot_profile` (paramètre URL)

---

### 5.2 Gestion multi-compte (Extension Chrome)

L'extension Vinteo (dossier `Vinteo Extension V2` ou `vinteo-extension`) :
- Scrape l'API Vinted native en background
- Sync les annonces (titres, prix, vues, favoris) vers `vinted-manager`
- Exécute des actions (repost, extend deadline, reactivate)
- Gère la file d'attente multi-compte

**Architecture API** :
```
GET /api/dressing?botAccountName=<name>
    ↓
BotAccount + VintedItemMetrics
    ↓
Retourne liste annonces avec titre, prix, vues, favoris, URL

POST /api/dressing/repost
    ↓
Crée actions REPOST_ITEM dans BotActionQueue
    ↓
Extension lira GET /api/extension/actions
    ↓
Exécute repostItemREST() avec options (cropPercent, newTitle, etc.)
```

---

## 6. Phase 5 : GESTION (Vinted Manager)

### Fichier architecture
`Cahier des charges Vinted Manager.md` (section 10+) détaille le full-stack.

### Routes API clés

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/dressing` | GET | Liste annonces du compte |
| `/api/dressing/accounts` | GET | Comptes bots disponibles |
| `/api/dressing/repost` | POST | Lance une série de repost |
| `/api/extension/actions` | GET | File d'attente actions |
| `/api/extension/sync/metrics` | POST | Sync ventes Vinted → DB |
| `/api/sourcing` | POST | Enregistre un article à sourcer |
| `/api/parcels` | GET/POST | Gère les colis fournisseurs |
| `/api/ventes` | GET/POST | Gère les ventes enregistrées |

### Frontend (`Next.js App Router`)

**Pages clés** :
- `/dressing` : Liste annonces, repost, crop, changement titre/prix/bio
- `/sourcing` : Enregistre articles Shein à traiter + lance pipeline scrape/analyse/génération
- `/winners` : Articles à haut potentiel (ventes rapides, marge élevée)
- `/stock` : Articles en stock, attente d'une vente

---

## 7. Pipeline complet d'automatisation

### Scénario : 1 article de 0 à publication

```
1. HUMAIN
   └─ Ouvre /sourcing sur vinted-manager
   └─ Colle URL Shein + sélectionne niche (garment)
   └─ Clique "Lancer l'analyse"

2. BACKEND → /api/sourcing (POST)
   └─ Crée entry SourcingItem (BDD)
   └─ Lance process asynchrone (Vercel Cron ou job queue)

3. SCRAPER (vinted_bot/scraper.py)
   └─ Télécharge screenshot Shein
   └─ Stocke dans outputs/garment/PRODUCT_001/

4. PROCESSOR (vinted_bot/processor.py)
   └─ Analyse screenshot via Gemini API
   └─ Retourne : titre, description, prompt anglais
   └─ Stocke dans product_dir

5. IMAGE GENERATOR (vinted_bot/image_generator.py)
   └─ Generate 6 images (selfie, flat_lay, hanger, etc.)
   └─ Chaque génération 120s via Gemini Web + Upscale
   └─ Résultat : product_dir/selfie_upscaled.jpg, etc.

6. PUBLISHER (vinted_bot/vinted_publisher.py)
   └─ Ouvre vinted.fr
   └─ Upload 6 images + titre + description
   └─ Crée l'annonce (brouillon ou directe)
   └─ Crée published.txt (marqueur succès)

7. BACKEND → /api/extension/sync/metrics (POST)
   └─ Extension détecte nouvelle annonce
   └─ Sync vers BDD : titre, prix, ID Vinted, etc.
   └─ Disponible dans /dressing pour repost/édition

8. HUMAIN (optionnel)
   └─ Page /dressing affiche annonce
   └─ Option : repost (crop 5-20% + change prix)
   └─ Option : extend deadline (via Extension)
   └─ Option : reactivate après vente
```

### Orchestration (Watcher)

**Fichier** : `vinted_bot/watcher.py` — Boucle centralisée multi-compte

```python
watcher.py --account all --publish --submit
    ↓
    ├─ Lit dossier Accounts/*/config.yaml
    ├─ Pour chaque compte : sourcing_queue.json (file d'attente produits)
    ├─ Lance scraper → processor → image_gen → publisher
    │  (tous séquentiels par compte, parallèles entre comptes)
    └─ Timers anti-détection : 3-8s entre uploads, 30-90s entre publications
```

---

## 8. Configurable par niche (niche_definitions/*.json)

### Exemple garment.json
```json
{
  "name": "garment",
  "display_name": "Vêtements & Mode",
  "default_start_url": "https://fr.shein.com/Sundress-c-1964.html",
  "keywords_include": ["dress", "shirt", "blouse"],
  "keywords_exclude": ["men", "boy"],
  "uses_size": true,
  "analysis_prompt": "Tu es une vendeuse reguliere...[PERSONA]...",
  "analysis_prompt_variables": ["PERSONA", "CONSIGNES_LANGUE", "PHRASES_TYPIQUES", "TAILLE_CIBLE"],
  "image_recipe": ["selfie", "profile", "selfie_hand_in_hair", "flat_lay", "hanger", "folded"],
  "output_images": {
    "selfie": "selfie_upscaled.jpg",
    "profile": "profile_upscaled.jpg",
    "flat_lay": "flat_lay_upscaled.jpg"
  }
}
```

### Exemple stroller.json
```json
{
  "name": "stroller",
  "display_name": "Poussettes pour Chiens",
  "default_start_url": "https://fr.shein.com/Dog-Stroller-c-2024.html",
  "uses_size": false,
  "analysis_prompt": "Tu es une vendeuse reguliere...[PERSONA]...(prompt poussette)",
  "image_recipe": ["stroller_domestic", "stroller_with_dog"],
  "output_images": {
    "stroller_domestic": "stroller_domestic_upscaled.jpg",
    "stroller_with_dog": "stroller_dog_upscaled.jpg"
  }
}
```

---

## 9. Comptes multi-profils (Accounts/)

```
vinted_bot/Accounts/
├── nina/
│   ├── config.yaml
│   │   ├── brave_profile: "Profile 3"
│   │   ├── cdp_port: 9222
│   │   ├── niche: "garment"
│   │   ├── size: "S"
│   │   ├── vinted_username: "nina_vintage"
│   │   └── avatar: "path/to/avatar.jpg"
│   ├── sourcing_queue.json
│   └── [...]
├── emma/
│   ├── config.yaml
│   └── [...]
└── alex/
    ├── config.yaml
    └── [...]
```

Chaque compte a **son propre profil Brave**, **son propre avatar**, **sa propre file d'attente**.

---

## 10. Timers anti-détection

**Dans `vinted_bot/watcher.py`** :

```python
# Entre uploads d'images
time.sleep(random.uniform(3, 8))  # 3-8s

# Entre publications d'annonces
time.sleep(random.uniform(30, 90))  # 30-90s

# Entre comptes multi
time.sleep(random.uniform(2, 5))  # 2-5s
```

Vinted détecte les bots via :
- Timing trop régulier (si tu pub 100 annonces en 5min, algo = bot)
- Pattern de prix (tous à 50€, tous au même moment)
- Pattern d'images (templates de photos identiques)

VintedBot mitigue :
- Timers aléatoires (random.uniform)
- Upscaling + purge métadonnées (images ne ressemblent pas à du généré)
- Variations de fond (pour selfie/flat_lay, backgrounds aléatoires)
- Marque "Vintage chic" (cohérente)
- Avatar/profil uniques par compte

---

## 11. Déboguer un article qui échoue

### Point de blocage 1 : Scraping
```bash
python vinted_bot/scraper.py \
  --niche garment \
  --count 1 \
  --url https://fr.shein.com/Sundress-c-1964.html
# Vérifier : outputs/garment/PRODUCT_001/screenshot_shein.png
```

### Point de blocage 2 : Analyse Gemini
```bash
python vinted_bot/processor.py outputs/garment/PRODUCT_001/screenshot_shein.png fr
# Vérifier : titre + description + prompt anglais en stdout
```

### Point de blocage 3 : Générations d'images
```bash
python vinted_bot/test_flat_lay_generation.py \
  --product-dir outputs/garment/PRODUCT_001/ \
  --template path/to/flatlay_template.jpg
# Vérifier : product_dir/flat_lay.jpg existe
```

### Point de blocage 4 : Publication
```bash
python vinted_bot/vinted_publisher.py \
  --account nina \
  --dir outputs/garment/PRODUCT_001/ \
  --draft  # Sauvegarde en brouillon au lieu de publier directement
```

---

## 12. Limites actuelles

### Bloqueurs techniquement documentés

1. **Générations d'images longues** (120s par image × 6 images = 12 min / article)
   - Mitigation : Paralléliser par compte, pas par article
   - Futur : Cache résultats Gemini, batch API quand dispo

2. **Upscaling optionnel** (qualité variable selon APIUpscaler dispo)
   - Higgsfield gratuit mais slow (30-60s)
   - ChatGPT payant ($ par image)

3. **Captchas Shein** (rare mais possible)
   - Géré par `scraper.py` (fermeture auto), mais perte d'un produit

4. **Images déterministes** (Gemini peut générer la même image 2x)
   - Prompts intègrent randomisation (backgrounds, dogs, surface)
   - Mais pas 100% garanti → considérer batch re-gen

### Limites métier

- Prix par défaut 50€ (hardcodé) → to-do : stratégie de pricing dynamique
- Marque "Vintage chic" (hardcodée) → to-do : par niche
- Format de colis "Petit" (hardcodé) → to-do : auto-détection par taille vêtement

---

## 13. Points d'intégration vinted-manager

**Backend** : DB Prisma + routes API `/api/dressing`, `/api/sourcing`, `/api/extension/sync`.
**Frontend** : Pages React `/dressing`, `/sourcing`, modales pour repost/édition.
**Extension** : Service Worker + `vinted-rest-api.js` pour exécuter repost.

**Synchronisation BDD** :
- Extension scrape API Vinted native → `/api/extension/sync/metrics` (POST)
- Stocke dans `VintedItemMetrics` (titre, prix, vues, favoris, ID Vinted)
- UI affiche dans `/dressing` pour gestion humaine

---

## 14. Résumé données clés

| Composant | Tech | Durée | Input | Output |
|---|---|---|---|---|
| **Scraper** | Playwright async | 5-20s/produit | URL Shein | screenshot_shein.png |
| **Processor** | Gemini API | 5-10s | screenshot | titre, desc, prompt |
| **Image Gen** | Gemini Web × 6 | 120s × 6 = 12min | avatar + prompt | 6 JPGs upscalés |
| **Upscaler** | ChatGPT ou Higgsfield | 5-60s/image | JPG brut | JPG 2x résolution |
| **Publisher** | Playwright CDP | 30-60s | 6 images + titre/desc | Annonce Vinted |
| **Manager** | Next.js + Prisma | — | Actions UI | Repost, edit, reactivate |

---

## Annexe : Arborescence fichiers clés

```
VintedBot/
├── vinted_bot/
│   ├── scraper.py              # Scrape Shein
│   ├── processor.py            # Analyse Gemini API
│   ├── image_generator.py      # Génère images (selfie, flat_lay, etc.)
│   ├── chatgpt_upscaler.py     # Upscale images
│   ├── vinted_publisher.py     # Publie sur Vinted
│   ├── watcher.py              # Orchestre tout
│   ├── edge_browser.py         # Gère session Edge CDP
│   ├── config_manager.py       # Lit Accounts/*/config.yaml
│   ├── niche_loader.py         # Charge niche_definitions/*.json
│   ├── Accounts/
│   │   ├── nina/config.yaml
│   │   ├── emma/config.yaml
│   │   └── [...]
│   ├── niche_definitions/
│   │   ├── garment.json
│   │   ├── stroller.json
│   │   ├── tech.json
│   │   └── deco.json
│   ├── outputs/                # Produits scrapiés + analysés + générés
│   │   └── garment/
│   │       └── PRODUCT_001/
│   │           ├── screenshot_shein.png
│   │           ├── titre.txt
│   │           ├── description.txt
│   │           ├── selfie_upscaled.jpg
│   │           ├── flat_lay_upscaled.jpg
│   │           └── [...]
│   └── [tests, utils, etc.]
│
├── vinted-manager/              # App Next.js (DB + API + UI)
│   ├── src/app/
│   │   ├── api/dressing/       # Routes pour gestion annonces
│   │   ├── api/sourcing/       # Routes pour scraping + analyse
│   │   ├── dressing/           # Page gestion annonces
│   │   ├── sourcing/           # Page sourcing
│   │   └── [...]
│   ├── prisma/
│   │   └── schema.prisma       # Modèles DB
│   └── [config, components, etc.]
│
├── Vinteo Extension V2/        # Extension Chrome (repost + sync)
│   ├── background/
│   │   ├── service-worker.js
│   │   ├── sale-watcher.js
│   │   └── [...]
│   ├── content/
│   │   ├── vinted-api.js
│   │   └── [...]
│   └── manifest.json
│
└── [docs, configs]
```

---

**Dernier update** : Document rédigé en parallèle avec l'architecture réelle (v1.0 complète).
