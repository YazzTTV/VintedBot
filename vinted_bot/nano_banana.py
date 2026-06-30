"""
nano_banana.py — Generation d'images produit via l'API Nano Banana (Gemini Flash Image).

Remplace l'ancien pipeline qui ouvrait Edge et pilotait ChatGPT/Gemini Web
(chatgpt_upscaler.py / image_generator.py). Ici tout passe par l'API officielle
google-genai : plus rapide (~5-10s/image au lieu de ~300s), plus fiable, sans
navigateur a maintenir.

Principe cle de Nano Banana : on passe PLUSIEURS images de reference directement
dans la liste `contents` d'un seul appel. Le modele garde la coherence du sujet
entre les images. On nomme chaque image dans le prompt ("image 1 = ..., image 2 = ...").

Cas d'usage selfie (clothes swap) :
    contents = [prompt, mannequin_front, mannequin_back, produit_avant]
    -> "image 1 et 2 = le meme mannequin (face/dos), image 3 = un vetement.
        Genere ce mannequin portant ce vetement..."

Contrat d'integration : `generate_all_images_parallel_async(...)` a EXACTEMENT
la meme signature et le meme dict de retour que la version chatgpt_upscaler, pour
etre un drop-in. watcher.py n'a qu'a changer sa ligne d'import.
"""

import os
import base64
import random
import asyncio

from PIL import Image
from dotenv import load_dotenv

from config_manager import pick_random_mannequin

# humanize_image ré-injecte des EXIF de smartphone réalistes après purge des
# métadonnées AI. Import défensif : si le module a une dépendance manquante,
# on continue sans (la purge numpy reste appliquée).
try:
    from humanizer import humanize_image
except Exception:  # pragma: no cover
    humanize_image = None

load_dotenv()

# Nano Banana 2 = gemini-3.1-flash-image. Surchargeable via .env si besoin.
NANO_MODEL = os.getenv("NANO_BANANA_MODEL", "gemini-3.1-flash-image")

# Nombre d'appels API simultanés (rate limit). Surchargeable via .env.
MAX_CONCURRENCY = int(os.getenv("NANO_BANANA_CONCURRENCY", "4"))

# Nombre de tentatives par image en cas d'echec API / reponse sans image.
MAX_RETRIES = 3


# ---------------------------------------------------------------------------
# Post-traitement image (copie autonome — aucune dependance navigateur)
# ---------------------------------------------------------------------------

def crop_to_3_4(image_path: str, output_path: str) -> bool:
    """
    Force un format portrait 3:4 parfait (le format roi pour Vinted) et purge
    100% des metadonnees AI en reconstruisant l'image depuis sa matrice de pixels.
    Equivalent autonome de image_generator.crop_black_borders, sans la passe de
    rognage de bordures noires (inutile : l'API ne renvoie pas de bandeau).
    """
    try:
        import numpy as np

        img = Image.open(image_path)
        if img.mode != "RGB":
            img = img.convert("RGB")

        width, height = img.size
        target_ratio = 3 / 4  # largeur / hauteur
        current_ratio = width / height

        if current_ratio > target_ratio:
            # Trop large : rogner les cotes symetriquement
            new_width = int(height * target_ratio)
            left = (width - new_width) // 2
            img = img.crop((left, 0, left + new_width, height))
        elif current_ratio < target_ratio:
            # Trop haute : rogner haut/bas symetriquement
            new_height = int(width / target_ratio)
            top = (height - new_height) // 2
            img = img.crop((0, top, width, top + new_height))

        # Purge atomique des metadonnees : matrice pure -> image vierge
        pixel_data = np.array(img)
        sterile_img = Image.fromarray(pixel_data)
        sterile_img.save(output_path, "JPEG", quality=95, optimize=True, exif=b"", icc_profile=None)
        return True
    except Exception as e:
        print(f"[NanoBanana] Erreur recadrage 3:4 : {e}")
        return False


def humanize_metadata(image_path: str) -> None:
    """Re-injecte des EXIF smartphone realistes pour passer sous les radars Vinted."""
    if humanize_image is None:
        return
    try:
        humanize_image(image_path, image_path, apply_transform=False)
    except Exception as e:
        print(f"[NanoBanana] Note humanize : {e}")


# ---------------------------------------------------------------------------
# Appel API coeur
# ---------------------------------------------------------------------------

