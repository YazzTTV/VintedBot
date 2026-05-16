import time
import os
from playwright.sync_api import sync_playwright
from edge_browser import start_edge, CDP_URL
from PIL import Image
from humanizer import humanize_image

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
            
        # 1. Ouvrir et forcer en RGB pur (supprime canal alpha et métadonnées PIL)
        with Image.open(image_path) as img:
            rgb_img = img.convert("RGB")
            
            # 2. Transférer vers une matrice NUMPY (extraction des PIXELS BRUTS mathématiques)
            # ICI, TOUTES LES MÉTADONNÉES D'ORIGINE SONT DÉTRUITES.
            pixel_data = np.array(rgb_img)
            
        # 3. Reconstruire une NOUVELLE image à partir des chiffres purs
        sterile_img = Image.fromarray(pixel_data)
        
        # 4. Écraser le fichier en JPEG nu temporaire
        sterile_img.save(image_path, "JPEG", quality=95, optimize=True, exif=b"", icc_profile=None)
        
        # 5. Enrichissement Humain : Réinjection d'EXIF iPhone réalistes (sans rotation ici)
        humanize_image(image_path, image_path, apply_transform=False)
        
        print(f"[Cleaner] [SUCCÈS ATOMIQUE] Purge C2PA + Injection EXIF Humain réussie pour {os.path.basename(image_path)}.")
        return True
    except Exception as e:
        print(f"[Cleaner] [ALERTE] Echec de la purge atomique enrichie : {e}")
        return False

