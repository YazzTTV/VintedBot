"""
Test complet du flow upload en 2 etapes :
1. Clic sur '+' -> ouvre sous-menu
2. Clic sur 'Importer des fichiers' -> file chooser intercepte
Lance avec : python test_upload_only.py
"""
import sys
# On tente de configurer utf-8, mais on nettoie quand meme les accents pour la console Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except:
    pass

import os
import time
import subprocess
import requests
from playwright.sync_api import sync_playwright

CDP_URL        = "http://127.0.0.1:9222"
EDGE_PATH_X86  = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
EDGE_PATH_X64  = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
USER_DATA_DIR  = r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\Bot_Profile"
AVATAR_PATH    = r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\avatar.jpg"
PRODUCT_PATH   = AVATAR_PATH  # Pour le test, on utilise l'avatar comme produit aussi

PLUS_SELECTOR  = 'button[aria-label="Ouvrir le menu \\"Importer un fichier\\""]'
LOCAL_FILES_SELECTORS = [
    '[data-test-id="local-images-files-uploader-button"]',
    'button[aria-label*="Importer des fichiers" i]',
    '[role="menuitem"][aria-label*="Importer des fichiers" i]',
]

def is_debugging_active():
    try:
        return requests.get(f"{CDP_URL}/json/version", timeout=1).status_code == 200
    except:
        return False

def start_edge():
    if is_debugging_active():
        print("[Test] Edge deja actif.")
        return
    edge_path = EDGE_PATH_X86 if os.path.exists(EDGE_PATH_X86) else EDGE_PATH_X64
    subprocess.Popen([edge_path, f"--user-data-dir={USER_DATA_DIR}", "--remote-debugging-port=9222"])
    time.sleep(4)

start_edge()

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP_URL)
    context = browser.contexts[0]
    page = context.new_page()

    print("[Test] Navigation vers Gemini...")
    page.goto("https://gemini.google.com/app", timeout=60000)
    time.sleep(6)

    # ETAPE 1 : Clic sur "+" -> ouvre le sous-menu
    print(f"\n[Etape 1] Clic sur bouton '+' ...")
    plus_btn = page.locator(PLUS_SELECTOR).first
    if not plus_btn.is_visible(timeout=3000):
        print("[Etape 1] ECHEC : bouton '+' non visible.")
        page.screenshot(path="debug_fail.png")
        page.close()
        exit(1)

    plus_btn.click()
    print("[Etape 1] OK. Attente sous-menu (2s)...")
    time.sleep(2)

    # ETAPE 2 : Clic sur "Importer des fichiers" + interception file chooser
    print("\n[Etape 2] Clic sur 'Importer des fichiers' + interception file chooser...")
    uploaded = False

    for sel in LOCAL_FILES_SELECTORS:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=3000):
                print(f"[Etape 2] Option trouvee avec : {sel}")
                with page.expect_file_chooser(timeout=8000) as fc_info:
                    el.click()
                file_chooser = fc_info.value
                file_chooser.set_files([AVATAR_PATH, PRODUCT_PATH])
                print("[Etape 2] SUCCES ! Images injectees. Attente des previews (5s)...")
                time.sleep(5)
                page.screenshot(path="debug_after_upload.png")
                print("[Etape 2] Screenshot sauvegarde : debug_after_upload.png")
                print("=> Verifie que les 2 images apparaissent en preview dans le screenshot !")
                uploaded = True
                break
        except Exception as e:
            print(f"[Etape 2] Selecteur '{sel}' echoue : {e}")
            continue

    if not uploaded:
        page.screenshot(path="debug_upload_fail.png")
        print("[Etape 2] ECHEC. Screenshot : debug_upload_fail.png")

    page.close()

print("\nTest termine.")