def _extract_response_text(response):
    """Recupere le texte renvoye par le modele (utile quand aucune image n'est generee)."""
    parts = getattr(response, "parts", None)
    if not parts:
        try:
            parts = response.candidates[0].content.parts
        except Exception:
            parts = []
    texts = []
    for part in parts or []:
        t = getattr(part, "text", None)
        if t:
            texts.append(t)
    return " ".join(texts).strip()


def _extract_image_bytes(response):
    """Extrait les octets de la premiere image trouvee dans la reponse Gemini."""
    # Voie 1 : raccourci response.parts (selon version SDK)
    parts = getattr(response, "parts", None)
    # Voie 2 : descente explicite dans les candidates
    if not parts:
        try:
            parts = response.candidates[0].content.parts
        except Exception:
            parts = []

    for part in parts or []:
        inline = getattr(part, "inline_data", None)
        data = getattr(inline, "data", None) if inline else None
        if data:
            if isinstance(data, str):
                return base64.b64decode(data)
            return data
    return None


async def _nano_generate(client, prompt: str, input_paths: list, output_path: str,
                         semaphore: asyncio.Semaphore, label: str,
                         postprocess: bool = True, max_retries: int = None) -> bool:
    """
    Genere une image via Nano Banana, la sauvegarde, force le 3:4 et humanise les EXIF.
    postprocess=False saute le crop/humanize (pour les rendus intermediaires qui
    repassent dans une autre generation).
    max_retries surcharge MAX_RETRIES (utile pour un 1er essai court avant fallback).
    Retourne True si l'image a ete ecrite, False sinon.
    """
    from google.genai import types

    # Charger les images d'entree (en ignorant les chemins manquants)
    images = []
    for p in input_paths:
        if p and os.path.exists(p):
            try:
                images.append(Image.open(p))
            except Exception as e:
                print(f"[NanoBanana:{label}] Image illisible ignoree ({p}) : {e}")

    contents = [prompt] + images

    # Config minimale et robuste : on demande TEXT+IMAGE. Le format 3:4 est
    # garanti mathematiquement par crop_to_3_4 (pas besoin de le forcer cote API).
    config = types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"])

    retries = max_retries if max_retries is not None else MAX_RETRIES
    for attempt in range(1, retries + 1):
        try:
            async with semaphore:
                print(f"[NanoBanana:{label}] Generation (essai {attempt}/{MAX_RETRIES})...")
                response = await client.aio.models.generate_content(
                    model=NANO_MODEL,
                    contents=contents,
                    config=config,
                )

            img_bytes = _extract_image_bytes(response)
            if not img_bytes:
                txt = _extract_response_text(response)
                detail = f" Texte modele: {txt[:300]}" if txt else " (aucun texte non plus)"
                print(f"[NanoBanana:{label}] [WARN] Reponse sans image.{detail}")
                continue

            with open(output_path, "wb") as f:
                f.write(img_bytes)

            if postprocess:
                crop_to_3_4(output_path, output_path)
                humanize_metadata(output_path)
            print(f"[NanoBanana:{label}] [OK] Image sauvegardee : {os.path.basename(output_path)}")
            return True

        except Exception as e:
            print(f"[NanoBanana:{label}] Erreur API (essai {attempt}) : {e}")
            await asyncio.sleep(2 * attempt)  # backoff lineaire

    print(f"[NanoBanana:{label}] [ERROR] Echec apres {retries} tentatives.")
    return False


# ---------------------------------------------------------------------------
# Banques de variations (anti-detection : pose / decor varies)
# ---------------------------------------------------------------------------

BACKGROUNDS = [
    "dans une chambre lumineuse avec un lit fait, un mur blanc et une plante verte en arriere-plan",
    "dans un dressing moderne et chic avec des vetements suspendus de maniere ordonnee",
    "dans une salle de bain epuree avec un miroir propre et un carrelage blanc contemporain",
    "dans un salon chaleureux et lumineux avec un canape creme et un tableau abstrait au mur",
    "dans un interieur minimaliste de style scandinave avec un meuble en bois clair",
    "dans un appartement parisien avec des moulures blanches au mur et du parquet",
    "dans une piece aux murs de ton neutre (beige ou gris clair) avec lumiere naturelle de fenetre",
]

SURFACES = [
    "un sol en parquet de chene clair aux veines de bois naturelles",
    "un sol en parquet fonce de style vintage a la texture marquee",
    "un tapis en laine beige epais et texture",
    "un tapis blanc moelleux en fausse fourrure",
    "un dessus de lit en lin blanc legerement froisse, style scandinave",
    "un sol en beton cire gris clair moderne et minimaliste",
]

