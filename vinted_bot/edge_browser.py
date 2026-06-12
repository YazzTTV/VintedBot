"""
Module partage : gestion de la connexion Edge via CDP.
Importe ce module dans processor.py et image_generator.py.
"""
import os
import time
import subprocess
import requests

CDP_URL       = "http://127.0.0.1:9222"
EDGE_PATH_X86 = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
EDGE_PATH_X64 = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
USER_DATA_DIR  = r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\Bot_Profile"
# AVATAR_PATH et FLOOR_TEMPLATE_PATH sont désormais gérés dynamiquement via config_manager.py


# Selecteurs Gemini identifies par debug en live
PLUS_BUTTON_SELECTOR  = 'button[aria-label="Importation et outils"]'
PLUS_BUTTON_FALLBACKS = [
    'button[aria-label*="Importation" i]',
    'button[aria-label*="outils" i]',
    'button[aria-label*="Ouvrir le menu \\"Importer un fichier\\""]',
    'button[aria-label*="Importer un fichier" i]',
    'button[aria-label*="Import" i]',
    'button[aria-label*="fichier" i]',
]
LOCAL_FILES_SELECTOR  = '[data-test-id="local-images-files-uploader-button"]'
CHATBOX_SELECTORS     = [
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"]',
]
SEND_BUTTON_SELECTOR  = 'button[aria-label="Envoyer un message"]'


def is_debugging_active() -> bool:
    try:
        r = requests.get(f"{CDP_URL}/json/version", timeout=1)
        return r.status_code == 200
    except Exception:
        return False


def start_edge(headless: bool = False) -> bool:
    if is_debugging_active():
        return True
    print(f"[Edge] Demarrage du navigateur Edge (mode fantome, headless={headless})...")
    edge_path = EDGE_PATH_X86 if os.path.exists(EDGE_PATH_X86) else EDGE_PATH_X64
    if not os.path.exists(edge_path):
        print("[Edge] ERREUR : executable Edge introuvable.")
        return False
        
    cmd = [edge_path, f"--user-data-dir={USER_DATA_DIR}", "--remote-debugging-port=9222"]
    
    if headless:
        # Replace --headless=new with off-screen positioning to bypass Cloudflare
        cmd.append("--window-position=-32000,-32000")
        cmd.append("--window-size=1920,1080")
        cmd.append("--disable-backgrounding-occluded-windows")
        cmd.append("--disable-renderer-backgrounding")
        cmd.append("--disable-background-timer-throttling")
        
    subprocess.Popen(cmd)
    time.sleep(4)
    return True


def disable_reasoning_if_active(page) -> bool:
    """
    Détecte et désactive automatiquement le mode 'Raisonnement' (Thinking) de Gemini Advanced
    pour forcer le retour à un modèle standard (comme Flash) qui autorise la génération d'images.
    """
    try:
        # Liste de sélecteurs pour localiser le sélecteur de modèle / bouton raisonnement
        reasoning_selectors = [
            'button:has-text("Raisonnement")',
            'button:has-text("Reasoning")',
            '[aria-label*="Raisonnement" i]',
            '[aria-label*="Reasoning" i]',
            'span:has-text("Raisonnement")',
        ]
        
        target = None
        for sel in reasoning_selectors:
            try:
                el = page.locator(sel).first
                if el.is_visible(timeout=1500):
                    target = el
                    break
            except Exception:
                continue
                
        if target:
            print("[Edge] Mode 'Raisonnement' détecté. Tentative de désactivation pour débloquer l'IA Générative...")
            target.click()
            time.sleep(1.5)
            
            # Options pour désactiver (basculer vers Flash ou cliquer sur le bouton "Désactiver")
            disable_options = [
                'button:has-text("Désactiver")',
                'span:has-text("Désactiver")',
                'text="Désactiver"',
                'text="Gemini Flash"',
                'span:has-text("Flash")',
                '[role="option"]:has-text("Flash")',
            ]
            
            for opt in disable_options:
                try:
                    opt_el = page.locator(opt).first
                    if opt_el.is_visible(timeout=1000):
                        opt_el.click()
                        print("[Edge] [SUCCÈS] Mode raisonnement désactivé avec succès.")
                        time.sleep(2)
                        return True
                except Exception:
                    continue
            
            # En cas d'échec, refermer le menu
            page.keyboard.press("Escape")
            
    except Exception as e:
        print(f"[Edge] Note routine raisonnement : {e}")
    return False


def open_gemini_page(playwright) -> tuple:
    """
    Connecte au CDP Edge, ouvre une nouvelle page Gemini et la retourne.
    Retourne (browser, page) ou leve une exception.
    """
    browser = playwright.chromium.connect_over_cdp(CDP_URL)
    context = browser.contexts[0]
    page = context.new_page()
    page.goto("https://gemini.google.com/app", timeout=60000)
    time.sleep(6)
    
    # NOUVEAU : Routine anti-blocage Raisonnement
    disable_reasoning_if_active(page)
    
    return browser, page


