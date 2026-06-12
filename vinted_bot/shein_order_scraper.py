import os
import time
import requests
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv

load_dotenv()

CDP_URL = "http://127.0.0.1:9222"
EDGE_PATH_X86 = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
EDGE_PATH_X64 = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
USER_DATA_DIR  = r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\Bot_Profile"

# Utilise l'URL Vercel si configurée dans .env, sinon localhost par défaut
MANAGER_URL = os.getenv("VINTED_MANAGER_URL", "http://localhost:3000").rstrip("/")
API_SYNC_URL = f"{MANAGER_URL}/api/tracking/sync"


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
            try:
                page.wait_for_load_state("domcontentloaded", timeout=15000)
                # Attente explicite d'un élément de commande pour éviter le networkidle infini
                page.wait_for_selector('text=/Numéro de commande/i', timeout=15000)
            except Exception as e:
                print(f"[SheinScraper] Info : Fin d'attente du chargement")
            time.sleep(1)
            
            # Vérification de connexion
            if "login" in page.url:
                print("[SheinScraper] ⚠️ Attention : Vous n'êtes pas connecté à Shein sur ce profil.")
                print("Veuillez vous connecter manuellement une fois pour que le profil le retienne.")
                page.close()
                return

            print("[SheinScraper] Extraction des données...")
            extracted_data = []
            
            import re
            
            # Chercher tous les en-têtes contenant le numéro de commande
            # Souvent encapsulé dans une balise <span> ou <div>
            order_headers = page.locator(r'text=/(?:Numéro de commande|Order number)\s*[A-Z0-9]+/i').all()
            
            print(f"[SheinScraper] {len(order_headers)} en-têtes de commande potentiels trouvés.")
            
            # Récupérer toutes les URL de suivi d'un coup avec une logique ascendante (bottom-up) robuste
            # On cherche tous les boutons "Suivre", puis on remonte leur arbre DOM jusqu'à trouver le numéro de commande.
            tracking_urls_map = page.evaluate("""() => {
                let results = {};
                let btns = Array.from(document.querySelectorAll('a, button, div[role="button"]'))
                    .filter(b => {
                        let text = b.innerText ? b.innerText.toLowerCase() : '';
                        return text.includes('suivre') || text.includes('follow') || text.includes('suivi');
                    });
                    
                for (let btn of btns) {
                    let parent = btn.parentElement;
                    let orderNum = null;
                    let title = "Article";
                    while(parent && parent.tagName !== 'BODY') {
                        let text = parent.innerText || "";
                        let match = text.match(/(?:Num\\u00e9ro de commande|Order number)\\s*([A-Z0-9]+)/i);
                        if (match) {
                            orderNum = match[1];
                            let nameEl = parent.querySelector('[class*="name"], [class*="title"]');
                            if (nameEl) {
                                title = nameEl.innerText.trim();
                            } else {
                                let aTags = parent.querySelectorAll('a');
                                for(let a of aTags) {
                                    if(a.innerText && a.innerText.length > 15 && !a.innerText.toLowerCase().includes('suivre')) {
                                        title = a.innerText.trim();
                                        break;
                                    }
                                }
                            }
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    
                    let a = btn.tagName === 'A' ? btn : btn.closest('a');
                    if (!a) {
                        let parentA = btn.parentElement ? btn.parentElement.closest('a') : null;
                        if (parentA) a = parentA;
                    }
                    
                    let url = a ? a.href : (btn.href || btn.getAttribute('data-href') || null);
                    if (orderNum && url && !url.includes('javascript:')) {
                        if (!results[orderNum]) {
                            results[orderNum] = { url: url, title: title };
                        }
                    }
                }
                return results;
            }""")

            for header in order_headers:
                try:
                    header_text = header.inner_text()
                    match_order = re.search(r'(?:Numéro de commande|Order number)\s*([A-Z0-9]+)', header_text, re.IGNORECASE)
                    if not match_order:
                        continue
                        
                    order_num = match_order.group(1)
                    print(f"\n[SheinScraper] Traitement commande : {order_num}")
                    
                    tracking_info = tracking_urls_map.get(order_num)
                    
                    if not tracking_info:
                        print(" -> Bouton 'Suivre' introuvable ou URL invalide.")
                        continue
                        
                    tracking_url = tracking_info["url"]
                    item_title = tracking_info["title"]
                    
                    print(f" -> Suivi détecté : {tracking_url}")
                    # Création d'un nouvel onglet pour la page de suivi
                    track_page = context.new_page()
                    tracking_num = ""
                    carrier = "Inconnu"
                    
                    try:
                        if tracking_url:
                            track_page.goto(tracking_url, timeout=30000)
                        else:
                            # Fallback risqué : Clic avec Control pour forcer le nouvel onglet
                            with context.expect_page(timeout=10000) as new_page_info:
                                suivre_btn.click(modifiers=["Control"])
                            track_page.close()
                            track_page = new_page_info.value
                            
                        try:
                            track_page.wait_for_load_state("domcontentloaded", timeout=15000)
                            track_page.wait_for_selector('text="Copier"', timeout=10000)
                        except Exception:
                            pass
                        track_page.wait_for_timeout(1000)
                        
                        # Extraire le numéro de suivi (Recherche Regex globale sur le texte de la page)
                        # C'est la méthode la plus robuste car la structure HTML change souvent.
                        body_text = track_page.locator('body').inner_text()
                        
                        # Liste des transporteurs possibles
                        regex = r'(colissimo|mondial relay|dpd|chronopost|gls|bpost|cainiao|relais colis)\s*([A-Z0-9]{8,25})'
                        match_track = re.search(regex, body_text, re.IGNORECASE)
                        
                        if match_track:
                            carrier = match_track.group(1).strip()
                            tracking_num = match_track.group(2).strip()
                        else:
                            # Tentative alternative de trouver juste une chaîne qui ressemble à un suivi classique à côté de "Copier"
                            copier_el = track_page.locator('text="Copier"').first
                            if copier_el.is_visible(timeout=2000):
                                parent_text = copier_el.locator('xpath=..').inner_text()
                                match_alt = re.search(r'([A-Z0-9]{8,25})', parent_text)
                                if match_alt:
                                    tracking_num = match_alt.group(1).strip()
                                
                    except Exception as e:
                        print(f" -> Erreur lors du chargement de la page de suivi : {e}")
                    finally:
                        if not track_page.is_closed():
                            track_page.close()
                            
                    if tracking_num:
                        print(f" -> Succès : Transporteur={carrier}, Suivi={tracking_num}")
                        extracted_data.append({
                            "orderNumber": order_num,
                            "title": item_title,
                            "trackingNumber": tracking_num,
                            "carrier": carrier
                        })
                    else:
                        print(" -> Aucun numéro de suivi extrait.")
                        
                except Exception as e:
                    print(f" -> Erreur générale sur cette commande : {e}")
            
            print(f"\n[SheinScraper] Bilan : {len(extracted_data)} numéros de suivi extraits.")
            
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