DOGS = [
    "un adorable petit spitz nain (Pomeranian) tout poilu et souriant",
    "un mignon petit carlin (Pug) aux grands yeux expressifs",
    "un adorable chiot golden retriever tres doux",
    "un tres mignon petit bouledogue francais aux oreilles dressees",
    "un petit chihuahua joyeux et mignon",
]

DOG_BACKGROUNDS = [
    "dans le coin d'un salon moderne et chaleureux",
    "dans l'entree propre d'un appartement, a cote d'une plante verte",
    "pres d'une grande baie vitree lumineuse avec du parquet au sol",
    "dans une piece de vie scandinave lumineuse",
]

# Variations LEGERES de la main/bras LIBRE (celle qui ne tient pas le telephone),
# tirees au hasard pour que la 1ere image (selfie) ne soit pas toujours identique.
HAND_VARIATIONS = [
    "laisse le bras libre detendu le long du corps",
    "pose legerement la main libre sur la hanche",
    "passe doucement la main libre dans les cheveux",
    "laisse la main libre effleurer le bas de la robe",
    "replie un peu le bras libre, main pres de la taille",
    "laisse la main libre reposer naturellement sur la cuisse",
]


def _is_mannequin(account_dir: str) -> bool:
    """Detecte si le compte utilise un buste de couture (settings prompt_style == 'mannequin')."""
    try:
        import json
        with open(os.path.join(account_dir, "settings.json"), "r", encoding="utf-8") as f:
            return json.load(f).get("prompt_style") == "mannequin"
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Taches de generation par type d'image
# ---------------------------------------------------------------------------

def build_selfie_prompt(prompt_anglais: str) -> str:
    """
    Prompt de try-on style Vinteo : on regenere une photo plein pied de la femme
    portant le vetement, visage cache par le telephone, en chaussettes blanches.
    Prompt court et affirmatif (en anglais) — c'est ce qui donne le meilleur rendu
    et le plus fidele avec Nano Banana, plutot qu'une edition stricte sur-contrainte.
    Le cadrage plein pied rend toute la piece visible et evite le bas coupe / le
    pantalon d'origine qui depassait.
    """
    import random
    hand = random.choice(HAND_VARIATIONS)
    return (
        f"Mets la robe de l'image 2 a la fille de l'image 1 ({prompt_anglais}). "
        "Garde l'image 1 quasiment telle quelle : exactement le meme decor, la meme piece, "
        "le meme visage cache par le telephone, les memes cheveux, le meme cadrage et le meme eclairage. "
        f"Tu peux LEGEREMENT varier UNIQUEMENT la position du bras/de la main libre (celle qui ne tient "
        f"pas le telephone) : {hand}. IMPORTANT : si tu repositionnes ce bras libre, DEPLACE le bras qui "
        f"existe deja - n'en ajoute JAMAIS un nouveau, et efface completement son ancienne position (aucun "
        f"bras fantome ne doit rester le long du corps). La fille a EXACTEMENT deux bras et deux mains : "
        f"un bras tient le telephone, l'autre est le bras libre. Aucun bras, coude, avant-bras ou main "
        f"supplementaire ne doit apparaitre. Ne change rien d'autre a la pose. "
        "Ne change que la tenue et cette main libre. "
        "La robe doit etre identique a celle de l'image 2 : meme couleur, meme col, memes manches, "
        "meme taille, memes volants, meme longueur et meme coupe. Ne la redessine pas. "
        "La fille ne porte que cette robe : sous l'ourlet, ses jambes sont nues, aucun pantalon, "
        "jean ni tissu blanc visible."
    )


def _crop_product_head(product_path: str, pct: float = 0.12):
    """
    Cree une copie temporaire de la photo produit rognee du haut (~12%) pour retirer
    le visage du mannequin. Un visage frontal proeminent dans la photo produit
    declenche un blocage IMAGE_OTHER lors du try-on (filtre type manipulation de
    visage). Le crop ne touche pas a la robe (juste la tete au-dessus des epaules).
    Retourne le chemin temporaire, ou None.
    """
    try:
        img = Image.open(product_path).convert("RGB")
        w, h = img.size
        tmp = product_path + ".nohead.jpg"
        img.crop((0, int(h * pct), w, h)).save(tmp, "JPEG", quality=95)
        return tmp
    except Exception as e:
        print(f"[NanoBanana:selfie] Crop tete impossible : {e}")
        return None