def upscale_image_with_chatgpt(input_path: str, output_path: str, max_attempts: int = 2) -> bool:
    """
    Automate ChatGPT pour ameliorer la qualite d'une image, avec essais multiples en cas de timeout/echec.
    """
    print(f"[ChatGPT] Tentative d'upscaling pour : {input_path}")
    
    if not os.path.exists(input_path):
        print(f"[ChatGPT] ERREUR : Fichier source introuvable : {input_path}")
        return False

    # S'assurer que Edge est lance avec CDP
    if not start_edge():
        print("[ChatGPT] ERREUR : Impossible de demarrer Edge.")
        return False

    try:
        with sync_playwright() as p:
            # Connexion au navigateur deja ouvert
            browser = p.chromium.connect_over_cdp(CDP_URL)
            context = browser.contexts[0]
            
            for attempt in range(1, max_attempts + 1):
                if attempt > 1:
                    print(f"\n[ChatGPT] [RETRY] Lancement de la tentative {attempt}/{max_attempts} suite à un echec...")
                else:
                    print(f"[ChatGPT] Lancement de la tentative {attempt}/{max_attempts}...")
                
                page = context.new_page()
                try:
                    print("[ChatGPT] Navigation vers ChatGPT...")
                    page.goto("https://chatgpt.com", timeout=60000)
                    time.sleep(3) # Laisser un peu de temps pour le chargement
                    
                    # Upload de l'image sur le bon input qui accepte les images
                    print("[ChatGPT] Upload de l'image...")
                    file_input = page.locator("input[type=file][accept*='image']").first
                    file_input.set_input_files(input_path)
                    
                    # Attente de l'upload (5 secondes comme demande)
                    time.sleep(5)
                    
                    # Prompt pour l'upscale
                    print("[ChatGPT] Envoi du prompt d'upscale...")
                    prompt_textarea = page.locator("#prompt-textarea")
                    prompt_textarea.fill("Upscale and upgrade quality")
                    
                    # Attente que le bouton d'envoi soit actif (upload fini)
                    send_button = page.locator('button[data-testid="send-button"]')
                    try:
                        send_button.wait_for(state="visible", timeout=10000)
                        send_button.click()
                        time.sleep(2) # Laisser ChatGPT traiter le clic
                    except Exception as e:
                        print(f"[ChatGPT] [WARN] Bouton d'envoi non detecte ou inactif : {e}")
                        prompt_textarea.press("Enter")
                    
                    # Attente de la generation avec boucle robuste (augmentation du timeout à 180s)
                    timeout = 180
                    print(f"[ChatGPT] Attente de la generation de l'image (max {timeout}s)...")
                    start_time = time.time()
                    target_img = None
                    
                    while time.time() - start_time < timeout:
                        # 1. Verifier si un indicateur de chargement est actif (stop-button visible = generation en cours)
                        is_loading = page.locator("[data-testid='stop-button']").is_visible()
                        loading_texts = ["On peaufine", "Refining", "details", "Details"]
                        
                        if not is_loading:
                            for text in loading_texts:
                                try:
                                    if page.get_by_text(text, exact=False).first.is_visible():
                                        is_loading = True
                                        break
                                except:
                                    pass
                        
                        # 2. Chercher directement l'image de grande taille genere sur la page
                        images = page.locator("img").all()
                        for img in images:
                            try:
                                box = img.bounding_box()
                                if box and box['width'] > 300 and box['height'] > 300:
                                    if not is_loading:
                                        target_img = img
                                        break
                            except:
                                pass
                        
                        if target_img:
                            break
                        
                        time.sleep(2)
        
                    if target_img:
                        print(f"[ChatGPT] [OK] Image finale prete ! Extraction du lien direct...")
                        img_url = target_img.get_attribute("src")
                        print(f"[ChatGPT] Telechargement de l'image d'origine de haute qualite...")
                        
                        try:
                            import base64
                            base64_data = page.evaluate("""async (url) => {
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
                            print("[ChatGPT] [OK] Image d'origine telechargee avec succes sans aucune superposition.")
                            
                            # --- NETTOYAGE DES MÉTADONNÉES AI ---
                            strip_metadata(output_path)
                            
                            page.close()
                            return True
                        except Exception as fetch_err:
                            print(f"[ChatGPT] [WARN] Echec du telechargement direct : {fetch_err}. Capture de secours.")
                            # Masquer l'interface ChatGPT pour éviter les superpositions d'éléments de chat
                            try:
                                page.evaluate("""() => {
                                    const selectors = [
                                        '.input-area-container', '.input-area', 'gmat-input-field', 'rich-textarea', 
                                        'header', '.sidebar', '.chat-input-container', 'div[class*="input" i]', 'div[class*="composer" i]', 'form'
                                    ];
                                    selectors.forEach(sel => {
                                        document.querySelectorAll(sel).forEach(el => el.style.setProperty('display', 'none', 'important'));
                                    });
                                }""")
                                time.sleep(0.5)
                            except Exception:
                                pass
                                
                            target_img.screenshot(path=output_path)
                            
                            # --- NETTOYAGE DES MÉTADONNÉES AI ---
                            strip_metadata(output_path)
                            
                            page.close()
                            return True
                    else:
                        print(f"[ChatGPT] [WARN] Tentative {attempt}/{max_attempts} : Timeout de {timeout}s atteint.")
                        page.screenshot(path=f"debug_chatgpt_timeout_attempt_{attempt}.png", full_page=True)
                        page.close()
                        
                except Exception as attempt_err:
                    print(f"[ChatGPT] [WARN] Erreur lors de la tentative {attempt}/{max_attempts} : {attempt_err}")
                    try:
                        page.close()
                    except:
                        pass
                        
            # Si toutes les tentatives ont échoué
            print("[ChatGPT] [ERROR] Toutes les tentatives d'upscaling ont echoue.")
            return False
            
    except Exception as e:
        print(f"[ChatGPT] [ERROR] Erreur majeure lors de l'automatisation ChatGPT : {e}")
        return False

if __name__ == "__main__":
    # Test rapide si lance directement - recherche dynamique
    import glob
    selfies = glob.glob(r"D:\AntiGravity\02 Projects\Business Vinted\Output_Listings\*\selfie.jpg")
    if selfies:
        test_in = selfies[0]
        test_out = test_in.replace("selfie.jpg", "selfie_upscaled.jpg")
        upscale_image_with_chatgpt(test_in, test_out)
    else:
        print("[ChatGPT] Aucun selfie trouve pour le test.")
