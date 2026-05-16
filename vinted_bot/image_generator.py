"""
Genere une image "selfie" via Gemini Web (Edge CDP).
Upload l'avatar + la capture produit et demande un Clothes Swap.
Utilise edge_browser.py pour la gestion de la connexion.
"""
import os
import time
from playwright.sync_api import sync_playwright
from edge_browser import (
    start_edge, open_gemini_page, upload_files,
    type_and_send, wait_for_response
)

def _save_gemini_image(page, target_img, output_path: str) -> bool:
    """
    Sauvegarde l'image generee de maniere ultra-robuste :
    1. Essaie le decodage base64 direct
    2. Essaie le telechargement direct HTTP via requests (sans aucun filigrane ou overlay)
    3. Essaie le fetch de page base64
    4. En dernier recours, cache l'interface entiere de Gemini (y compris disclaimer) et prend un screenshot propre.
    """
    try:
        img_url = target_img.get_attribute("src")
        if img_url:
            print(f"[Image Generator] URL de l'image detectee : {img_url[:120]}...")
        else:
            return False
            
        # Cas 1 : base64 direct
        if img_url.startswith("data:image"):
            import base64
            header, encoded = img_url.split(",", 1)
            data = base64.b64decode(encoded)
            with open(output_path, "wb") as f:
                f.write(data)
            print("[Image Generator] [OK] Image décodee depuis base64 avec succes.")
            return True
            
        # Cas 2 : HTTP direct (Google User Content CDN - public et sans cookie)
        if img_url.startswith("http"):
            import requests
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
                r = requests.get(img_url, headers=headers, timeout=15)
                if r.status_code == 200:
                    with open(output_path, "wb") as f:
                        f.write(r.content)
                    print("[Image Generator] [OK] Image téléchargee directement via HTTP.")
                    return True
            except Exception as req_err:
                print(f"[Image Generator] Note req direct : {req_err}")
                
        # Cas 3 : Extraction directe en HD via Canvas (Parfait pour les blobs localises en memoire du navigateur)
        try:
            import base64
            js_img = target_img.element_handle()
            base64_data = page.evaluate("""async (img_el) => {
                return new Promise((resolve, reject) => {
                    if (img_el.complete && img_el.naturalWidth !== 0) {
                        const canvas = document.createElement('canvas');
                        canvas.width = img_el.naturalWidth;
                        canvas.height = img_el.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img_el, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.98).split(',')[1]);
                    } else {
                        img_el.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img_el.naturalWidth;
                            canvas.height = img_el.naturalHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img_el, 0, 0);
                            resolve(canvas.toDataURL('image/jpeg', 0.98).split(',')[1]);
                        };
                        img_el.onerror = reject;
                    }
                });
            }""", js_img)
            with open(output_path, "wb") as f:
                f.write(base64.b64decode(base64_data))
            print("[Image Generator] [OK] Image extraite directement du Canvas en HD d'origine.")
            return True
        except Exception as canvas_err:
            print(f"[Image Generator] Note extraction Canvas : {canvas_err}")
            
    except Exception as e:
        print(f"[Image Generator] Note extraction directe : {e}")
        
    # Cas 4 : Fallback screenshot avec masquage total et recursif de l'interface par visibilité
    print("[Image Generator] Fallback : Capture d'ecran de l'element...")
    try:
        # Étape 0 : Centrer parfaitement l'image dans l'écran pour éviter tout masquage ou rognage par les menus ou bandeaux
        try:
            target_img.evaluate("el => el.scrollIntoView({block: 'center', inline: 'center'})")
            time.sleep(1.0)
        except Exception as scroll_err:
            print(f"[Image Generator] Note defilement : {scroll_err}")
            
        js_img = target_img.element_handle()
        page.evaluate("""(img_el) => {
            // Étape 1 : Masquer absolument tout le DOM
            document.querySelectorAll('body *').forEach(el => {
                el.style.setProperty('visibility', 'hidden', 'important');
            });
            // Étape 2 : Réafficher uniquement l'image cible et ses ancêtres
            let current = img_el;
            while (current && current !== document.body) {
                current.style.setProperty('visibility', 'visible', 'important');
                current.style.setProperty('background', 'transparent', 'important');
                current = current.parentElement;
            }
        }""", js_img)
        time.sleep(0.5)
        target_img.screenshot(path=output_path)
        print("[Image Generator] [OK] Capture d'ecran de secours reussie.")
        
        # Rognage mathématique automatique des bordures noires et textes restants
        crop_black_borders(output_path, output_path)
        return True
    except Exception as err:
        print(f"[Image Generator] Echec de la capture de secours : {err}")
        return False

