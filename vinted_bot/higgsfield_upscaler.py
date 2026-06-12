import os
import random
import asyncio
import json
import subprocess
import urllib.request
from PIL import Image
from humanizer import humanize_image
from image_generator import crop_black_borders

def strip_metadata(image_path: str):
    """
    PURGE NUCLÉAIRE ENRICHIE : Extrait la matrice pure via Numpy pour détruire toute signature AI,
    puis ré-injecte des métadonnées EXIF de smartphone réalistes (Apple iPhone, iOS)
    afin de passer totalement inaperçu sous les radars de Vinted.
    """
    import numpy as np
    try:
        if not os.path.exists(image_path):
            return False
            
        with Image.open(image_path) as img:
            rgb_img = img.convert("RGB")
            pixel_data = np.array(rgb_img)
            
        sterile_img = Image.fromarray(pixel_data)
        sterile_img.save(image_path, "JPEG", quality=95, optimize=True, exif=b"", icc_profile=None)
        
        humanize_image(image_path, image_path, apply_transform=False)
        print(f"[Cleaner] [SUCCÈS ATOMIQUE] Purge C2PA + Injection EXIF Humain réussie pour {os.path.basename(image_path)}.")
        return True
    except Exception as e:
        print(f"[Cleaner] [ALERTE] Echec de la purge atomique enrichie : {e}")
        return False

async def _run_higgsfield_generate(prompt: str, images: list, output_path: str, model: str = "nano_banana") -> bool:
    """
    Exécute le CLI Higgsfield en arrière-plan pour générer une image.
    images: liste de chemins locaux vers les images de référence.
    """
    cmd = [
        "higgsfield.cmd" if os.name == "nt" else "higgsfield", "generate", "create", model,
        "--prompt", prompt,
        "--wait",
        "--json"
    ]
    for img in images:
        if img and os.path.exists(img):
            cmd.extend(["--image", img])
            
    try:
        print(f"[Higgsfield] Lancement génération avec {model} (Unlimited)...")
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            print(f"[Higgsfield] Erreur CLI : {stderr.decode()}")
            return False
            
        # Parse JSON
        try:
            data = json.loads(stdout.decode())
            url = None
            if "results" in data and len(data["results"]) > 0:
                url = data["results"][0].get("url")
            elif "url" in data:
                url = data["url"]
            elif "outputs" in data and len(data["outputs"]) > 0:
                url = data["outputs"][0]
                
            if not url:
                import re
                urls = re.findall(r'(https?://[^\s",]+)', stdout.decode())
                if urls:
                    url = urls[0]
                    
            if not url:
                print(f"[Higgsfield] URL introuvable dans le JSON: {stdout.decode()}")
                return False
                
            print(f"[Higgsfield] Téléchargement depuis {url}...")
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, urllib.request.urlretrieve, url, output_path)
            
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
            
        except json.JSONDecodeError:
            print(f"[Higgsfield] Erreur parsing JSON : {stdout.decode()}")
            return False
            
    except Exception as e:
        print(f"[Higgsfield] Exception : {e}")
        return False

async def task_generate_selfie(input_image_path, avatar_path, output_path, prompt_anglais):
    backgrounds = [
        "dans une chambre différente et lumineuse avec un lit fait, un mur blanc et une plante verte en arrière-plan",
        "dans un dressing moderne et chic avec des vêtements suspendus et des boîtes de rangement de manière ordonnée",
        "dans une salle de bain épurée et très propre avec un miroir propre et un carrelage blanc contemporain",
        "dans un salon chaleureux et lumineux avec un canapé crème et un tableau abstrait coloré au mur",
        "dans un intérieur minimaliste de style scandinave avec un meuble en bois clair et une lumière douce",
        "dans un appartement parisien avec des moulures blanches au mur et du parquet en arrière-plan",
        "dans une pièce avec un mur de couleur neutre (beige ou gris clair) et un éclairage naturel venant d'une fenêtre"
    ]
    bg_choice = random.choice(backgrounds)
    prompt = (
        f"Utilise les deux images fournies. La première image (image 1) est le portrait d'une fille servant de référence pour son visage, sa coiffure et sa silhouette. "
        f"La deuxième image (image 2) montre un vêtement ({prompt_anglais}).\n"
        f"Génère une seule photo ultra réaliste (style selfie spontané pris dans un miroir avec un smartphone) où la fille de l'image 1 porte fidèlement la tenue de l'image 2.\n"
        f"Change le décor de fond : place la fille {bg_choice}.\n"
        "La pose et l'éclairage doivent avoir l'air 100% naturels et non retouchés. Aucun filigrane ni texte sur l'image. "
        "L'image doit être au format vertical portrait 3:4."
    )
    return await _run_higgsfield_generate(prompt, [avatar_path, input_image_path], output_path)

