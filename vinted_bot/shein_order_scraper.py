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
            import urllib.parse
            
            # Scroll vers le bas pour forcer le lazy-loading des anciennes commandes
            print("[SheinScraper] Défilement de la page pour charger toutes les commandes...")
            for _ in range(4):
                page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                time.sleep(2)
            
            # Trouver tous les éléments contenant "Suivre"
            # On cherche de manière large, puis on filtrera
            all_suivre = page.locator('text="Suivre"').all()
            
            valid_btns = []
            for el in all_suivre:
                # Exclure les liens de FAQ "Comment suivre ma commande"
                href = el.get_attribute("href")
                if href and "How-to-track-my-order" in href:
                    continue
                    
                # Vérifier que c'est un bouton ou un lien cliquable
                tag_name = el.evaluate("el => el.tagName").lower()
                role = el.get_attribute("role")
                if tag_name in ['a', 'button'] or role == 'button':
                    valid_btns.append(el)
            
            print(f"[SheinScraper] {len(valid_btns)} boutons 'Suivre' valides trouvés.")
            
            for i, btn in enumerate(valid_btns):
                print(f"\n[SheinScraper] Traitement de la commande {i+1}/{len(valid_btns)}...")
                try:
                    # Extraction du titre, URL et prix via JS (robuste car remonte le DOM)
                    data_js = btn.evaluate('''el => {
                        let root = el.closest('.order-item') || el.closest('li') || el.closest('tr') || el.closest('.goods');
                        if (!root) return {title: "Article Shein", url: null, price: null, productId: null};
                        
                        let title = "Article Shein";
                        let url = null;
                        let price = null;
                        let productId = null;
                        
                        // Extraction du prix
                        let priceEl = root.querySelector('.default-price') || root.querySelector('.goods-price') || root.querySelector('.price');
                        if (priceEl) {
                            let priceText = priceEl.innerText.trim();
                            priceText = priceText.replace('€', '').replace(',', '.').replace(' ', '').trim();
                            price = parseFloat(priceText);
                            if (isNaN(price)) price = null;
                        }
                        
                        // Récupération de l'URL et du Product ID d'abord (Matching plus robuste)
                        let links = Array.from(root.querySelectorAll('a'));
                        let productLink = links.find(a => a.href && a.href.includes('-p-'));
                        if (productLink) {
                            url = productLink.href;
                            let match = url.match(/-p-(\d+)/);
                            if (match) productId = match[1];
                        }
                        
                        // Stratégie 1 : l'attribut alt de l'image du produit contient toujours le titre complet
                        let imgs = Array.from(root.querySelectorAll('img[alt]'));
                        let productImg = imgs.find(img => img.alt && img.alt.length > 10 && !img.alt.includes('logo'));
                        if (productImg) {
                            title = productImg.alt.trim();
                            // Trouver le lien
                            if (!url) {
                                let parentA = productImg.closest('a');
                                if (parentA && parentA.href) {
                                    url = parentA.href;
                                    let match = url.match(/-p-(\d+)/);
                                    if (match) productId = match[1];
                                }
                            }
                        }
                        
                        // Stratégie 2 : Fallback texte
                        if (title === "Article Shein") {
                            let textContent = root.innerText || "";
                            textContent = textContent.replace(/\\u200B/g, ''); // Retire les zero-width spaces
                            
                            let lines = textContent.split('\\n').map(l => l.trim()).filter(l => l.length > 15 && !l.toLowerCase().includes('suivre') && !l.toLowerCase().includes('trouver mon') && !l.toLowerCase().includes('expédié') && !l.toLowerCase().includes('commande') && !l.toLowerCase().includes('retour'));
                            lines.sort((a, b) => b.length - a.length);
                            if (lines.length > 0) title = lines[0];
                        }
                        
                        return {title: title, url: url, price: price, productId: productId};
                    }''')
                    
                    title = data_js.get("title", "Article Shein")
                    product_url = data_js.get("url", None)
                    product_price = data_js.get("price", None)
                    product_id = data_js.get("productId", None)
                    safe_title = title.encode('cp1252', 'replace').decode('cp1252')
                    print(f" -> Titre identifié : {safe_title[:50]}")
                    if product_price is not None:
                        print(f" -> Prix achat extrait : {product_price}€")
                    print(f" -> Clic sur 'Suivre'...")
                    
                    # On s'assure que le bouton est visible avant de cliquer
                    btn.scroll_into_view_if_needed()
                    time.sleep(1)
                    
                    with context.expect_page(timeout=15000) as new_page_info:
                        btn.click()
                    
                    track_page = new_page_info.value
                    track_page.wait_for_load_state("domcontentloaded")
                    time.sleep(3)
                    
                    url = track_page.url
                    print(f" -> Nouvelle page ouverte : {url}")
                    
                    # Extraire le numéro de commande de l'URL (billno=...)
                    parsed = urllib.parse.urlparse(url)
                    qs = urllib.parse.parse_qs(parsed.query)
                    order_num = qs.get("billno", [None])[0]
                    
                    if not order_num:
                        print(" -> Impossible de trouver le numéro de commande dans l'URL. Ignoré.")
                        track_page.close()
                        continue
                        
                    print(f" -> Commande identifiée : {order_num}")
                    
                    # Extraire le transporteur et numéro de suivi
                    body_text = track_page.locator('body').inner_text()
                    regex = r'(colissimo|mondial relay|dpd|chronopost|gls|bpost|cainiao|relais colis)[\s:\-]*([A-Z0-9]{8,25})'
                    match_track = re.search(regex, body_text, re.IGNORECASE)
                    
                    carrier = "Inconnu"
                    tracking_num = ""
                    
                    if match_track:
                        carrier = match_track.group(1).strip()
                        tracking_num = match_track.group(2).strip()
                    else:
                        copier_el = track_page.locator('text="Copier"').first
                        if copier_el.is_visible(timeout=2000):
                            parent_text = copier_el.locator('xpath=..').inner_text()
                            match_alt = re.search(r'([A-Z0-9]{8,25})', parent_text)
                            if match_alt:
                                tracking_num = match_alt.group(1).strip()
                                
                    track_page.close()
                    
                    if not product_url and order_num:
                        print(f" -> Récupération de l'URL produit via les détails...")
                        detail_url = f"https://fr.shein.com/user/orders/detail/{order_num}"
                        detail_page = context.new_page()
                        try:
                            detail_page.goto(detail_url)
                            detail_page.wait_for_load_state("domcontentloaded", timeout=10000)
                            detail_page.wait_for_timeout(2000)
                            product_url = detail_page.evaluate('''() => {
                                let links = Array.from(document.querySelectorAll('a')).map(a => a.href);
                                let pLink = links.find(href => href && href.includes('-p-') && href.includes('.html'));
                                return pLink || null;
                            }''')
                        except Exception as e:
                            print(f" -> Erreur lors de la récupération du détail: {e}")
                        finally:
                            detail_page.close()
                            
                    if product_url:
                        print(f" -> Lien Produit  : {product_url.split('?')[0]}")
                        if not product_id:
                            pid_match = re.search(r'-p-(\d+)', product_url)
                            if pid_match:
                                product_id = pid_match.group(1)
                    
                    if tracking_num:
                        print(f" -> Succès : Transporteur={carrier}, Suivi={tracking_num}")
                        extracted_data.append({
                            "orderNumber": order_num,
                            "title": title,  # Titre exact récupéré !
                            "productUrl": product_url,
                            "productId": product_id,
                            "price": product_price,
                            "trackingNumber": tracking_num,
                            "carrier": carrier
                        })
                    else:
                        print(" -> Aucun numéro de suivi extrait.")
                        
                except Exception as e:
                    print(f" -> Erreur lors du traitement du bouton : {e}")
            
            print(f"\n[SheinScraper] Bilan : {len(extracted_data)} numéros de suivi extraits.")
            
            if extracted_data:
                payload = {"orders": extracted_data}
                try:
                    print(f"[SheinScraper] Envoi des données vers le Vinted Manager ({API_SYNC_URL})")
                    import json
                    success = False
                    for attempt in range(3):
                        try:
                            res = requests.post(API_SYNC_URL, json=payload, timeout=15)
                            if res.status_code == 200:
                                print("[SheinScraper] [SUCCES] Synchronisation reussie !")
                                success = True
                                break
                            else:
                                print(f"[SheinScraper] [ECHEC] API a retourne : {res.status_code} - {res.text}")
                        except Exception as e:
                            print(f"[SheinScraper] [ERREUR] Tentative {attempt+1}/3 échouée : {e}")
                        
                        if attempt < 2:
                            time.sleep(3)
                            
                    if not success:
                        print(f"[SheinScraper] [ERREUR FATALE] Impossible de synchroniser après 3 tentatives. Sauvegarde locale...")
                        try:
                            with open("failed_payload.json", "w", encoding="utf-8") as f:
                                json.dump(payload, f, ensure_ascii=False, indent=2)
                            print("[SheinScraper] Données sauvegardées dans failed_payload.json")
                        except Exception as e:
                            print(f"[SheinScraper] Erreur lors de la sauvegarde locale : {e}")
                except Exception as e:
                    print(f"[SheinScraper] [ERREUR] Erreur inattendue : {e}")
            
            page.close()
        except Exception as e:
            print(f"[SheinScraper] Erreur fatale : {e}")

if __name__ == "__main__":
    scrape_shein_orders()