def _mask_product_face(product_path: str):
    """
    Detecte le(s) visage(s) dans la photo produit et les recouvre d'un rectangle
    neutre, SANS toucher au vetement (on garde l'encolure intacte). Un visage humain
    frontal dans la photo produit declenche un blocage IMAGE_OTHER au try-on ; on ne
    se sert pas de ce visage, donc on l'efface. Le rectangle est large en haut/cotes
    (front, cheveux) mais court en bas pour ne pas mordre sur le col de la robe.
    Retourne un chemin temporaire, ou None si aucun visage detecte / echec.
    """
    try:
        import cv2
        img = cv2.imread(product_path)
        if img is None:
            return None
        h_img, w_img = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
        if len(faces) == 0:
            return None
        for (x, y, w, h) in faces:
            x0 = max(0, x - int(w * 0.25))
            y0 = max(0, y - int(h * 0.45))           # large vers le haut (front + cheveux)
            x1 = min(w_img, x + w + int(w * 0.25))
            y1 = min(h_img, y + h + int(h * 0.10))   # court vers le bas (preserve le col)
            img[y0:y1, x0:x1] = (190, 190, 190)
        tmp = product_path + ".noface.jpg"
        cv2.imwrite(tmp, img)
        return tmp
    except Exception as e:
        print(f"[NanoBanana:selfie] Masquage visage impossible : {e}")
        return None


# Modele de controle qualite (vision) : meme famille que l'analyse produit (processor.py).
QA_MODEL = os.getenv("ANATOMY_QA_MODEL", "gemini-3.1-flash-lite")


async def _passes_anatomy_qa(client, image_path, semaphore, label="selfie"):
    """Controle qualite anatomique de l'image generee via Gemini vision.

    Retourne (ok: bool, reason: str). Le pipeline ne contrôlait QUE les échecs API ;
    une image anatomiquement fausse mais techniquement valide passait (3e bras, deux
    bras du meme cote...). Ici on demande a un modele vision de juger.
    Fail-open (True) si l'appel/parse echoue : on ne bloque jamais la production si le
    verificateur lui-meme tombe (quota, reseau)."""
    prompt = (
        "Tu es un controleur qualite e-commerce. Observe la personne sur la photo et verifie son "
        "anatomie. Reponds UNIQUEMENT par un JSON compact : {\"ok\": true|false, \"reason\": \"...\"}. "
        "Mets ok=false si tu vois l'un de ces defauts : plus de deux bras ; un bras, avant-bras ou main "
        "en trop ou fantome ; les DEUX bras du meme cote du corps (un cote sans bras) ; un membre fusionne "
        "ou deforme ; une main au nombre de doigts anormal. Mets ok=true seulement si la personne a "
        "EXACTEMENT deux bras (un de chaque cote) et une anatomie plausible. Sois strict sur bras et mains."
    )
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"[NanoBanana:{label}] [QA] image illisible ({e}) -> QA ignore.")
        return True, "image illisible"
    try:
        async with semaphore:
            resp = await client.aio.models.generate_content(model=QA_MODEL, contents=[prompt, img])
        raw = (_extract_response_text(resp) or "").strip().strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
        import json, re
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
        return bool(data.get("ok", True)), str(data.get("reason", ""))[:200]
    except Exception as e:
        print(f"[NanoBanana:{label}] [QA] echec verification ({e}) -> QA ignore (fail-open).")
        return True, "qa error"


async def _generate_selfie_candidate(client, front, product_path, output_path, semaphore, prompt):
    """Produit UN candidat selfie (essai court image entiere, puis fallback visage masque).
    Retourne True si une image a ete ecrite dans output_path."""
    # 1er essai COURT (1 tentative) sur l'image entiere : si le produit n'a pas de
    # visage genant, ca passe direct. Sinon on ne gaspille qu'un appel avant le masque.
    if await _nano_generate(client, prompt, [front, product_path], output_path, semaphore,
                            "selfie", max_retries=1):
        return True
    # Fallback : masquer le visage du produit (garde toute la robe) ; sinon rogner la tete.
    fallback = _mask_product_face(product_path) or _crop_product_head(product_path)
    if not fallback:
        return False
    print("[NanoBanana:selfie] Retry avec le visage du produit masque...")
    try:
        return await _nano_generate(client, prompt, [front, fallback], output_path, semaphore, "selfie")
    finally:
        try:
            os.remove(fallback)
        except OSError:
            pass


