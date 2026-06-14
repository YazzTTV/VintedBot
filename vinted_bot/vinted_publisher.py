import os
import time
import argparse
import sys
import subprocess
from playwright.sync_api import sync_playwright
from config_manager import get_account_config

# Plus de CDP_URL fixe, on lance Brave dynamiquement

BRAVE_PATH = r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"


def _restart_brave(cdp_port: int, profile: str) -> None:
    """Kill all Brave processes on the given CDP port, then relaunch with the correct profile."""
    print(f"[Publisher] Redémarrage de Brave (port {cdp_port}, profil {profile})...")
    # Kill existing Brave processes that use this CDP port
    try:
        # Tuer uniquement l'instance Brave qui ecoute sur ce port CDP
        cmd_kill = f"Get-WmiObject Win32_Process | Where-Object {{ $_.Name -eq 'brave.exe' -and $_.CommandLine -match '--remote-debugging-port={cdp_port}' }} | ForEach-Object {{ Stop-Process -Id $_.ProcessId -Force }}"
        subprocess.run(
            ["powershell", "-Command", cmd_kill],
            capture_output=True, timeout=10
        )
    except Exception:
        pass
    time.sleep(3)

    # Relaunch Brave with the correct profile and CDP port
    brave_path = BRAVE_PATH
    if not os.path.exists(brave_path):
        brave_path = r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe"

    cmd = [
        brave_path,
        f"--remote-debugging-port={cdp_port}",
        f"--profile-directory={profile}",
        "--disable-features=HighEfficiencyModeAvailable,BatterySaverModeAvailable,Discarding,RestoreSession",
        "--disable-session-crashed-bubble",
        "--disable-infobars",
        "--hide-crash-restore-bubble",
        "--disable-renderer-backgrounding",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "about:blank"
    ]
    subprocess.Popen(cmd)
    print(f"[Publisher] Brave relancé. Attente de 8s pour le démarrage complet...")
    time.sleep(8)

def find_vinted_master_page(browser, account_name: str):
    target_marker = f"bot_profile={account_name.lower()}"
    for context in browser.contexts:
        for page in context.pages:
            try:
                if target_marker in page.url:
                    return page
            except Exception:
                pass
    return None