def crop_black_borders(image_path: str, output_path: str) -> bool:
    try:
        from PIL import Image
        img = Image.open(image_path)
        if img.mode != "RGB":
            img = img.convert("RGB")
            
        width, height = img.size
        
        # 1. Éliminer d'abord les bordures noires du haut et du bas
        top_crop = 0
        for y in range(height):
            is_black_line = True
            for x in range(int(width * 0.3), int(width * 0.7), 5):
                r, g, b = img.getpixel((x, y))
                if r > 35 or g > 35 or b > 35:
                    is_black_line = False
                    break
            if not is_black_line:
                top_crop = y
                break
                
        bottom_crop = height
        for y in range(height - 1, -1, -1):
            is_black_line = True
            for x in range(int(width * 0.3), int(width * 0.7), 5):
                r, g, b = img.getpixel((x, y))
                if r > 35 or g > 35 or b > 35:
                    is_black_line = False
                    break
            if not is_black_line:
                bottom_crop = y + 1
                break
                
        # Rogner verticalement si nécessaire
        if top_crop > 10 or bottom_crop < height - 10:
            if (bottom_crop - top_crop) > (height * 0.4):
                img = img.crop((0, top_crop, width, bottom_crop))
                width, height = img.size
                
        # 2. Forcer un format portrait 3:4 parfait et centré (le format roi pour Vinted)
        target_ratio = 3 / 4 # Largeur / Hauteur
        current_ratio = width / height
        
        if current_ratio > target_ratio:
            # L'image est trop large (ex: horizontale). On rogne les côtés gauche et droit de manière symétrique.
            new_width = int(height * target_ratio)
            left = (width - new_width) // 2
            right = left + new_width
            img = img.crop((left, 0, right, height))
            print(f"[Image Processor] Format horizontal ajuste en 3:4 vertical (Largeur: {new_width}px, Hauteur: {height}px).")
        elif current_ratio < target_ratio:
            # L'image est trop haute. On rogne le haut et le bas de manière symétrique.
            new_height = int(width / target_ratio)
            top = (height - new_height) // 2
            bottom = top + new_height
            img = img.crop((0, top, width, bottom))
            print(f"[Image Processor] Format trop vertical ajuste en 3:4 vertical (Largeur: {width}px, Hauteur: {new_height}px).")
            
        # --- PURGE ATOMIQUE DES MÉTADONNÉES AI VIA NUMPY ---
        import numpy as np
        # 1. Extraire la matrice de pixels brute (destruction totale de tout héritage non-visuel)
        pixel_data = np.array(img)
        # 2. Reconstruire une image vierge à partir des chiffres mathématiques
        sterile_img = Image.fromarray(pixel_data)
        # 3. Sauvegarder en JPEG stérile en forçant l'exclusion de profil et exif
        sterile_img.save(output_path, "JPEG", quality=95, optimize=True, exif=b"", icc_profile=None)
        
        print(f"[Image Processor] [SUCCÈS ATOMIQUE] 100% des métadonnées AI purgées de {os.path.basename(output_path)}.")
        return True
    except Exception as e:
        print(f"[Image Processor] Erreur lors du recadrage ou nettoyage : {e}")
        return False