async def task_selfie(client, product_path, avatar_path, output_path, prompt_anglais, semaphore):
    """
    Try-on : reprend un selfie de base (tire au hasard dans le pool du compte) et
    remplace seulement la tenue par le vetement du produit. Le selfie de base sert
    de canevas : decor, pose et visage cache sont preserves tels quels. On ne touche
    JAMAIS au mannequin de base — seule la photo produit (reference robe) peut etre
    retouchee pour passer le filtre.

    Robustesse : si la photo produit entiere bloque (IMAGE_OTHER, souvent a cause
    d'un visage de mannequin frontal), on retente avec le visage du produit masque
    (vetement et encolure intacts). En dernier recours, rognage de la tete.
    """
    account_dir = os.path.dirname(avatar_path)
    front, _back = pick_random_mannequin(account_dir)
    if not front:
        print("[NanoBanana:selfie] [ERROR] Aucun selfie de base disponible.")
        return False

    # Boucle QA anatomie : on (re)genere puis on fait VALIDER l'image par un modele
    # vision ; tant que l'anatomie est mauvaise (3e bras, deux bras du meme cote...),
    # on re-tire (build_selfie_prompt re-tire la pose du bras libre a chaque essai).
    tries = int(os.getenv("SELFIE_ANATOMY_TRIES", "4"))
    wrote = False
    for qa_try in range(1, tries + 1):
        prompt = build_selfie_prompt(prompt_anglais)
        wrote = await _generate_selfie_candidate(client, front, product_path, output_path, semaphore, prompt)
        if not wrote:
            return False  # echec de generation (API) : deja retente en interne
        ok, reason = await _passes_anatomy_qa(client, output_path, semaphore)
        if ok:
            print(f"[NanoBanana:selfie] [QA] anatomie validee (essai {qa_try}/{tries}).")
            return True
        print(f"[NanoBanana:selfie] [QA] anatomie rejetee (essai {qa_try}/{tries}) : {reason} -> nouveau tirage.")
    print(f"[NanoBanana:selfie] [QA] [WARN] anatomie NON validee apres {tries} essais — "
          f"image conservee, a verifier manuellement.")
    return wrote


# NOTE IMPORTANTE : flat_lay / folded / hanger sourcent depuis le SELFIE genere
# (render propre du vetement), PAS depuis la photo produit commerciale. Demander a
# Nano Banana d'isoler un vetement a partir d'une photo commerciale filigranee
# declenche un blocage IMAGE_OTHER (filtre type droits d'auteur). Depuis le selfie
# (photo "perso" sans filigrane), l'extraction passe et la qualite est excellente.

# Prompts volontairement EPURES et concrets. Les formulations lourdes ("conserve
# fidelement la coupe/couleur/matiere", "ultra realiste 90 degres", etc.) declenchent
# un blocage IMAGE_OTHER (filtre type reproduction). Court + concret = fiable (teste 3/3).

async def task_flat_lay(client, source_path, output_path, prompt_anglais, semaphore):
    surface = random.choice(SURFACES)
    prompt = (
        f"L'image montre un vetement porte par une personne ({prompt_anglais}).\n"
        f"Genere une photo flat lay (vue du dessus) de ce meme vetement pose a plat sur {surface}, "
        f"sans personne. Format vertical 3:4."
    )
    return await _nano_generate(client, prompt, [source_path], output_path, semaphore, "flat_lay")


async def task_folded(client, source_path, output_path, prompt_anglais, semaphore):
    surface = random.choice(SURFACES)
    prompt = (
        f"L'image montre un vetement porte par une personne ({prompt_anglais}).\n"
        f"Genere une photo de ce meme vetement proprement plie (facon boutique), pose sur {surface}, "
        f"sans personne, vue du dessus. Format vertical 3:4."
    )
    return await _nano_generate(client, prompt, [source_path], output_path, semaphore, "folded")


