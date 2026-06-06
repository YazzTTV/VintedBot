import os
import time
import requests
from playwright.sync_api import sync_playwright

CDP_URL = "http://127.0.0.1:9222"
EDGE_PATH_X86 = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
EDGE_PATH_X64 = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
USER_DATA_DIR  = r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\Bot_Profile"
API_SYNC_URL = "http://localhost:3000/api/tracking/sync"

def is_debugging_active() -> bool:
    try:
        r = requests.get(f"{CDP_URL}/json/version", timeout=1)
        return r.status_code == 200
    except Exception:
        return False

def start_edge() -> bool:
    if is_debugging_active():
        return True
    print("[SheinScraper] Démarrage du navigateur (profil persistant)...")
    edge_path = EDGE_PATH_X86 if os.path.exists(EDGE_PATH_X86) else EDGE_PATH_X64
    if not os.path.exists(edge_path):
        print("[SheinScraper] Erreur : exécutable introuvable.")
        return False
        
    import subprocess
    subprocess.Popen([edge_path, f"--user-data-dir={USER_DATA_DIR}", "--remote-debugging-port=9222"])
    time.sleep(5)
    return True

def scrape_shein_orders():
    if not start_edge():
        return
        
    with sync_playwright() as p:
        try:
            print("[SheinScraper] Connexion au navigateur...")
            browser = p.chromium.connect_over_cdp(CDP_URL)
            context = browser.contexts[0]
            page = context.new_page()
            
            print("[SheinScraper] Navigation vers Mes Commandes Shein...")
            page.goto("https://fr.shein.com/user/orders/list", timeout=60000)
            
            # Attendre que l'utilisateur soit connecté et que la page charge
            page.wait_for_load_state("networkidle", timeout=15000)
            time.sleep(3)
            
            # Vérification de connexion
            if "login" in page.url:
                print("[SheinScraper] ⚠️ Attention : Vous n'êtes pas connecté à Shein sur ce profil.")
                print("Veuillez vous connecter manuellement une fois pour que le profil le retienne.")
                page.close()
                return

            print("[SheinScraper] Extraction des données...")
            extracted_data = []
            
            # Sélecteurs génériques (à affiner selon le DOM Shein actuel en live)
            # Shein regroupe généralement les commandes dans des blocs
            orders = page.locator('.order-list-item, .order-item, .order-card').all()
            
            for order in orders:
                try:
                    # Récupération du titre
                    title_el = order.locator('.goods-title, .product-title, .goods-name').first
                    title = title_el.inner_text().strip() if title_el.is_visible() else ""
                    
                    # Récupération du numéro de suivi
                    tracking_num = ""
                    # Option 1 : Numéro affiché directement
                    track_text_el = order.locator('.tracking-num, .track-number').first
                    if track_text_el.is_visible():
                        tracking_num = track_text_el.inner_text().strip()
                    else:
                        # Option 2 : Bouton 'Suivi' -> parfois l'ID est dans un attribut data ou URL
                        track_btn = order.locator('a:has-text("Suivi"), button:has-text("Suivi")').first
                        if track_btn.is_visible():
                            href = track_btn.get_attribute('href')
                            if href and "tracking" in href:
                                tracking_num = href.split("=")[-1] # Heuristique simple
                                
                    if title and tracking_num:
                        extracted_data.append({
                            "title": title,
                            "trackingNumber": tracking_num
                        })
                except Exception as e:
                    pass
            
            print(f"[SheinScraper] {len(extracted_data)} commandes avec numéro de suivi trouvées.")
            
            if extracted_data:
                try:
                    print(f"[SheinScraper] Envoi des données vers le Vinted Manager ({API_SYNC_URL})")
                    res = requests.post(API_SYNC_URL, json={"orders": extracted_data})
                    if res.status_code == 200:
                        print("[SheinScraper] ✔️ Synchronisation réussie !")
                    else:
                        print(f"[SheinScraper] ❌ Échec API : {res.status_code}")
                except Exception as e:
                    print(f"[SheinScraper] ❌ Erreur réseau lors de la synchronisation : {e}")
            
            page.close()
        except Exception as e:
            print(f"[SheinScraper] Erreur fatale : {e}")

if __name__ == "__main__":
    scrape_shein_orders()