def upload_files(page, file_paths: list[str]) -> bool:
    """
    Upload une liste de fichiers dans Gemini.
    Tente d'abord l'injection directe (input type file), puis la methode par clic.
    """
    try:
        # METHODE 1 : Injection directe (tres rapide) via le DOM
        file_inputs = page.locator('input[type="file"]')
        if file_inputs.count() > 0:
            try:
                # set_files fonctionne meme sur les inputs caches
                file_inputs.last.set_files(file_paths, timeout=2000)
                time.sleep(2)
                print("[Edge] Upload reussi via input direct.")
                return True
            except Exception:
                pass
    except Exception:
        pass

    # METHODE 2 : Clic sur le bouton '+' puis sur le menu d'upload
    all_plus = [PLUS_BUTTON_SELECTOR] + PLUS_BUTTON_FALLBACKS + [
        'button[aria-label*="Ajouter" i]',
        'button[aria-label*="Add" i]',
        'button[aria-label*="Upload" i]',
        'button[mattooltip*="Ajouter" i]',
        'button:left-of(rich-textarea)'
    ]
    plus_clicked = False
    for sel in all_plus:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=1000):
                el.click()
                plus_clicked = True
                break
        except Exception:
            continue

    if not plus_clicked:
        page.screenshot(path="debug_no_plus.png")
        print("[Edge] ERREUR : bouton '+' introuvable.")
        return False

    time.sleep(1.5)

    # Etape 2 : clic 'Importer des fichiers' + file chooser
    upload_menu_selectors = [
        LOCAL_FILES_SELECTOR,
        '[data-test-id*="upload" i]',
        'li:has-text("Importer")',
        'li:has-text("Upload")',
        'menu-item:has-text("Importer")',
        'menu-item:has-text("Upload")',
        '[aria-label*="Importer depuis cet appareil" i]',
        'span:has-text("Importer depuis cet appareil")'
    ]
    
    for sel in upload_menu_selectors:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=1000):
                with page.expect_file_chooser(timeout=8000) as fc_info:
                    el.click()
                fc_info.value.set_files(file_paths)
                time.sleep(4)
                print("[Edge] Upload reussi via le menu.")
                return True
        except Exception as e:
            continue
            
    print("[Edge] ERREUR : Menu d'importation introuvable apres le clic sur le '+'.")
    page.screenshot(path="debug_upload_fail.png")
    return False


def type_and_send(page, text: str) -> None:
    """Ecrit le texte dans la chatbox et envoie avec Entree."""
    for sel in CHATBOX_SELECTORS:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=2000):
                el.click()
                time.sleep(0.3)
                page.keyboard.insert_text(text)
                time.sleep(0.3)
                page.keyboard.press("Enter")
                return
        except Exception:
            continue
    print("[Edge] ERREUR : chatbox introuvable.")


def wait_for_response(page, timeout_s: int = 60) -> None:
    """
    Attend que Gemini ait fini de generer sa reponse de maniere ultra-robuste.
    Se base sur l'apparition/disparition du bouton d'arrêt et la stabilisation du texte.
    """
    print(f"[Edge] Attente de la reponse Gemini (max {timeout_s}s)...")
    time.sleep(3)  # Laisse le temps a l'interface de passer en mode generation
    start = time.time()
    
    last_len = 0
    stable_count = 0
    
    while time.time() - start < timeout_s:
        try:
            # 1. Si le bouton d'arrêt (Stop/Arrêter) est visible, c'est que ça génère encore
            is_generating = False
            for stop_sel in ['button[aria-label*="Arrêter" i]', 'button[aria-label*="Stop" i]', 'button[aria-label*="arrê" i]']:
                try:
                    if page.locator(stop_sel).first.is_visible(timeout=100):
                        is_generating = True
                        break
                except Exception:
                    pass
            
            if is_generating:
                stable_count = 0
                time.sleep(1)
                continue
                
            # 2. Si l'indicateur de stop n'est pas visible, on surveille la longueur de la réponse et la présence d'images
            current_text = get_last_response_text(page)
            current_len = len(current_text)
            
            # Détection ultra-rapide si une image est déjà générée dans la dernière réponse
            has_image = False
            try:
                responses = page.locator("message-content")
                count = responses.count()
                if count > 0:
                    last = responses.nth(count - 1)
                    if last.locator("img").count() > 0:
                        has_image = True
            except Exception:
                pass
                
            if has_image:
                print("[Edge] Image detectee dans la reponse. Generation terminee.")
                return
                
            if current_len > 0:
                if current_len == last_len:
                    stable_count += 1
                else:
                    stable_count = 0
                    last_len = current_len
                
                # Si le texte n'a pas bougé pendant 3 itérations (environ 3 secondes), la génération est finie !
                if stable_count >= 3:
                    print(f"[Edge] Reponse stabilisee ({current_len} caracteres). Generation terminee.")
                    return
            else:
                stable_count = 0
                
            # 3. Fallback : Si le bouton d'envoi redevient visible et actif (au cas où le texte n'est pas récupérable)
            send_selectors = [
                'button[aria-label="Envoyer un message"]',
                'button[aria-label*="Envoyer" i]',
                'button[aria-label*="Send" i]',
                SEND_BUTTON_SELECTOR
            ]
            for send_sel in send_selectors:
                try:
                    btn = page.locator(send_sel).first
                    if btn.is_visible(timeout=100) and btn.is_enabled():
                        print("[Edge] Bouton d'envoi actif. Generation terminee.")
                        return
                except Exception:
                    pass
                    
        except Exception:
            pass
        time.sleep(1)
        
    print("[Edge] Timeout : reponse non detectee, on continue quand meme.")


def get_last_response_text(page) -> str:
    """Recupere le texte de la derniere reponse de Gemini."""
    try:
        responses = page.locator("message-content")
        count = responses.count()
        if count == 0:
            return ""
        last = responses.nth(count - 1)
        return last.inner_text().strip()
    except Exception as e:
        print(f"[Edge] Erreur extraction texte : {e}")
        return ""