def generate_selfie(prompt_anglais: str, input_image_path: str, output_path: str, avatar: str) -> bool:
    """
    Genere une image via Gemini Web.
    Upload l'avatar + la capture produit pour un Clothes Swap.
    Retourne True si l'image a ete sauvegardee, False sinon.
    """
    if not avatar:
        print(f"[Image Generator] ERREUR : avatar non spécifié.")
        return False
    if not os.path.exists(avatar):
        print(f"[Image Generator] ERREUR : avatar introuvable : {avatar}")
        return False

    full_prompt = (
        "IMPORTANT : N'utilise aucune extension, application ou recherche Google. "
        "Genere directement l'image sans faire de recherche en ligne.\n\n"
        f"Met la tenue de l'image 2 ({prompt_anglais}) a la fille de l'image 1. "
        "Genere une seule photo ultra realiste, style selfie naturel dans un miroir. "
        "L'image doit obligatoirement etre au format vertical portrait 3:4 (aspect ratio 3:4) et parfaitement centree."
    )

    print(f"[Image Generator] Clothes Swap en cours...")

    if not start_edge():
        return False

    with sync_playwright() as p:
        try:
            browser, page = open_gemini_page(p)

            # 1. Upload avatar + produit
            print("[Image Generator] Upload des 2 images (avatar + produit)...")
            if not upload_files(page, [avatar, input_image_path]):
                print("[Image Generator] ERREUR : upload echoue.")
                page.close()
                return False

            # 2. Envoi du prompt Clothes Swap
            print("[Image Generator] Envoi du prompt...")
            type_and_send(page, full_prompt)

            # 3. Attente de la generation (plus longue pour les images)
            wait_for_response(page, timeout_s=120)
            time.sleep(3)  # marge supplementaire pour le rendu final

            # --- Detection et gestion automatique de l'erreur "Reessayer sans les applis" ---
            try:
                retry_selectors = [
                    'button:has-text("R\u00e9essayer sans les applis")',
                    'a:has-text("R\u00e9essayer sans les applis")',
                    'span:has-text("R\u00e9essayer sans les applis")',
                    'text="R\u00e9essayer sans les applis"',
                    'text="without apps"'
                ]
                for r_sel in retry_selectors:
                    btn = page.locator(r_sel).first
                    if btn.is_visible(timeout=1500):
                        print("[Image Generator] [WARN] Detection du bouton 'Reessayer sans les applis'. Clic force...")
                        try:
                            btn.click(force=True, timeout=5000)
                        except Exception:
                            page.evaluate("el => el.click()", btn)
                        print("[Image Generator] Attente de la nouvelle generation sans les applis...")
                        wait_for_response(page, timeout_s=120)
                        time.sleep(3)
                        break
            except Exception as e:
                print(f"[Image Generator] Note : Echec du clic de secours : {e}")

            # 4. Recuperation de l'image generee
            print("[Image Generator] Recherche de l'image generee...")
            bot_responses = page.locator("message-content")
            last_response = bot_responses.nth(bot_responses.count() - 1)

            images = last_response.locator("img").all()
            target_img = None
            max_area = 0

            for img in images:
                box = img.bounding_box()
                if box:
                    area = box["width"] * box["height"]
                    if area > max_area:
                        max_area = area
                        target_img = img

            if target_img and max_area > 10000:
                success = _save_gemini_image(page, target_img, output_path)
                page.close()
                if success:
                    crop_black_borders(output_path, output_path)
                return success
            else:
                print("[Image Generator] Aucune image generee. Screenshot de secours...")
                page.screenshot(path=output_path + "_erreur.png")
                page.close()
                return False

        except Exception as e:
            print(f"[Image Generator] Erreur critique : {e}")
            try:
                page.close()
            except Exception:
                pass
            return False


