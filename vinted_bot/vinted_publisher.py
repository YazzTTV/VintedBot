import os
import time
import argparse
import sys
from playwright.sync_api import sync_playwright
from config_manager import get_account_config

# Plus de CDP_URL fixe, on lance Brave dynamiquement

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
    
    # Choix du domaine Vinted selon la langue
    vinted_domains = {
        "fr": "vinted.fr",
        "nl": "vinted.nl",
        "lb": "vinted.be"
    }
    domain = vinted_domains.get(config.language.lower(), "vinted.fr")
    upload_url = f"https://www.{domain}/items/new"
    
    cdp_port = getattr(config, 'cdp_port', 9222)
    print(f"[Publisher] Connexion à Brave sur le port CDP {cdp_port} pour le profil {config.brave_profile}...")
    
    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp(f"http://localhost:{cdp_port}")
            context = browser.contexts[0]
            page = context.new_page()
            
            print(f"[Publisher] Navigation vers Vinted ({upload_url})...")
            page.goto(upload_url, timeout=60000)
            
            # Attente de la page d'upload
            page.wait_for_load_state("networkidle")
            time.sleep(3)
            
            # --- ÉTAPE 1 : Upload des images ---
            print(f"[Publisher] Téléversement de {len(images)} images...")
            # Vinted utilise un input de type file (généralement masqué)
            try:
                file_input = page.locator('input[type="file"]')
                if file_input.count() > 0:
                    file_input.first.set_input_files(images)
                    print("[Publisher] Images envoyées via set_input_files")
                    time.sleep(5)  # Attendre le chargement des images
                else:
                    raise Exception("Input file non trouvé directement")
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
                cat_input = page.locator('input[id="category"]').first
                if cat_input.is_visible(timeout=5000):
                    cat_input.click()
                    
                    # On attend que la première suggestion apparaisse dans le dropdown portal ou menu
                    first_suggestion = page.locator('.dropdown-portal .item, .menu .item').first
                    try:
                        first_suggestion.wait_for(state="visible", timeout=8000)
                        suggestion_text = first_suggestion.text_content().strip().replace('\n', ' ')
                        print(f"[Publisher] Clic sur la suggestion de catégorie : {suggestion_text}")
                        first_suggestion.click()
                        time.sleep(2)
                    except Exception:
                        print("[Publisher] [WARN] Aucune suggestion de catégorie n'est apparue dans le délai imparti.")
                else:
                    print("[Publisher] [WARN] Le champ de catégorie (input#category) n'est pas visible.")
            except Exception as cat_err:
                print(f"[Publisher] [ERROR] Impossible de sélectionner la catégorie : {cat_err}")
            
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
            for sel in ['[id="status_id"]', '.condition-select', 'text="État"', 'text="Staat"', 'text="Condition"']:
                try:
                    loc = page.locator(sel).first
                    if loc.is_visible(timeout=1000):
                        condition_trigger = loc
                        break
                except:
                    continue
            
            if condition_trigger:
                condition_trigger.click()
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
            
            # --- ÉTAPE 6 : Taille (si vêtement) ---
            if config.niche != "stroller":
                print(f"[Publisher] Sélection de la Taille : {config.size}")
                # Cliquer sur le champ de taille
                size_trigger = None
                for sel in ['[id="size_id"]', '.size-select', 'text="Taille"', 'text="Maat"', 'text="Size"']:
                    try:
                        loc = page.locator(sel).first
                        if loc.is_visible(timeout=1000):
                            size_trigger = loc
                            break
                    except:
                        continue
                        
                if size_trigger:
                    size_trigger.click()
                    time.sleep(1)
                    # Essayer de cliquer sur la taille spécifiée (ex: S, M, L)
                    size_selectors = [
                        f'div[role="option"]:has-text("{config.size}")',
                        f'span:has-text("{config.size}")',
                        f'text="{config.size}"'
                    ]
                    for sel in size_selectors:
                        try:
                            option = page.locator(sel).first
                            if option.is_visible(timeout=1000):
                                option.click()
                                print(f"[Publisher] Taille {config.size} sélectionnée.")
                                time.sleep(1)
                                break
                        except Exception:
                            continue
            
            # Optionnel : Clic de validation finale
            if auto_submit:
                print("[Publisher] Soumission automatique de l'annonce...")
                submit_btn = page.locator('button[type="submit"], button:has-text("Ajouter"), button:has-text("Toevoegen")').first
                if submit_btn.is_visible():
                    submit_btn.click()
                    time.sleep(3)
                    print("[Publisher] Annonce publiée avec succès !")
                else:
                    print("[Publisher] [WARN] Bouton de publication introuvable.")
            elif save_draft:
                print("[Publisher] Enregistrement en tant que brouillon...")
                draft_btn = page.locator('button:has-text("Sauvegarder le brouillon")').first
                if draft_btn.is_visible():
                    draft_btn.click()
                    time.sleep(3)
                    print("[Publisher] Brouillon sauvegardé avec succès !")
                else:
                    print("[Publisher] [WARN] Bouton de sauvegarde de brouillon introuvable.")
            else:
                print("[Publisher] Formulaire rempli. Le navigateur reste ouvert pour ta validation.")
            
            if auto_submit or save_draft:
                print("[Publisher] Fermeture de l'onglet de publication...")
                page.close()
                
            return True
            
        except Exception as e:
            print(f"[Publisher] [ERROR] Une erreur est survenue lors de la publication : {e}")
            try:
                if 'page' in locals() and page:
                    page.close()
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