async def task_hanger(client, source_path, hanger_template_path, output_path, prompt_anglais, semaphore):
    has_tpl = hanger_template_path and os.path.exists(hanger_template_path)
    if has_tpl:
        # Pipeline 2 ETAPES obligatoire : envoyer le template + une photo contenant une
        # PERSONNE declenche un blocage IMAGE_OTHER (constate de facon systematique sur
        # certaines robes). On genere donc d'abord un rendu intermediaire du vetement
        # seul sur cintre (single-image, passe toujours), puis on compose ce rendu sans
        # personne avec le template (passe toujours aussi).
        intermediate = output_path + ".intermediate.png"
        prompt_step1 = (
            f"L'image montre un vetement porte par une personne ({prompt_anglais}).\n"
            "Genere une photo de ce meme vetement pose sur un cintre, sans personne. "
            "Le vetement ne porte aucune etiquette, aucune etiquette de col, aucune marque, "
            "aucun logo ni aucun texte visible. Format vertical 3:4."
        )
        ok = await _nano_generate(client, prompt_step1, [source_path], intermediate,
                                  semaphore, "hanger_step1", postprocess=False)
        if not ok:
            return False
        try:
            inputs = [hanger_template_path, intermediate]
            prompt = (
                f"Remplace uniquement le vetement de l'image 1 par la robe de l'image 2 "
                f"({prompt_anglais}). Le cintre de l'image 1 (sa forme, sa couleur, sa matiere) "
                "et le fond de l'image 1 restent exactement les memes. La robe doit etre identique "
                "a celle de l'image 2. La robe ne porte aucune etiquette, aucune etiquette de col, "
                "aucune marque, aucun logo ni aucun texte visible."
            )
            return await _nano_generate(client, prompt, inputs, output_path, semaphore, "hanger")
        finally:
            try:
                os.remove(intermediate)
            except OSError:
                pass
    else:
        inputs = [source_path]
        prompt = (
            f"L'image montre un vetement porte par une personne ({prompt_anglais}).\n"
            "Genere une photo de ce meme vetement pose sur un cintre, sans personne. "
            "Le vetement ne porte aucune etiquette, aucune etiquette de col, aucune marque, "
            "aucun logo ni aucun texte visible. Format vertical 3:4."
        )
    return await _nano_generate(client, prompt, inputs, output_path, semaphore, "hanger")


async def task_profile(client, selfie_path, output_path, semaphore):
    """Vue de profil (cote), derivee du selfie de face genere (meme sujet/tenue/decor).
    Boucle QA anatomie : re-tire si bras anormaux (meme controle que le selfie)."""
    prompt = (
        "Fais une version de cette image sous forme de selfie dans le miroir ou le modele se montre "
        "plus de profil (vue de cote), sans qu'on voie le dos. Garde exactement la meme personne, les "
        "memes cheveux, la meme tenue (la meme robe), le meme telephone et le meme arriere-plan de la "
        "piece."
    )
    tries = int(os.getenv("PROFILE_ANATOMY_TRIES", os.getenv("SELFIE_ANATOMY_TRIES", "4")))
    wrote = False
    for qa_try in range(1, tries + 1):
        wrote = await _nano_generate(client, prompt, [selfie_path], output_path, semaphore, "profile")
        if not wrote:
            return False
        ok, reason = await _passes_anatomy_qa(client, output_path, semaphore, label="profile")
        if ok:
            print(f"[NanoBanana:profile] [QA] anatomie validee (essai {qa_try}/{tries}).")
            return True
        print(f"[NanoBanana:profile] [QA] anatomie rejetee (essai {qa_try}/{tries}) : {reason} -> nouveau tirage.")
    print(f"[NanoBanana:profile] [QA] [WARN] anatomie NON validee apres {tries} essais — "
          f"image conservee, a verifier manuellement.")
    return wrote


async def task_selfie_hand_in_hair(client, selfie_path, output_path, semaphore):
    """Selfie main dans les cheveux, derive du selfie genere."""
    prompt = (
        "A partir de cette image (selfie dans le miroir), genere une variante ou le sujet garde son "
        "telephone d'une main mais passe l'autre main dans ses cheveux. Garde exactement la meme "
        "personne, le meme visage, la meme tenue, le meme telephone et le meme arriere-plan. "
        "Pose naturelle et spontanee. Aucun texte ni filigrane. Format vertical portrait 3:4."
    )
    return await _nano_generate(client, prompt, [selfie_path], output_path, semaphore, "selfie_hair")


async def task_stroller_domestic(client, product_path, output_path, prompt_anglais, semaphore):
    bg = random.choice([
        "dans le coin d'un salon moderne et lumineux, a cote d'une plante verte et d'un canape beige clair, parquet au sol",
        "dans l'entree accueillante d'une maison contemporaine, paillasson propre, murs de tons neutres",
        "dans un couloir chic bien eclaire, pres d'un mur blanc casse et d'une porte d'entree",
        "dans une piece de vie scandinave, lumiere naturelle d'une grande fenetre",
        "dans une chambre bien ordonnee, posee sur un parquet de chene clair",
    ])
    prompt = (
        f"L'image montre une poussette ({prompt_anglais}).\n"
        f"Genere une seule photo ultra realiste de style amateur prise au smartphone par son "
        f"proprietaire. Place la poussette {bg}.\n"
        "Ombres naturelles sous les roues. Aucun etre humain, aucune marque commerciale visible. "
        "Format vertical portrait 3:4, parfaitement centre."
    )
    return await _nano_generate(client, prompt, [product_path], output_path, semaphore, "stroller_domestic")