def generate_flat_lay(prompt_anglais: str, input_image_path: str, output_path: str, template: str) -> bool:
    """
    Genere une image du vetement a plat sur le sol via Gemini Web (Edge CDP).
    Upload l'image de modele sol + la capture produit et demande de remplacer le vetement.
    Retourne True si l'image a ete sauvegardee, False sinon.
    """
    if not template:
        print(f"[Image Generator] ERREUR : modèle sol non spécifié.")
        return False
    if not os.path.exists(template):
        print(f"[Image Generator] ERREUR : modèle sol introuvable : {template}")
        return False

    full_prompt = (
        "IMPORTANT : N'utilise aucune extension, application ou recherche Google. "
        "Genere directement l'image sans faire de recherche en ligne.\n\n"
        f"Remplace le vetement de l'image 1 par le vetement de l'image 2 ({prompt_anglais}). "
        "Garde exactement le meme angle de vue du dessus et le meme sol en bois clair. "
        "Genere une seule photo ultra realiste de ce vetement a plat sur le sol, sans aucun mannequin ni personne. "
        "L'image doit obligatoirement etre au format vertical portrait 3:4 (aspect ratio 3:4) et parfaitement centree."
    )

    print(f"[Image Generator] Generation Flat Lay en cours...")

    if not start_edge():
        return False

    with sync_playwright() as p:
        try:
            browser, page = open_gemini_page(p)

            # 1. Upload modele sol + produit
            print("[Image Generator] Upload des 2 images (modèle sol + produit)...")
            if not upload_files(page, [template, input_image_path]):
                print("[Image Generator] ERREUR : upload echoue.")
                page.close()
                return False

            # 2. Envoi du prompt Flat Lay
            print("[Image Generator] Envoi du prompt Flat Lay...")
            type_and_send(page, full_prompt)

            # 3. Attente de la generation (plus longue pour les images)
            wait_for_response(page, timeout_s=120)
            time.sleep(3)  # marge supplementaire pour le rendu final

            # --- Detection et gestion automatique de l'erreur "Reessayer sans les applis" ---
            try:
                retry_selectors = [
                    'button:has-text("R\u00e9essayer sans les applis")',
                    'a:has-text("R\u00e9essayer sans les applis")',
                    'span:has-text("R\u00e9essayer sans les applis")',
                    'text="R\u00e9essayer sans les applis"',
                    'text="without apps"'
                ]
                for r_sel in retry_selectors:
                    btn = page.locator(r_sel).first
                    if btn.is_visible(timeout=1500):
                        print("[Image Generator] [WARN] Detection du bouton 'Reessayer sans les applis'. Clic force...")
                        try:
                            btn.click(force=True, timeout=5000)
                        except Exception:
                            page.evaluate("el => el.click()", btn)
                        print("[Image Generator] Attente de la nouvelle generation sans les applis...")
                        wait_for_response(page, timeout_s=120)
                        time.sleep(3)
                        break
            except Exception as e:
                print(f"[Image Generator] Note : Echec du clic de secours : {e}")

            # 4. Recuperation de l'image generee
            print("[Image Generator] Recherche de l'image generee...")
            bot_responses = page.locator("message-content")
            last_response = bot_responses.nth(bot_responses.count() - 1)

            images = last_response.locator("img").all()
            target_img = None
            max_area = 0

            for img in images:
                box = img.bounding_box()
                if box:
                    area = box["width"] * box["height"]
                    if area > max_area:
                        max_area = area
                        target_img = img

            if target_img and max_area > 10000:
                success = _save_gemini_image(page, target_img, output_path)
                page.close()
                if success:
                    crop_black_borders(output_path, output_path)
                return success
            else:
                print("[Image Generator] Aucune image Flat Lay generee. Screenshot de secours...")
                page.screenshot(path=output_path + "_erreur.png")
                page.close()
                return False

        except Exception as e:
            print(f"[Image Generator] Erreur critique Flat Lay : {e}")
            try:
                page.close()
            except Exception:
                pass
            return False