async def task_generate_flat_lay(input_image_path, template_path, output_path, prompt_anglais):
    surfaces = [
        "un sol en parquet de chêne clair avec des veines de bois naturelles et chaleureuses",
        "un sol en parquet foncé de style vintage avec une texture de bois marquée",
        "un tapis en laine beige ou crème épais et texturé",
        "un tapis blanc moelleux et propre en fausse fourrure",
        "un dessus de lit en lin ou coton blanc légèrement froissé, style scandinave épuré",
        "un sol en béton ciré gris clair moderne et minimaliste"
    ]
    surface_choice = random.choice(surfaces)
    prompt = (
        f"Utilise les deux images fournies. La première image (image 1) montre un motif de sol ou de surface de référence. "
        f"La deuxième image (image 2) montre un vêtement ({prompt_anglais}).\n"
        f"Génère une seule photo ultra réaliste et spontanée en vue du dessus à 90 degrés (flat lay), où le vêtement de l'image 2 est posé à plat sur {surface_choice}.\n"
        "Ajoute des ombres naturelles et subtiles sous le vêtement pour donner du relief. "
        "IMPORTANT : Il ne doit y avoir aucun mannequin, aucun corps humain ni personne sur l'image. "
        "L'image doit être au format vertical portrait 3:4 et parfaitement centrée."
    )
    return await _run_higgsfield_generate(prompt, [template_path, input_image_path], output_path)

async def task_generate_hanger(original_image_path, hanger_template_path, output_path):
    prompt = (
        "Utilise les deux images fournies. La première image montre le vêtement cible à reproduire. "
        "La deuxième image est une image de référence montrant un cintre dans un décor spécifique. "
        "Génère une photo réaliste du vêtement de la première image suspendu exactement sur le cintre de la deuxième image, "
        "dans le même décor/arrière-plan que la deuxième image. Conserve fidèlement la coupe, la couleur, les motifs et la matière du vêtement."
    )
    return await _run_higgsfield_generate(prompt, [original_image_path, hanger_template_path], output_path)

async def task_generate_profile(input_path, output_path):
    prompt = (
        "Fais une version de cette image sous forme de selfie dans le miroir où le modèle se montre plus de profil (vue de côté), sans qu'on voie le dos. "
        "Garde exactement la même personne, les mêmes cheveux, la même tenue (la même robe), le même téléphone et le même arrière-plan de la pièce."
    )
    return await _run_higgsfield_generate(prompt, [input_path], output_path)

async def task_generate_stroller_domestic(input_image_path, output_path, prompt_anglais):
    domestic_backgrounds = [
        "dans le coin d'un salon moderne et lumineux, à côté d'une plante verte en pot et d'un canapé beige clair, avec du parquet au sol",
        "dans l'entrée accueillante et propre d'une maison contemporaine, avec un paillasson propre et des murs de tons neutres",
        "dans un couloir chic et bien éclairé, près d'un mur blanc cassé et d'une porte d'entrée",
        "dans une pièce de vie épurée de style scandinave, avec de la lumière naturelle provenant d'une grande fenêtre",
        "dans un dressing ou une chambre bien ordonnée, posée sur un sol en parquet de chêne clair"
    ]
    bg_choice = random.choice(domestic_backgrounds)
    prompt = (
        f"Utilise l'image fournie. Elle montre une poussette ({prompt_anglais}).\n"
        f"Génère une seule photo ultra réaliste de style amateur prise avec un smartphone par son propriétaire dans son appartement. "
        f"Place la poussette {bg_choice}.\n"
        "Les ombres sous les roues et la poussette doivent être parfaitement naturelles et donner du relief. "
        "IMPORTANT : Il ne doit y avoir aucun être humain ni aucune marque commerciale visible. "
        "L'image doit être au format vertical portrait 3:4 et parfaitement centrée."
    )
    return await _run_higgsfield_generate(prompt, [input_image_path], output_path)

