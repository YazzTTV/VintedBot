import os
import re
import time
import random
import asyncio
from playwright.async_api import async_playwright
from edge_browser import start_edge, CDP_URL
from PIL import Image
from humanizer import humanize_image
from image_generator import crop_black_borders

class AsyncLockWrapper:
    def __init__(self, lock, page):
        self.lock = lock
        self.page = page
    async def __aenter__(self):
        if self.lock:
            await self.lock.acquire()
            try:
                print(f"[ChatGPT Async] Focus de l'onglet actif...")
                await self.page.bring_to_front()
                await asyncio.sleep(1)
            except Exception as e:
                print(f"[ChatGPT Async] Focus echec : {e}")
        return self
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.lock:
            self.lock.release()

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

async def _save_chatgpt_image_async(page, target_img, output_path: str) -> bool:
    try:
        img_url = await target_img.get_attribute("src")
        if not img_url:
            return False
            
        import base64
        try:
            base64_data = await page.evaluate("""async (url) => {
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }""", img_url)
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(base64_data))
            return True
        except Exception as e:
            print(f"[ChatGPT Async] Téléchargement direct échoué : {e}. Screenshot fallback.")
            
        await target_img.screenshot(path=output_path)
        return True
    except Exception as e:
        print(f"[ChatGPT Async] Échec de la sauvegarde : {e}")
        return False

async def wait_for_chatgpt_image_async(page, timeout: int = 180):
    start_time = time.time()
    target_img = None
    while time.time() - start_time < timeout:
        is_loading = await page.locator("[data-testid='stop-button']").is_visible()
        
        loading_texts = ["On peaufine", "Refining", "details", "Details"]
        if not is_loading:
            for text in loading_texts:
                try:
                    if await page.get_by_text(text, exact=False).first.is_visible():
                        is_loading = True
                        break
                except:
                    pass
        
        images = await page.locator("img").all()
        for img in images:
            try:
                box = await img.bounding_box()
                if box and box['width'] > 300 and box['height'] > 300:
                    if not is_loading:
                        target_img = img
                        break
            except:
                pass
        
        if target_img:
            return target_img
            
        await asyncio.sleep(2)
    return None

async def task_generate_selfie(context, input_image_path, avatar_path, output_path, prompt_anglais, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files([avatar_path, input_image_path])
        await asyncio.sleep(5)
        
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
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Selfie] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def task_generate_flat_lay(context, input_image_path, template_path, output_path, prompt_anglais, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files([template_path, input_image_path])
        await asyncio.sleep(5)
        
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
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Flat Lay] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def task_generate_hanger(context, original_image_path, hanger_template_path, output_path, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files([original_image_path, hanger_template_path])
        await asyncio.sleep(5)
        
        prompt = (
            "Utilise les deux images fournies. La première image montre le vêtement cible à reproduire. "
            "La deuxième image est une image de référence montrant un cintre dans un décor spécifique. "
            "Génère une photo réaliste du vêtement de la première image suspendu exactement sur le cintre de la deuxième image, "
            "dans le même décor/arrière-plan que la deuxième image. Conserve fidèlement la coupe, la couleur, les motifs et la matière du vêtement."
        )
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Hanger] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def task_generate_profile(context, input_path, output_path, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files(input_path)
        await asyncio.sleep(5)
        
        prompt = (
            "Fais une version de cette image sous forme de selfie dans le miroir où le modèle se montre plus de profil (vue de côté), sans qu'on voie le dos. "
            "Garde exactement la même personne, les mêmes cheveux, la même tenue (la même robe), le même téléphone et le même arrière-plan de la pièce."
        )
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Profile] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def task_generate_stroller_domestic(context, input_image_path, output_path, prompt_anglais, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files(input_image_path)
        await asyncio.sleep(5)
        
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
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Stroller Domestic] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def task_generate_stroller_with_dog(context, input_image_path, output_path, prompt_anglais, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files(input_image_path)
        await asyncio.sleep(5)
        
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
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Stroller Dog] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def task_generate_folded(context, input_image_path, template_path, output_path, prompt_anglais, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files([template_path, input_image_path])
        await asyncio.sleep(5)
        
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
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Folded] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def task_generate_selfie_hand_in_hair(context, input_path, output_path, lock=None):
    page = await context.new_page()
    try:
        await page.goto("https://chatgpt.com", timeout=60000)
        await asyncio.sleep(3)
        
        file_input = page.locator("input[type=file][accept*='image']").first
        await file_input.set_input_files(input_path)
        await asyncio.sleep(5)
        
        prompt = (
            "Fais une version de cette image (selfie dans le miroir) où la fille prend toujours la photo avec son téléphone, mais avec sa main libre passée dans ses cheveux ou touchant ses cheveux.\n"
            "Garde exactement la même personne, le même visage, la même tenue (le même vêtement que l'image de base), le même téléphone et le même arrière-plan de la pièce.\n"
            "La pose doit être naturelle et spontanée. Aucun texte ni filigrane. L'image doit être au format vertical portrait 3:4."
        )
        
        success = False
        async with AsyncLockWrapper(lock, page):
            prompt_textarea = page.locator("#prompt-textarea")
            await prompt_textarea.fill(prompt)
            
            send_button = page.locator('button[data-testid="send-button"]')
            try:
                await send_button.wait_for(state="visible", timeout=10000)
                await send_button.click()
            except:
                await prompt_textarea.press("Enter")
                
            target_img = await wait_for_chatgpt_image_async(page)
            if target_img:
                success = await _save_chatgpt_image_async(page, target_img, output_path)
                
        if success:
            await page.close()
            crop_black_borders(output_path, output_path)
            strip_metadata(output_path)
            return True
        await page.close()
    except Exception as e:
        print(f"[ChatGPT Selfie Hair] Erreur : {e}")
        try:
            await page.close()
        except:
            pass
    return False