async def task_stroller_with_dog(client, product_path, output_path, prompt_anglais, semaphore):
    dog = random.choice(DOGS)
    bg = random.choice(DOG_BACKGROUNDS)
    prompt = (
        f"L'image montre une poussette ({prompt_anglais}).\n"
        f"Genere une seule photo ultra realiste de style amateur (smartphone) {bg}.\n"
        f"Ajoute {dog} confortablement assis a l'interieur de la nacelle, calme et heureux, regardant "
        f"la camera.\n"
        "Aucun etre humain visible. Format vertical portrait 3:4, parfaitement centre."
    )
    return await _nano_generate(client, prompt, [product_path], output_path, semaphore, "stroller_with_dog")


# ---------------------------------------------------------------------------
# Helpers de mapping recette -> tache
# ---------------------------------------------------------------------------

# Taches derivees du selfie : elles prennent le selfie genere comme source.
# flat_lay/folded/hanger en font partie pour eviter le blocage IMAGE_OTHER
# (cf. note au-dessus de task_flat_lay).
SELFIE_DEPENDENT = {"profile", "selfie_hand_in_hair", "flat_lay", "folded", "hanger"}


def _canonical_result_key(recipe_key: str, output_map: dict):
    """Cle canonique legacy (ex: 'selfie_upscaled') a partir d'une cle de recette."""
    out_filename = output_map.get(recipe_key, "")
    base = os.path.splitext(out_filename)[0] if out_filename else ""
    return base if base else None


async def _run_recipe_key(client, key, out_path, ctx, semaphore):
    """Dispatch des cles de batch 1 (sourcees produit/mannequin, pas le selfie)."""
    fp = ctx["product_path"]
    if key == "selfie":
        ok = await task_selfie(client, fp, ctx["avatar_path"], out_path, ctx["prompt"], semaphore)
    elif key == "stroller_domestic":
        ok = await task_stroller_domestic(client, fp, out_path, ctx["prompt"], semaphore)
    elif key == "stroller_with_dog":
        ok = await task_stroller_with_dog(client, fp, out_path, ctx["prompt"], semaphore)
    elif key == "product_on_surface":
        # Generique deco/tech : flat_lay source directement depuis la photo produit
        # (objets non filigranes : pas de blocage IMAGE_OTHER attendu).
        ok = await task_flat_lay(client, fp, out_path, ctx["prompt"], semaphore)
    elif key == "product_in_context":
        ok = await task_folded(client, fp, out_path, ctx["prompt"], semaphore)
    else:
        print(f"[NanoBanana] [WARN] Cle de recette inconnue : '{key}' — ignoree.")
        ok = False
    return key, out_path, ok


# ---------------------------------------------------------------------------
# Orchestrateur — DROP-IN de chatgpt_upscaler.generate_all_images_parallel_async
# ---------------------------------------------------------------------------