async def task_generate_stroller_with_dog(input_image_path, output_path, prompt_anglais):
    dogs = [
        "un adorable petit spitz nain (Pomeranian) tout poilu et souriant",
        "un mignon petit carlin (Pug) avec de grands yeux expressifs",
        "un adorable chiot golden retriever très doux",
        "un très mignon petit bouledogue français aux oreilles dressées",
        "un petit chihuahua joyeux et mignon"
    ]
    dog_choice = random.choice(dogs)
    domestic_backgrounds = [
        "dans le coin d'un salon moderne et chaleureux",
        "dans l'entrée propre d'un appartement, à côté d'une plante verte",
        "près d'une grande baie vitrée lumineuse avec du parquet au sol",
        "dans une pièce de vie scandinave lumineuse"
    ]
    bg_choice = random.choice(domestic_backgrounds)
    prompt = (
        f"Utilise l'image fournie. Elle montre une poussette ({prompt_anglais}).\n"
        f"Génère une seule photo ultra réaliste de style amateur {bg_choice}.\n"
        f"IMPORTANT : Ajoute {dog_choice} confortablement assis ou debout à l'intérieur de la nacelle de la poussette. "
        "Le chien doit avoir l'air très mignon, calme et heureux, en regardant en direction de la caméra.\n"
        "Génère une seule photo ultra réaliste, style photo amateur prise avec un smartphone par le propriétaire de l'animal. "
        "Il ne doit y avoir aucun être humain visible dans l'image.\n"
        "L'image doit être au format vertical portrait 3:4 et parfaitement centrée."
    )
    return await _run_higgsfield_generate(prompt, [input_image_path], output_path)

async def task_generate_folded(input_image_path, template_path, output_path, prompt_anglais):
    surfaces = [
        "un sol en parquet de chêne clair avec des veines de bois naturelles",
        "un tapis blanc moelleux et propre en fausse fourrure",
        "un dessus de lit en lin ou coton blanc légèrement froissé",
        "une grande table en bois massif épurée"
    ]
    surface_choice = random.choice(surfaces)
    prompt = (
        f"Utilise les deux images fournies. La première image (image 1) montre un motif de sol ou de surface de référence. "
        f"La deuxième image (image 2) montre un vêtement ({prompt_anglais}).\n"
        f"Génère une seule photo ultra réaliste et spontanée en vue du dessus (flat lay), où le vêtement de l'image 2 est très proprement et joliment plié (façon boutique) et posé sur {surface_choice}.\n"
        "Ajoute des ombres naturelles et subtiles sous le vêtement pour donner du relief. "
        "IMPORTANT : Il ne doit y avoir aucun mannequin, aucun corps humain ni personne sur l'image. "
        "L'image doit être au format vertical portrait 3:4 et parfaitement centrée."
    )
    return await _run_higgsfield_generate(prompt, [template_path, input_image_path], output_path)

async def task_generate_selfie_hand_in_hair(input_path, output_path):
    prompt = (
        "Fais une version de cette image (selfie dans le miroir) où la fille prend toujours la photo avec son téléphone, mais avec sa main libre passée dans ses cheveux ou touchant ses cheveux.\n"
        "Garde exactement la même personne, le même visage, la même tenue (le même vêtement que l'image de base), le même téléphone et le même arrière-plan de la pièce.\n"
        "La pose doit être naturelle et spontanée. Aucun texte ni filigrane. L'image doit être au format vertical portrait 3:4."
    )
    return await _run_higgsfield_generate(prompt, [input_path], output_path)