def publish_listing(account_name: str, product_dir: str, auto_submit: bool = False, save_draft: bool = False):
    config = get_account_config(account_name)
    
    # 1. Vérification des fichiers d'entrée
    titre_path = os.path.join(product_dir, "titre.txt")
    desc_path = os.path.join(product_dir, "description.txt")
    
    if not os.path.exists(titre_path) or not os.path.exists(desc_path):
        print(f"[Publisher] [ERROR] Fichiers titre.txt ou description.txt introuvables dans {product_dir}")
        return False
        
    with open(titre_path, "r", encoding="utf-8") as f:
        titre = f.read().strip()
    with open(desc_path, "r", encoding="utf-8") as f:
        description = f.read().strip()
        
    # Liste des images humanisées (ou brutes si non humanisées)
    images = []
    image_names = ["selfie_upscaled.jpg", "profile_upscaled.jpg", "selfie_hand_in_hair_upscaled.jpg", "flat_lay_upscaled.jpg", "hanger_upscaled.jpg", "folded_upscaled.jpg"]
    # Fallbacks si pas d'image upscalée
    fallback_names = ["selfie.jpg", "profile.jpg", "selfie_hand_in_hair.jpg", "flat_lay.jpg", "hanger.jpg", "folded.jpg"]
    
    for name in image_names:
        img_path = os.path.join(product_dir, name)
        if os.path.exists(img_path):
            images.append(img_path)
            
    if not images:
        for name in fallback_names:
            img_path = os.path.join(product_dir, name)
            if os.path.exists(img_path):
                images.append(img_path)
                
    # Si toujours rien, on liste toutes les images du dossier
    if not images:
        for f in os.listdir(product_dir):
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                images.append(os.path.join(product_dir, f))
                
    if not images:
        print(f"[Publisher] [ERROR] Aucune image trouvée dans {product_dir}")
        return False
        
    # Trier les images pour avoir un ordre cohérent (selfie d'abord)
    images.sort()
    
    # Force tous les uploads sur vinted.fr, peu importe la langue de description
    domain = "vinted.fr"
    upload_url = f"https://www.{domain}/items/new"
    
    cdp_port = getattr(config, 'cdp_port', 9222)
    print(f"[Publisher] Connexion à Brave sur le port CDP {cdp_port} pour le profil {config.brave_profile}...")
    
    with sync_playwright() as p:
        try:
            # Tentative de connexion CDP avec timeout réduit (30s) + retry auto
            browser = None
            for attempt in range(2):
                try:
                    browser = p.chromium.connect_over_cdp(
                        f"http://127.0.0.1:{cdp_port}",
                        timeout=30000
                    )
                    print(f"[Publisher] Connexion CDP réussie (tentative {attempt + 1}).")
                    break
                except Exception as cdp_err:
                    if attempt == 0:
                        print(f"[Publisher] [WARN] CDP gelé (timeout 30s). Redémarrage automatique de Brave...")
                        _restart_brave(cdp_port, config.brave_profile)
                    else:
                        raise cdp_err
            master_page = find_vinted_master_page(browser, account_name)
            if not master_page:
                print(f"[Publisher] [ERREUR CRITIQUE] Impossible de trouver l'onglet maitre pour le compte {account_name}.")
                print(f"[Publisher] Assurez-vous que l'onglet avec '?bot_profile={account_name.lower()}' est ouvert et intact.")
                return False
                
            print(f"[Publisher] Onglet maitre trouve pour {account_name}. Utilisation directe de cet onglet pour conserver le profil...")
            page = master_page
            
            # On navigue vers la page d'upload normale sans paramètre pour éviter que Vinted nous redirige
            # (Le paramètre sera remis à la fin du script ou en cas d'erreur)
            target_url = upload_url
            print(f"[Publisher] Navigation vers Vinted ({target_url})...")
            page.goto(target_url, timeout=60000)
            
            # Attente de la page d'upload
            page.wait_for_load_state("networkidle")
            time.sleep(3)
            
            # --- ÉTAPE 1 : Upload des images ---
            print(f"[Publisher] Téléversement de {len(images)} images...")
            # Vinted utilise un input de type file (généralement masqué)
            try:
                # On attend explicitement que l'input file apparaisse dans le DOM (jusqu'a 15s)
                file_input = page.locator('input[type="file"]').first
                file_input.wait_for(state="attached", timeout=15000)
                file_input.set_input_files(images)
                print("[Publisher] Images envoyees via set_input_files")
                time.sleep(5)  # Attendre le chargement des images
            except Exception as e:
                print(f"[Publisher] Upload direct échoué, tentative par clic sur le bouton : {e}")
                try:
                    with page.expect_file_chooser(timeout=8000) as fc_info:
                        page.locator('button:has-text("Ajoute des photos"), button:has-text("Ajouter des photos"), button:has-text("Upload"), .photos-upload-button').first.click()
                    fc_info.value.set_files(images)
                    time.sleep(5)
                except Exception as upload_err:
                    print(f"[Publisher] [ERROR] Échec upload images : {upload_err}")
                    return False
            
            # --- ÉTAPE 2 : Titre ---
            print(f"[Publisher] Remplissage du Titre : '{titre}'")
            # Selecteur pour le titre
            title_input = page.locator('input[name="title"], input[id="title"], [placeholder*="ex : Chemise Zara fleurie"], [placeholder*="ex: Chemise Zara fleurie"]').first
            title_input.fill(titre)
            time.sleep(1)
            
            # --- ÉTAPE 3 : Description ---
            print(f"[Publisher] Remplissage de la Description...")
            desc_input = page.locator('textarea[name="description"], textarea[id="description"], [placeholder*="ex : porté quelques fois"], [placeholder*="ex: porté quelques fois"]').first
            desc_input.fill(description)
            time.sleep(1)
            
            # Attente pour que Vinted suggère la catégorie automatiquement après saisie du titre et des photos
            print("[Publisher] Attente pour la génération des suggestions de catégorie...")
            time.sleep(4)
            
            # --- ÉTAPE 3.5 : Sélection de la Catégorie ---
            print("[Publisher] Sélection de la Catégorie...")
            try:
                cat_input = page.locator('input[id="category"], input[name="catalog_id"]').first
                if cat_input.is_visible(timeout=5000):
                    cat_input.click(force=True)
                    
                    # On attend que la première suggestion apparaisse
                first_suggestion = page.locator('[id^="catalog-suggestion-"][role="button"], .dropdown-portal .item, .menu .item, div[role="option"], .web_ui__Cell__clickable').first
                try:
                    first_suggestion.wait_for(state="visible", timeout=8000)
                    suggestion_text = first_suggestion.text_content().strip().replace('\n', ' ')
                    print(f"[Publisher] Clic sur la suggestion de catégorie : {suggestion_text}")
                    first_suggestion.click()
                    time.sleep(2)
                except Exception:
                    print("[Publisher] [WARN] Aucune suggestion de catégorie n'est apparue dans le délai imparti.")
            except Exception as cat_err:
                print(f"[Publisher] [ERROR] Impossible de sélectionner la catégorie : {cat_err}")
            
            # --- ÉTAPE 3.7 : Marque ---
            print("[Publisher] Sélection de la Marque ('Vintage chic')...")
            try:
                brand_input = page.locator('input[name="brand"], input[id="brand"], input[name="brand_id"], input[id="brand_id"]').first
                if brand_input.is_visible(timeout=5000):
                    brand_input.click(force=True)
                    time.sleep(1)
                    
                    # On cherche le champ de recherche à l'intérieur du menu déroulant (placeholder exact pour éviter la barre globale)
                    search_input = page.locator('input[placeholder*="Rechercher une marque"], input[placeholder="Zoeken"], input[placeholder="Search"], .dropdown-portal input, [role="dialog"] input').last
                    if search_input.is_visible(timeout=3000):
                        search_input.click(force=True)
                        search_input.press_sequentially("Vintage chic", delay=100)
                    else:
                        # Fallback clavier natif au cas où le champ n'a pas été trouvé par le sélecteur
                        page.keyboard.type("Vintage chic", delay=100)
                    time.sleep(2)
                    
                    # Attendre la suggestion "Vintage chic" spécifiquement et cliquer
                    brand_suggestion = page.locator('div[role="button"]:has-text("Vintage chic"), div[role="option"]:has-text("Vintage chic")').first
                    if brand_suggestion.is_visible(timeout=5000):
                        brand_suggestion.click()
                        print("[Publisher] Marque 'Vintage chic' sélectionnée.")
                        time.sleep(1)
                    else:
                        print("[Publisher] [WARN] Suggestion 'Vintage chic' introuvable.")
                else:
                    print("[Publisher] [WARN] Champ Marque invisible (peut-être non requis pour cette catégorie).")
            except Exception as brand_err:
                print(f"[Publisher] [WARN] Erreur lors de la sélection de la marque : {brand_err}")

            # --- ÉTAPE X : Couleur ---
            print("[Publisher] Sélection de la Couleur (recommandée)...")
            try:
                color_input = page.locator('input[id="color"], input[name="color"]').first
                if color_input.is_visible(timeout=5000):
                    color_input.click(force=True)
                    time.sleep(2)
                    
                    # On clique sur la première couleur proposée (les identifiants sont suggested-color-...)
                    first_color = page.locator('[id^="suggested-color-"][role="button"], [id^="color-suggestion-"][role="button"], div[role="option"]').first
                    if first_color.is_visible(timeout=5000):
                        first_color.click()
                        print("[Publisher] Couleur recommandée sélectionnée.")
                        time.sleep(1)
                    else:
                        print("[Publisher] [WARN] Aucune couleur recommandée trouvée.")
            except Exception as color_err:
                print(f"[Publisher] [WARN] Erreur couleur : {color_err}")
            
            # --- ÉTAPE 4 : Prix ---
            price = "50"  # Prix par défaut pour le MVP
            print(f"[Publisher] Remplissage du Prix : {price}€")
            price_input = page.locator('input[name="price"], input[id="price"], [placeholder="0,00"]').first
            if price_input.is_visible():
                price_input.fill(price)
                time.sleep(1)
            
            # --- ÉTAPE 5 : Condition/État ---
            # Par défaut, on choisit "Neuf sans étiquette" ou "Neuf avec étiquette" (Neuf / New)
            print("[Publisher] Sélection de l'état (Neuf sans étiquette / Très bon état)...")
            condition_selectors = [
                'span:has-text("Neuf sans étiquette")',
                'span:has-text("Nieuw zonder prijskaartje")',
                'div[role="radio"]:has-text("Neuf")',
                'text="Neuf sans étiquette"',
                'text="Nieuw zonder prijskaartje"'
            ]
            
            # Cliquer d'abord sur le champ d'état pour ouvrir les options si nécessaire
            condition_trigger = None
            for sel in ['input[id="condition"], input[name="condition"], [id="status_id"]', '.condition-select', 'text="État"', 'text="Staat"', 'text="Condition"']:
                try:
                    loc = page.locator(sel).first
                    if loc.is_visible(timeout=1000):
                        condition_trigger = loc
                        break
                except:
                    continue
            
            if condition_trigger:
                condition_trigger.click(force=True)
                time.sleep(1)
                
            for sel in condition_selectors:
                try:
                    option = page.locator(sel).first
                    if option.is_visible(timeout=1000):
                        option.click()
                        print("[Publisher] État sélectionné.")
                        time.sleep(1)
                        break
                except Exception:
                    continue
            
            # --- ÉTAPE 6 : Taille (si la niche utilise un champ de taille) ---
            if config.niche_def.uses_size:
                print(f"[Publisher] Sélection de la Taille : {config.size}")
                # Cliquer sur le champ de taille
                size_trigger = None
                for sel in ['input[id="size"], input[name="size"], [id="size_id"]', '.size-select', 'text="Taille"', 'text="Maat"', 'text="Size"']:
                    try:
                        loc = page.locator(sel).first
                        if loc.is_visible(timeout=1000):
                            size_trigger = loc
                            break
                    except:
                        continue
                        
                if size_trigger:
                    size_trigger.click(force=True)
                    time.sleep(1)
                    
                    import re
                    # Regex pour matcher exactement la taille (ex: "S" au début de la ligne, suivi d'un espace, slash ou fin)
                    # Cela évite de matcher "XS" ou "XXS" quand on cherche "S".
                    size_pattern = re.compile(rf"^{config.size}(?:\s*/|\s*$)", re.IGNORECASE)
                    
                    size_options = [
                        page.locator('div[role="button"]').filter(has_text=size_pattern).first,
                        page.locator('div[role="option"]').filter(has_text=size_pattern).first,
                        page.locator('button').filter(has_text=size_pattern).first,
                        page.locator('span').filter(has_text=size_pattern).first,
                    ]
                    
                    selected_size = False
                    for option in size_options:
                        try:
                            if option.is_visible(timeout=1000):
                                option.click()
                                print(f"[Publisher] Taille {config.size} sélectionnée.")
                                selected_size = True
                                time.sleep(1)
                                break
                        except Exception:
                            continue
                            
                    if not selected_size:
                        print(f"[Publisher] [WARN] Impossible de trouver la taille {config.size} dans la liste.")
            
            # --- ÉTAPE 7 : Format de Colis ---
            print("[Publisher] Sélection du Format de Colis (Petit)...")
            try:
                # Les formats de colis sont souvent des radios ou des boîtes cliquables
                parcel_selectors = [
                    'label:has-text("Petit")',
                    'label:has-text("Klein")',
                    'label:has-text("Small")',
                    'div[role="radio"]:has-text("Petit")',
                    'text="Petit"'
                ]
                for sel in parcel_selectors:
                    try:
                        parcel_option = page.locator(sel).first
                        if parcel_option.is_visible(timeout=1000):
                            parcel_option.click()
                            print("[Publisher] Format de colis 'Petit' sélectionné.")
                            time.sleep(1)
                            break
                    except Exception:
                        continue
            except Exception as parcel_err:
                print(f"[Publisher] [WARN] Impossible de sélectionner le format de colis : {parcel_err}")
            
            # Optionnel : Clic de validation finale
            if auto_submit:
                print("[Publisher] Soumission automatique de l'annonce...")
                submit_btn = page.locator('button[type="submit"], button:has-text("Ajouter"), button:has-text("Toevoegen")').first
                if submit_btn.is_visible():
                    submit_btn.click()
                    time.sleep(3)
                    print("[Publisher] Annonce ajoutée avec succès !")
                else:
                    print("[Publisher] [WARN] Bouton de publication introuvable.")
            elif save_draft:
                print("[Publisher] Sauvegarde en brouillon...")
                draft_btn = page.locator('button:has-text("Sauvegarder le brouillon"), button:has-text("Opslaan als concept")').first
                if draft_btn.is_visible():
                    draft_btn.click()
                    print("[Publisher] Brouillon sauvegardé avec succès !")
                else:
                    print("[Publisher] [WARN] Bouton de sauvegarde de brouillon introuvable.")
            else:
                print("[Publisher] Formulaire rempli. Le navigateur reste ouvert pour ta validation.")
            
            if auto_submit or save_draft:
                print(f"[Publisher] Retour a la page d'accueil pour le compte {account_name}...")
                page.goto(f"https://www.vinted.fr/?bot_profile={account_name.lower()}")
                time.sleep(2)
                
            # Créer un marqueur de succès pour éviter les doublons à l'avenir
            try:
                with open(os.path.join(product_dir, "published.txt"), "w") as f:
                    f.write("OK")
            except Exception:
                pass
                
            return True
            
        except Exception as e:
            print(f"[Publisher] [ERROR] Une erreur est survenue lors de la publication : {e}")
            try:
                if 'page' in locals() and page:
                    page.goto(f"https://www.vinted.fr/?bot_profile={account_name.lower()}", timeout=10000)
            except Exception:
                pass
            return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Publisher d'annonces automatique pour Vinted")
    parser.add_argument("--account", type=str, default="nina", help="Nom du compte Vinted")
    parser.add_argument("--dir", type=str, required=True, help="Dossier du produit à publier")
    parser.add_argument("--submit", action="store_true", help="Publier directement sans attendre de validation humaine")
    parser.add_argument("--draft", action="store_true", help="Enregistrer comme brouillon à la fin du formulaire")
    
    args = parser.parse_args()
    
    publish_listing(args.account, args.dir, args.submit, args.draft)