async def generate_all_images_parallel_async(
    niche: str,
    file_path: str,
    avatar_path: str,
    floor_template_path: str,
    hanger_template_path: str,
    product_dir: str,
    prompt: str,
    niche_def=None,
    hidden: bool = False,  # ignore (aucun navigateur) — garde pour compat signature
) -> dict:
    """
    Genere toutes les images d'un produit via l'API Nano Banana, en parallele.

    Signature et dict de retour identiques a la version chatgpt_upscaler : c'est un
    drop-in. `hidden` est ignore (plus de navigateur).

    Pilote par niche_def.image_recipe quand fourni, sinon fallback legacy
    (garment vs stroller). Les cles 'profile' et 'selfie_hand_in_hair' dependent
    du resultat 'selfie' et tournent dans un second batch.
    """
    from google import genai

    print(f"\n[NanoBanana] Demarrage du pipeline API (Niche : {niche.upper()}, modele : {NANO_MODEL})...")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[NanoBanana] [ERROR] GEMINI_API_KEY introuvable dans .env.")
        return {}

    client = genai.Client(api_key=api_key)
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

    ctx = {
        "product_path": file_path,
        "avatar_path": avatar_path,
        "floor_template_path": floor_template_path,
        "hanger_template_path": hanger_template_path,
        "prompt": prompt,
    }

    # Initialiser le dict de resultats (cles legacy + cles de la def)
    legacy_keys = (
        "selfie_upscaled", "flat_lay_upscaled", "profile_upscaled",
        "hanger_upscaled", "folded_upscaled", "selfie_hand_in_hair_upscaled",
    )
    if niche_def is not None:
        results = {v: None for v in niche_def.output_images.values()}
        for k in legacy_keys:
            results.setdefault(k, None)
        recipe = niche_def.image_recipe
        output_map = niche_def.output_images
    else:
        results = {k: None for k in legacy_keys}
        recipe = None
        output_map = {}

    # --- Construire la recette effective ---
    if recipe is None:
        # Fallback legacy : recette hardcodee selon la niche
        if niche == "stroller":
            recipe = ["stroller_domestic", "stroller_with_dog"]
            output_map = {
                "stroller_domestic": "selfie_upscaled.jpg",
                "stroller_with_dog": "flat_lay_upscaled.jpg",
            }
        else:
            recipe = ["selfie", "flat_lay", "hanger", "profile", "folded", "selfie_hand_in_hair"]
            output_map = {k: f"{k}_upscaled.jpg" for k in recipe}

    batch1_keys = [k for k in recipe if k not in SELFIE_DEPENDENT]
    batch2_keys = [k for k in recipe if k in SELFIE_DEPENDENT]

    def _assign(key, out_path):
        results[output_map.get(key, f"{key}_upscaled.jpg")] = out_path
        canonical = _canonical_result_key(key, output_map)
        if canonical:
            results[canonical] = out_path

    try:
        # --- Batch 1 : tout sauf les taches dependantes du selfie ---
        print(f"[NanoBanana] Batch 1 : {batch1_keys}")
        batch1 = await asyncio.gather(*[
            _run_recipe_key(
                client, k, os.path.join(product_dir, output_map.get(k, f"{k}_upscaled.jpg")), ctx, semaphore
            )
            for k in batch1_keys
        ])

        selfie_path = None
        selfie_ok = False
        for key, out_path, ok in batch1:
            if ok:
                _assign(key, out_path)
            if key == "selfie":
                selfie_path, selfie_ok = out_path, ok

        # --- Batch 2 : taches dependantes du selfie ---
        if batch2_keys:
            print(f"[NanoBanana] Batch 2 (dependant selfie) : {batch2_keys}")
            if not selfie_ok or not selfie_path:
                print("[NanoBanana] [WARN] Selfie absent — taches dependantes ignorees.")
            else:
                async def _run_dependent(key):
                    out_path = os.path.join(product_dir, output_map.get(key, f"{key}_upscaled.jpg"))
                    if key == "profile":
                        ok = await task_profile(client, selfie_path, out_path, semaphore)
                    elif key == "selfie_hand_in_hair":
                        ok = await task_selfie_hand_in_hair(client, selfie_path, out_path, semaphore)
                    elif key == "flat_lay":
                        ok = await task_flat_lay(client, selfie_path, out_path, ctx["prompt"], semaphore)
                    elif key == "folded":
                        ok = await task_folded(client, selfie_path, out_path, ctx["prompt"], semaphore)
                    elif key == "hanger":
                        ok = await task_hanger(client, selfie_path, ctx["hanger_template_path"], out_path, ctx["prompt"], semaphore)
                    else:
                        ok = False
                    return key, out_path, ok

                batch2 = await asyncio.gather(*[_run_dependent(k) for k in batch2_keys])
                for key, out_path, ok in batch2:
                    if ok:
                        _assign(key, out_path)

        print("[NanoBanana] Fin du pipeline API.")
        return results

    except Exception as e:
        print(f"[NanoBanana] Erreur critique de l'orchestrateur : {e}")
        return results


if __name__ == "__main__":
    # Test rapide d'une seule generation selfie.
    # Usage : python nano_banana.py <produit.jpg> <mannequin_front.jpg> [mannequin_back.jpg]
    import sys

    if len(sys.argv) < 3:
        print("Usage : python nano_banana.py <produit.jpg> <mannequin_front.jpg> [mannequin_back.jpg]")
        sys.exit(1)

    product = sys.argv[1]
    front = sys.argv[2]
    back = sys.argv[3] if len(sys.argv) > 3 else None

    async def _test():
        from google import genai
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        sem = asyncio.Semaphore(1)
        # Try-on strict : selfie de base (front) comme canevas + produit. Le 'back'
        # eventuel n'est pas combine ici (il sert a une vue de dos separee).
        prompt = build_selfie_prompt("the garment shown in image 2")
        ok = await _nano_generate(client, prompt, [front, product], "test_nano_selfie.jpg", sem, "test")
        print("Resultat :", "OK -> test_nano_selfie.jpg" if ok else "ECHEC")

    asyncio.run(_test())