async def generate_all_images_parallel_async(
    niche: str,
    file_path: str,
    avatar_path: str,
    floor_template_path: str,
    hanger_template_path: str,
    product_dir: str,
    prompt: str,
    niche_def=None
) -> dict:
    print(f"\n[Higgsfield Parallel] Démarrage du pipeline asynchrone (Niche : {niche.upper()})...")

    if niche_def is not None:
        results = {v: None for v in niche_def.output_images.values()}
        for legacy_key in ("selfie_upscaled", "flat_lay_upscaled", "profile_upscaled",
                           "hanger_upscaled", "folded_upscaled", "selfie_hand_in_hair_upscaled"):
            if legacy_key not in results:
                results[legacy_key] = None
        recipe = niche_def.image_recipe
        output_map = niche_def.output_images
    else:
        results = {
            "selfie_upscaled": None,
            "flat_lay_upscaled": None,
            "profile_upscaled": None,
            "hanger_upscaled": None,
            "folded_upscaled": None,
            "selfie_hand_in_hair_upscaled": None
        }
        recipe = None
        output_map = {}

    try:
        if recipe is None:
            is_stroller = (niche == "stroller")
            if is_stroller:
                selfie_path = os.path.join(product_dir, "selfie_upscaled.jpg")
                flat_lay_path = os.path.join(product_dir, "flat_lay_upscaled.jpg")

                print("[Higgsfield Parallel] [Legacy] Lancement des 2 tâches poussettes en parallèle...")
                res1, res2 = await asyncio.gather(
                    task_generate_stroller_domestic(file_path, selfie_path, prompt),
                    task_generate_stroller_with_dog(file_path, flat_lay_path, prompt)
                )
                if res1: results["selfie_upscaled"] = selfie_path
                if res2: results["flat_lay_upscaled"] = flat_lay_path
            else:
                selfie_path = os.path.join(product_dir, "selfie_upscaled.jpg")
                flat_lay_path = os.path.join(product_dir, "flat_lay_upscaled.jpg")
                hanger_path = os.path.join(product_dir, "hanger_upscaled.jpg")

                print("[Higgsfield Parallel] [Legacy] Lancement des 3 tâches vêtements en parallèle...")
                res_list = await asyncio.gather(
                    task_generate_selfie(file_path, avatar_path, selfie_path, prompt),
                    task_generate_flat_lay(file_path, floor_template_path, flat_lay_path, prompt),
                    task_generate_hanger(file_path, hanger_template_path, hanger_path),
                    return_exceptions=True
                )
                res1 = res_list[0] if not isinstance(res_list[0], Exception) else False
                res2 = res_list[1] if not isinstance(res_list[1], Exception) else False
                res3 = res_list[2] if not isinstance(res_list[2], Exception) else False
                
                if res1: results["selfie_upscaled"] = selfie_path
                if res2: results["flat_lay_upscaled"] = flat_lay_path
                if res3: results["hanger_upscaled"] = hanger_path

                profile_path = os.path.join(product_dir, "profile_upscaled.jpg")
                folded_path = os.path.join(product_dir, "folded_upscaled.jpg")
                selfie_hair_path = os.path.join(product_dir, "selfie_hand_in_hair_upscaled.jpg")

                print("[Higgsfield Parallel] [Legacy] Lancement du deuxième batch...")
                if res1:
                    tasks_batch_2 = [
                        task_generate_profile(selfie_path, profile_path),
                        task_generate_selfie_hand_in_hair(selfie_path, selfie_hair_path)
                    ]
                else:
                    async def dummy_task(): return False
                    tasks_batch_2 = [dummy_task(), dummy_task()]

                tasks_batch_2.append(task_generate_folded(file_path, floor_template_path, folded_path, prompt))
                res4, res5, res6 = await asyncio.gather(*tasks_batch_2)

                if res1 and res4: results["profile_upscaled"] = profile_path
                if res1 and res5: results["selfie_hand_in_hair_upscaled"] = selfie_hair_path
                if res6: results["folded_upscaled"] = folded_path

        else:
            SELFIE_DEPENDENT = {"profile", "selfie_hand_in_hair"}
            batch1_keys = [k for k in recipe if k not in SELFIE_DEPENDENT]
            batch2_keys = [k for k in recipe if k in SELFIE_DEPENDENT]

            async def _make_task(key, out_filename):
                out_path = os.path.join(product_dir, out_filename)
                if key == "selfie":
                    return key, out_path, await task_generate_selfie(file_path, avatar_path, out_path, prompt)
                elif key == "flat_lay":
                    return key, out_path, await task_generate_flat_lay(file_path, floor_template_path, out_path, prompt)
                elif key == "hanger":
                    return key, out_path, await task_generate_hanger(file_path, hanger_template_path, out_path)
                elif key == "folded":
                    return key, out_path, await task_generate_folded(file_path, floor_template_path, out_path, prompt)
                elif key == "stroller_domestic":
                    return key, out_path, await task_generate_stroller_domestic(file_path, out_path, prompt)
                elif key == "stroller_with_dog":
                    return key, out_path, await task_generate_stroller_with_dog(file_path, out_path, prompt)
                elif key == "product_on_surface":
                    return key, out_path, await task_generate_flat_lay(file_path, floor_template_path, out_path, prompt)
                elif key == "product_in_context":
                    return key, out_path, await task_generate_folded(file_path, floor_template_path, out_path, prompt)
                else:
                    print(f"[Higgsfield Parallel] [WARN] Clé inconnue : '{key}'.")
                    return key, out_path, False

            print(f"[Higgsfield Parallel] Batch 1 : {batch1_keys}")
            batch1_results_raw = await asyncio.gather(*[
                _make_task(k, output_map.get(k, f"{k}_upscaled.jpg"))
                for k in batch1_keys
            ], return_exceptions=True)
            
            batch1_results = []
            for idx, res in enumerate(batch1_results_raw):
                if isinstance(res, Exception):
                    print(f"[Higgsfield Parallel] [ERROR] Tâche {batch1_keys[idx]} a échoué : {res}")
                    batch1_results.append(("", "", False))
                else:
                    batch1_results.append(res)

            selfie_result_path = None
            selfie_success = False
            for key, out_path, ok in batch1_results:
                if ok:
                    results[output_map.get(key, f"{key}_upscaled.jpg")] = out_path
                    canonical = _canonical_result_key(key, output_map)
                    if canonical: results[canonical] = out_path
                if key == "selfie":
                    selfie_result_path = out_path
                    selfie_success = ok

            if batch2_keys:
                print(f"[Higgsfield Parallel] Batch 2 (dépendant selfie) : {batch2_keys}")
                if not selfie_success:
                    async def dummy_task(): return False
                    batch2_coros = [dummy_task() for _ in batch2_keys]
                else:
                    batch2_coros = []
                    for k in batch2_keys:
                        out_filename = output_map.get(k, f"{k}_upscaled.jpg")
                        out_path = os.path.join(product_dir, out_filename)
                        if k == "profile":
                            batch2_coros.append(_make_task_dependent(k, selfie_result_path, out_path))
                        elif k == "selfie_hand_in_hair":
                            batch2_coros.append(_make_task_dependent(k, selfie_result_path, out_path))

                batch2_results_raw = await asyncio.gather(*batch2_coros, return_exceptions=True)
                batch2_results = []
                for idx, res in enumerate(batch2_results_raw):
                    if isinstance(res, Exception):
                        print(f"[Higgsfield Parallel] [ERROR] Tâche {batch2_keys[idx]} a échoué : {res}")
                        batch2_results.append(("", "", False))
                    else:
                        batch2_results.append(res)
                        
                if selfie_success:
                    for (key, out_path, ok) in batch2_results:
                        if ok:
                            results[output_map.get(key, f"{key}_upscaled.jpg")] = out_path
                            canonical = _canonical_result_key(key, output_map)
                            if canonical:
                                results[canonical] = out_path

        print("[Higgsfield Parallel] Fin du pipeline asynchrone.")
        return results

    except Exception as e:
        print(f"[Higgsfield Parallel] Erreur critique dans l'orchestrateur : {e}")
        return results

def _canonical_result_key(recipe_key: str, output_map: dict) -> str:
    out_filename = output_map.get(recipe_key, "")
    base = os.path.splitext(out_filename)[0] if out_filename else ""
    return base if base else None

async def _make_task_dependent(key: str, input_path: str, output_path: str):
    if key == "profile":
        ok = await task_generate_profile(input_path, output_path)
    elif key == "selfie_hand_in_hair":
        ok = await task_generate_selfie_hand_in_hair(input_path, output_path)
    else:
        ok = False
    return key, output_path, ok