async def generate_all_images_parallel_async(
    niche: str,
    file_path: str,
    avatar_path: str,
    floor_template_path: str,
    hanger_template_path: str,
    product_dir: str,
    prompt: str
) -> dict:
    """
    Orchestrateur asynchrone qui connecte à Edge CDP une seule fois,
    lance les générations d'images en parallèle sur plusieurs onglets,
    puis enchaîne l'image de profil une fois le selfie terminé.
    """
    print(f"\n[ChatGPT Parallel] Démarrage du pipeline asynchrone (Niche : {niche.upper()})...")
    
    if not start_edge():
        print("[ChatGPT Parallel] ERREUR : Impossible de démarrer Edge.")
        return {}

    is_stroller = (niche == "stroller")
    results = {
        "selfie_upscaled": None,
        "flat_lay_upscaled": None,
        "profile_upscaled": None,
        "hanger_upscaled": None,
        "folded_upscaled": None,
        "selfie_hand_in_hair_upscaled": None
    }
    
    async with async_playwright() as p:
        try:
            print("[ChatGPT Parallel] Connexion au navigateur Edge existant (CDP)...")
            browser = await p.chromium.connect_over_cdp(CDP_URL)
            context = browser.contexts[0]
            dalle_lock = asyncio.Lock()
            
            if is_stroller:
                selfie_path = os.path.join(product_dir, "selfie_upscaled.jpg")
                flat_lay_path = os.path.join(product_dir, "flat_lay_upscaled.jpg")
                
                print("[ChatGPT Parallel] Lancement des 2 tâches poussettes en parallèle...")
                task1 = task_generate_stroller_domestic(context, file_path, selfie_path, prompt, dalle_lock)
                task2 = task_generate_stroller_with_dog(context, file_path, flat_lay_path, prompt, dalle_lock)
                
                res1, res2 = await asyncio.gather(task1, task2)
                if res1:
                    results["selfie_upscaled"] = selfie_path
                if res2:
                    results["flat_lay_upscaled"] = flat_lay_path
                    
            else:
                selfie_path = os.path.join(product_dir, "selfie_upscaled.jpg")
                flat_lay_path = os.path.join(product_dir, "flat_lay_upscaled.jpg")
                hanger_path = os.path.join(product_dir, "hanger_upscaled.jpg")
                
                print("[ChatGPT Parallel] Lancement des 3 tâches vêtements en parallèle (Selfie, Flat Lay, Cintre)...")
                task1 = task_generate_selfie(context, file_path, avatar_path, selfie_path, prompt, dalle_lock)
                task2 = task_generate_flat_lay(context, file_path, floor_template_path, flat_lay_path, prompt, dalle_lock)
                task3 = task_generate_hanger(context, file_path, hanger_template_path, hanger_path, dalle_lock)
                
                res1, res2, res3 = await asyncio.gather(task1, task2, task3)
                
                if res1:
                    results["selfie_upscaled"] = selfie_path
                if res2:
                    results["flat_lay_upscaled"] = flat_lay_path
                if res3:
                    results["hanger_upscaled"] = hanger_path
                
                # Étape séquentielle secondaire : Génération de profil, article plié, et selfie cheveux
                tasks_batch_2 = []
                profile_path = os.path.join(product_dir, "profile_upscaled.jpg")
                folded_path = os.path.join(product_dir, "folded_upscaled.jpg")
                selfie_hair_path = os.path.join(product_dir, "selfie_hand_in_hair_upscaled.jpg")
                
                print("[ChatGPT Parallel] Lancement du deuxième batch (Profil, Plié, Selfie Cheveux)...")
                if res1:
                    tasks_batch_2.append(task_generate_profile(context, selfie_path, profile_path, dalle_lock))
                    tasks_batch_2.append(task_generate_selfie_hand_in_hair(context, selfie_path, selfie_hair_path, dalle_lock))
                else:
                    async def dummy_task(): return False
                    tasks_batch_2.append(dummy_task())
                    tasks_batch_2.append(dummy_task())
                    
                tasks_batch_2.append(task_generate_folded(context, file_path, floor_template_path, folded_path, prompt, dalle_lock))
                
                res4, res5, res6 = await asyncio.gather(*tasks_batch_2)
                
                if res1 and res4:
                    results["profile_upscaled"] = profile_path
                if res1 and res5:
                    results["selfie_hand_in_hair_upscaled"] = selfie_hair_path
                if res6:
                    results["folded_upscaled"] = folded_path
            
            await browser.close()
            print("[ChatGPT Parallel] Fin du pipeline asynchrone.")
            return results
            
        except Exception as e:
            print(f"[ChatGPT Parallel] Erreur critique dans l'orchestrateur : {e}")
            return results
