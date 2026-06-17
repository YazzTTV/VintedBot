import time
import os
import shutil
import queue
import requests
from dotenv import load_dotenv
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

load_dotenv() # Charge l'éventuel webhook url depuis .env

from processor import analyze_screenshot
from config_manager import get_account_config
from humanizer import humanize_image
import argparse
import json

class SimpleFileLock:
    def __init__(self, lock_file):
        self.lock_file = lock_file
        self.fd = None

    def acquire(self):
        while True:
            try:
                self.fd = os.open(self.lock_file, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                break
            except FileExistsError:
                time.sleep(1)
            except Exception as e:
                # Sécurité pour autres erreurs OS (permission, etc.)
                print(f"[Watcher] [LOCK] Warning: {e}")
                time.sleep(1)

    def release(self):
        if self.fd is not None:
            os.close(self.fd)
            try:
                os.remove(self.lock_file)
            except OSError:
                pass
            self.fd = None

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()

def load_post_state(state_file):
    if os.path.exists(state_file):
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    # Valeurs par défaut si le fichier n'existe pas ou est corrompu
    return {"last_post_type": "fake", "last_fake_index": -1}

def save_post_state(state_file, last_post_type, last_fake_index):
    try:
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump({
                "last_post_type": last_post_type,
                "last_fake_index": last_fake_index
            }, f, indent=2)
    except Exception as e:
        print(f"[Watcher] [Alternance] [WARN] Impossible de sauvegarder l'etat : {e}")

def get_fake_items(fake_bank_dir):
    if not os.path.exists(fake_bank_dir):
        return []
    items = []
    for d in os.listdir(fake_bank_dir):
        path = os.path.join(fake_bank_dir, d)
        if os.path.isdir(path) and d.startswith("item_"):
            items.append(path)
    items.sort()
    return items

def get_next_fake_item(fake_bank_dir, last_fake_index):
    items = get_fake_items(fake_bank_dir)
    if not items:
        return None, -1
    next_index = (last_fake_index + 1) % len(items)
    return items[next_index], next_index

def export_fake_item(fake_item_dir, output_dir):
    """
    Exporte un item fake vers le dossier de sortie pour MacroDroid.
    Nettoie le dossier, écrit le titre, la description, et humanise les photos.
    """
    try:
        for item in os.listdir(output_dir):
            item_path = os.path.join(output_dir, item)
            if os.path.isfile(item_path):
                os.remove(item_path)
        print(f"[Watcher] [Alternance] Nettoyage de {os.path.basename(output_dir)} reussi.")
    except Exception as clean_err:
        print(f"[Watcher] [Alternance] [WARN] Echec nettoyage : {clean_err}")

    try:
        shutil.copy2(os.path.join(fake_item_dir, "titre.txt"), os.path.join(output_dir, "titre.txt"))
        shutil.copy2(os.path.join(fake_item_dir, "description.txt"), os.path.join(output_dir, "description.txt"))
    except Exception as e:
        print(f"[Watcher] [Alternance] [ERROR] Echec copie textes du fake : {e}")
        return False

    images = [f for f in os.listdir(fake_item_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    images.sort()
    
    if not images:
        print(f"[Watcher] [Alternance] [ERROR] Aucune image trouvee dans {fake_item_dir}")
        return False
        
    dest_names = ["selfie_upscaled.jpg", "profile_upscaled.jpg", "selfie_hand_in_hair_upscaled.jpg", "flat_lay_upscaled.jpg", "hanger_upscaled.jpg", "folded_upscaled.jpg"]
    
    copied_count = 0
    for idx, img_name in enumerate(images):
        if idx >= len(dest_names):
            break
        src_img = os.path.join(fake_item_dir, img_name)
        dest_img = os.path.join(output_dir, dest_names[idx])
        
        try:
            humanize_image(src_img, dest_img, apply_transform=True)
            copied_count += 1
        except Exception as e:
            print(f"[Watcher] [Alternance] [WARN] Echec humanisation image {img_name} : {e}")
            try:
                shutil.copy2(src_img, dest_img)
                copied_count += 1
            except Exception:
                pass
                
    print(f"[Watcher] [Alternance] [OK] {copied_count} image(s) fakes exportees et humanisees.")
    return True

def countdown_wait(seconds: int):
    """Affiche un compte a rebours interactif dans la console."""
    for i in range(seconds, 0, -1):
        print(f"\r[Watcher] [Alternance] Annonce FAKE exportee. Attente de {seconds} secondes avant de poster l'annonce IA... ({i}s restantes)", end="", flush=True)
        time.sleep(1)
    print("\r" + " " * 120 + "\r", end="", flush=True)

def sync_to_google_sheets(account: str, titre: str, url: str, fiche: str):
    """Envoie la nouvelle annonce en temps réel vers le webhook Google Sheet."""
    webhook_url = os.getenv("GOOGLE_SHEET_WEBHOOK_URL")
    if not webhook_url:
        return # Pas configuré, ignore silencieusement

    try:
        payload = {
            "account": account,
            "date": time.strftime("%Y-%m-%d"),
            "titre": titre,
            "url": url,
            "fiche": fiche
        }
        response = requests.post(webhook_url, json=payload, timeout=10)
        if response.status_code == 200:
            print(f"[Watcher] [SYNC] Annonce synchronisée en direct sur Google Sheet.")
        else:
            print(f"[Watcher] [WARN] Echec sync Google Sheet : Code HTTP {response.status_code}")
    except Exception as e:
        print(f"[Watcher] [WARN] Impossible de contacter le webhook Google Sheet : {e}")

def sync_to_vinted_manager_supabase():
    """Lance le script de synchronisation Supabase en tâche de fond (détachée)."""
    import subprocess
    try:
        # Chemin relatif vers le dossier de l'application manager
        base_dir = os.path.dirname(os.path.abspath(__file__))
        manager_dir = os.path.abspath(os.path.join(base_dir, "..", "vinted-manager"))
        
        if os.path.exists(manager_dir):
            # Lance la commande de synchronisation NPM en tâche de fond
            subprocess.Popen(["npm", "run", "sync"], cwd=manager_dir, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"[Watcher] [SYNC] Mise à jour Supabase Cloud lancée en tâche de fond.")
    except Exception:
        pass

class ScreenshotHandler(FileSystemEventHandler):
    def __init__(self, file_queue, config, publish=False, submit=False, hidden=False):
        super().__init__()
        self.processed_files = set()
        self.file_queue = file_queue
        self.config = config
        self.publish = publish
        self.submit = submit
        self.hidden = hidden

    def on_created(self, event):
        if event.is_directory:
            return
            
        file_path = event.src_path
        # Ignore non-image files
        if not file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            return
            
        if file_path in self.processed_files:
            return
        self.processed_files.add(file_path)
            
        print(f"\n[Watcher] Nouvelle image detectee sur le compte {self.config.name} (ajoutee a la file d'attente) : {os.path.basename(file_path)}")
        self.file_queue.put((file_path, self))

    def process_image(self, file_path):
        filename = os.path.basename(file_path)
        base_name = os.path.splitext(filename)[0]
        
        # Récupération de l'URL Shein associée au produit si présente
        shein_url = "https://fr.shein.com"
        url_file_path = file_path.replace(".png", ".txt").replace(".jpg", ".txt").replace(".jpeg", ".txt")
        if os.path.exists(url_file_path):
            try:
                with open(url_file_path, "r", encoding="utf-8") as url_f:
                    shein_url = url_f.read().strip()
                os.remove(url_file_path)
            except Exception as url_err:
                print(f"[Watcher] Note lecture URL : {url_err}")
                
        # 1. Analyse via Gemini Vision
        print(f"[Watcher] Demarrage du pipeline pour {filename} (Lien : {shein_url})...")
        data = analyze_screenshot(file_path, size=self.config.size, language=self.config.language, niche=self.config.niche)
        if not data:
            print("[Watcher] [ERROR] Echec de l'analyse de l'image.")
            return
            
        titre = data.get('titre_vinted', 'Annonce Vinted')
        description = data.get('description_vinted', '')
        prompt = data.get('prompt_image_anglais', '')
        
        # Creation d'un dossier de sortie pour ce produit
        safe_title = "".join([c for c in titre if c.isalpha() or c.isdigit() or c==' ']).strip()
        short_title = safe_title[:15].strip()
        product_dir = os.path.join(self.config.archive_dir, f"{base_name}_{short_title}")
        os.makedirs(product_dir, exist_ok=True)
        
        # Sauvegarde du titre et de la description separement (dans le sous-dossier produit)
        titre_path = os.path.join(product_dir, "titre.txt")
        with open(titre_path, "w", encoding="utf-8") as f:
            f.write(titre)
            
        desc_path = os.path.join(product_dir, "description.txt")
        with open(desc_path, "w", encoding="utf-8") as f:
            f.write(description)
            
        # Sauvegarde du lien de l'article Shein
        with open(os.path.join(product_dir, "shein_url.txt"), "w", encoding="utf-8") as f:
            f.write(shein_url)
            
        print(f"[Watcher] [OK] Titre, description et lien d'achat sauvegardes.")
        
        # Ajout à l'historique de sourcing centralisé (Markdown)
        history_path = self.config.history_path
        if not os.path.exists(history_path):
            with open(history_path, "w", encoding="utf-8") as h_f:
                h_f.write(f"# 📦 Historique du Sourcing & Commandes Vinted - Compte {self.config.name}\n\n")
                h_f.write("Ce registre répertorie tous les articles traités par le bot. Coche la case correspondante lors d'une commande d'achat suite à une vente.\n\n")
                h_f.write("| Statut | Date de Sourcing | Article | Lien d'achat Shein | Fiche d'annonce |\n")
                h_f.write("| :---: | :---: | :---: | :--- | :--- |\n")
                
        today_str = time.strftime("%Y-%m-%d")
        with open(history_path, "a", encoding="utf-8") as h_f:
            h_f.write(f"| [ ] À commander | {today_str} | **{titre}** | [Lien de l'article Shein]({shein_url}) | [[{base_name}_{short_title}]] |\n")
        print(f"[Watcher] [OK] Produit ajoute a l'historique de sourcing.")
        
        # --- SYNC TEMPS RÉEL VERS GOOGLE SHEETS ---
        sync_to_google_sheets(self.config.name, titre, shein_url, f"[[{base_name}_{short_title}]]")
        
        # --- AUTO-SYNC TEMPS RÉEL VERS SUPABASE DB (CLOUD VINTED MANAGER) ---
        sync_to_vinted_manager_supabase()
        
        # Copie de l'image originale pour archivage
        shutil.copy2(file_path, os.path.join(product_dir, f"original_{filename}"))
        
        # Détection de la niche
        is_stroller = (self.config.niche == "stroller")
        
        selfie_upscaled_path = None
        profile_upscaled_path = None
        flat_lay_upscaled_path = None
        hanger_upscaled_path = None
        folded_upscaled_path = None
        selfie_hair_upscaled_path = None
        
        import random
        # Selection aleatoire d'un template de cintre s'il y en a plusieurs
        final_hanger_template = self.config.hanger_template_path
        if hasattr(self.config, 'hanger_templates_dir') and os.path.exists(self.config.hanger_templates_dir):
            templates = [f for f in os.listdir(self.config.hanger_templates_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
            if templates:
                final_hanger_template = os.path.join(self.config.hanger_templates_dir, random.choice(templates))
        
        # Lancement de la génération d'images en parallèle via l'orchestrateur asynchrone de ChatGPT
        import asyncio
        from nano_banana import generate_all_images_parallel_async
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            image_results = loop.run_until_complete(
                generate_all_images_parallel_async(
                    self.config.niche,
                    file_path,
                    self.config.avatar_path,
                    self.config.floor_template_path,
                    final_hanger_template,
                    product_dir,
                    prompt,
                    niche_def=self.config.niche_def,
                    hidden=self.hidden
                )
            )
            selfie_upscaled_path = image_results.get("selfie_upscaled")
            flat_lay_upscaled_path = image_results.get("flat_lay_upscaled")
            profile_upscaled_path = image_results.get("profile_upscaled")
            hanger_upscaled_path = image_results.get("hanger_upscaled")
            folded_upscaled_path = image_results.get("folded_upscaled")
            selfie_hair_upscaled_path = image_results.get("selfie_hand_in_hair_upscaled")
        except Exception as async_err:
            print(f"[Watcher] [ERROR] Échec de la génération d'images en parallèle : {async_err}")
        finally:
            loop.close()
            
        # Validation de la présence d'au moins une image générée pour le type d'annonce
        if is_stroller:
            all_images_ok = any([selfie_upscaled_path, flat_lay_upscaled_path])
            required_desc = "au moins une image (selfie ou flat lay)"
        else:
            all_images_ok = any([selfie_upscaled_path, profile_upscaled_path, flat_lay_upscaled_path, hanger_upscaled_path, folded_upscaled_path, selfie_hair_upscaled_path])
            required_desc = "au moins une image générée"
            
        # 4. Copie finale synchronisee vers la racine de OUTPUT_DIR pour declencher MacroDroid
        if all_images_ok:
            # --- LOGIQUE D'ALTERNANCE IA / FAKE ---
            fake_bank_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Fake_Bank")
            state_file = os.path.join(self.config.account_dir, "last_post_state.json")
            state = load_post_state(state_file)
            
            fake_items = get_fake_items(fake_bank_dir)
            has_fakes = len(fake_items) > 0
            
            if has_fakes and state.get("last_post_type") == "ia":
                fake_folder = fake_items[0]
                print(f"\n[Watcher] [Alternance] Alternance activee. Dernier post était IA.")
                print(f"[Watcher] [Alternance] Preparation de l'annonce FAKE : {os.path.basename(fake_folder)}...")
                
                # Exporter vers un dossier local au lieu de output_dir (qui déclenchait MacroDroid)
                fake_ready_dir = os.path.join(self.config.account_dir, "Fake_Ready")
                os.makedirs(fake_ready_dir, exist_ok=True)
                
                if export_fake_item(fake_folder, fake_ready_dir):
                    # Deplacement automatique vers le dossier Used pour eviter la reutilisation
                    used_dir = os.path.join(fake_bank_dir, "Used")
                    os.makedirs(used_dir, exist_ok=True)
                    today_str = time.strftime("%Y-%m-%d")
                    dest_folder_name = f"{today_str}_{os.path.basename(fake_folder)}"
                    dest_path = os.path.join(used_dir, dest_folder_name)
                    try:
                        shutil.move(fake_folder, dest_path)
                        print(f"[Watcher] [Alternance] [OK] L'annonce fake a ete deplacee vers Used/{dest_folder_name}")
                    except Exception as move_err:
                        print(f"[Watcher] [Alternance] [WARN] Echec deplacement du fake : {move_err}")
                        
                    save_post_state(state_file, last_post_type="fake", last_fake_index=-1)
                    if self.publish:
                        try:
                            import subprocess
                            import sys
                            cmd = [sys.executable, "vinted_publisher.py", "--account", self.config.name, "--dir", fake_ready_dir]
                            if self.submit:
                                cmd.append("--submit")
                            subprocess.run(cmd, check=True)
                            print("[Watcher] [Alternance] Publication fake terminee, pause de 30s...")
                            time.sleep(30)
                        except subprocess.CalledProcessError as pub_err:
                            print(f"[Watcher] [ERROR] Echec de la publication auto du fake : {pub_err}")
                    countdown_wait(90)
            
            # --- FINALISATION DE L'ANNONCE IA (HUMANISATION GÉOMÉTRIQUE) ---
            print("[Watcher] Application de l'humanisation géométrique finale...")
                
            if selfie_upscaled_path:
                humanize_image(selfie_upscaled_path, selfie_upscaled_path, apply_transform=True)
            if profile_upscaled_path:
                humanize_image(profile_upscaled_path, profile_upscaled_path, apply_transform=True)
            if flat_lay_upscaled_path:
                humanize_image(flat_lay_upscaled_path, flat_lay_upscaled_path, apply_transform=True)
            if hanger_upscaled_path:
                humanize_image(hanger_upscaled_path, hanger_upscaled_path, apply_transform=True)
            if folded_upscaled_path:
                humanize_image(folded_upscaled_path, folded_upscaled_path, apply_transform=True)
            if selfie_hair_upscaled_path:
                humanize_image(selfie_hair_upscaled_path, selfie_hair_upscaled_path, apply_transform=True)
            print(f"[Watcher] [OK] Tous les fichiers ont été HUMANISÉS et prêts dans l'archive locale ({product_dir}).")
            
            # Mise à jour finale de l'état (dernier posté devient IA)
            current_state = load_post_state(state_file)
            save_post_state(state_file, last_post_type="ia", last_fake_index=current_state.get("last_fake_index", -1))
            
            if self.publish:
                try:
                    import subprocess
                    import sys
                    cmd = [sys.executable, "vinted_publisher.py", "--account", self.config.name, "--dir", product_dir]
                    if self.submit:
                        cmd.append("--submit")
                    subprocess.run(cmd, check=True)
                    print("[Watcher] Publication IA terminee, pause de 30s pour soulager le reseau...")
                    time.sleep(30)
                except subprocess.CalledProcessError as pub_err:
                    print(f"[Watcher] [ERROR] Echec de la publication auto de l'IA : {pub_err}")
        else:
            print(f"[Watcher] [ERROR] Export annulé car des images requises sont manquantes ({required_desc}).")
            
        # 4. Nettoyage automatique du dossier Input_Screenshots
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"[Watcher] [OK] Capture d'ecran originale nettoyee de Input_Screenshots.")
        except Exception as e:
            print(f"[Watcher] [WARN] Impossible de nettoyer la capture originale : {e}")
            
        print(f"\n[Watcher] [DONE] Traitement termine ! Annonce prete dans :\n   {product_dir}")
        print("-" * 50)

def start_watcher(account_name="all", publish=False, submit=False, hidden=False):
    from config_manager import list_available_accounts
    accounts = list_available_accounts() if account_name.lower() == "all" else [account_name]
    
    file_queue = queue.Queue()
    observer = Observer()
    
    # Nettoyage d'un éventuel verrou résiduel lié à un crash précédent
    lock_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "global_watcher.lock")
    if os.path.exists(lock_path):
        try:
            os.remove(lock_path)
            print(f"[Watcher] Verrou global residuel nettoye au demarrage.")
        except OSError:
            pass
            
    print(f"\n" + "="*50, flush=True)
    if len(accounts) > 1:
        print(f"[WATCHER] DEMARRE EN MODE MULTI-COMPTE ({len(accounts)} comptes)", flush=True)
    else:
        print(f"[WATCHER] DEMARRE ET ACTIF [COMPTE : {accounts[0].upper()}]", flush=True)
    
    for acc in accounts:
        config = get_account_config(acc)
        event_handler = ScreenshotHandler(file_queue, config, publish=publish, submit=submit, hidden=hidden)
        observer.schedule(event_handler, config.input_dir, recursive=False)
        print(f"Dossier ecoute : {config.input_dir}", flush=True)
        
        # Traiter les images deja presentes (si deposees avant le demarrage du watcher)
        for f in os.listdir(config.input_dir):
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                file_path = os.path.join(config.input_dir, f)
                event_handler.processed_files.add(file_path)
                print(f"[Watcher] Image existante detectee sur le compte {config.name} (ajoutee a la file d'attente) : {f}", flush=True)
                file_queue.put((file_path, event_handler))
        
    observer.start()
    
    print(f"File d'attente active : deposez vos images en vrac !", flush=True)
    if publish:
        print(f"Publication automatique activee (Soumission auto: {submit})", flush=True)
    print(f"="*50 + "\n", flush=True)
    
    try:
        while True:
            try:
                # Recupere l'image suivante.
                file_path, handler = file_queue.get(block=True, timeout=1)
                
                # Petite pause pour s'assurer que le fichier est completement ecrit par l'OS
                time.sleep(2)
                
                # Traitement de l'image avec verrou global inter-processus
                lock_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "global_watcher.lock")
                print(f"[Watcher] En attente de la disponibilité (File d'attente globale)...")
                with SimpleFileLock(lock_path):
                    print(f"[Watcher] >>> C'EST MON TOUR ! Traitement de l'image pour le compte {handler.config.name} <<<")
                    handler.process_image(file_path)
                
                # Marque la tache comme terminee dans la file
                file_queue.task_done()
                
                # Affichage des images restantes dans la file pour l'utilisateur
                remaining = file_queue.qsize()
                if remaining > 0:
                    print(f"[Watcher] {remaining} image(s) en attente dans la file.")
            except queue.Empty:
                continue
    except KeyboardInterrupt:
        observer.stop()
        print("\nArret du watcher.")
    observer.join()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Watcher d'images automatisé pour pipeline Vinted")
    parser.add_argument("--account", type=str, default="all", help="Nom du compte cible à surveiller (ou 'all' pour tous)")
    parser.add_argument("--publish", action="store_true", help="Publier automatiquement via Playwright CDP sur Vinted")
    parser.add_argument("--submit", action="store_true", help="Publier directement sans attendre de validation humaine")
    parser.add_argument("--hidden", action="store_true", help="Lance Edge en arriere-plan pour la generation IA")
    
    args = parser.parse_args()
    
    start_watcher(args.account, publish=args.publish, submit=args.submit, hidden=args.hidden)
