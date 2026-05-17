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
from image_generator import generate_selfie, generate_flat_lay, generate_stroller_domestic, generate_stroller_with_dog
from chatgpt_upscaler import upscale_image_with_chatgpt
from config_manager import get_account_config
from humanizer import humanize_image
import argparse

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
    def __init__(self, file_queue, config):
        super().__init__()
        self.processed_files = set()
        self.file_queue = file_queue
        self.config = config

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
            
        print(f"\n[Watcher] Nouvelle image detectee (ajoutee a la file d'attente) : {os.path.basename(file_path)}")
        self.file_queue.put(file_path)

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
        
        # Détection de la niche (poussettes vs vêtements)
        is_stroller = (self.config.niche == "stroller")
        
        # 2. Generation de la première image (selfie ou poussette domestique)
        output_image_path = os.path.join(product_dir, "selfie.jpg")
        if is_stroller:
            selfie_success = generate_stroller_domestic(prompt, file_path, output_image_path)
        else:
            selfie_success = generate_selfie(prompt, file_path, output_image_path, self.config.avatar_path)
        
        selfie_upscaled_path = None
        if selfie_success:
            print(f"[Watcher] [OK] Première image générée.")
            # 3. Upscaling de la première image via ChatGPT
            print(f"[Watcher] Lancement de l'upscaling ChatGPT pour la première image...")
            upscaled_path = os.path.join(product_dir, "selfie_upscaled.jpg")
            if upscale_image_with_chatgpt(output_image_path, upscaled_path):
                print(f"[Watcher] [OK] Première image upscalée avec succès.")
                selfie_upscaled_path = upscaled_path
            else:
                print(f"[Watcher] [WARN] Echec de l'upscaling de la première image.")
        else:
            print(f"[Watcher] [ERROR] Echec de la generation de la première image.")
            
        # 3. Generation de la deuxième image (Flat Lay ou poussette avec chien)
        flat_lay_output_path = os.path.join(product_dir, "flat_lay.jpg")
        if is_stroller:
            flat_lay_success = generate_stroller_with_dog(prompt, file_path, flat_lay_output_path)
        else:
            flat_lay_success = generate_flat_lay(prompt, file_path, flat_lay_output_path, self.config.floor_template_path)
        
        flat_lay_upscaled_path = None
        if flat_lay_success:
            print(f"[Watcher] [OK] Deuxième image générée.")
            # Upscaling de la deuxième image via ChatGPT
            print(f"[Watcher] Lancement de l'upscaling ChatGPT pour la deuxième image...")
            upscaled_flat_path = os.path.join(product_dir, "flat_lay_upscaled.jpg")
            if upscale_image_with_chatgpt(flat_lay_output_path, upscaled_flat_path):
                print(f"[Watcher] [OK] Deuxième image upscalée avec succès.")
                flat_lay_upscaled_path = upscaled_flat_path
            else:
                print(f"[Watcher] [WARN] Echec de l'upscaling de la deuxième image.")
        else:
            print(f"[Watcher] [ERROR] Echec de la generation de la deuxième image.")
            
        # 4. Copie finale synchronisee vers la racine de OUTPUT_DIR pour declencher MacroDroid
        if selfie_upscaled_path or flat_lay_upscaled_path:
            # Nettoyage préalable de OUTPUT_DIR pour éviter les doublons sur le téléphone
            try:
                for item in os.listdir(self.config.output_dir):
                    item_path = os.path.join(self.config.output_dir, item)
                    if os.path.isfile(item_path):
                        os.remove(item_path)
                print(f"[Watcher] Nettoyage préalable réussi : ancienne annonce supprimée de {os.path.basename(self.config.output_dir)}.")
            except Exception as clean_err:
                print(f"[Watcher] Note nettoyage : {clean_err}")

            with open(os.path.join(self.config.output_dir, "titre.txt"), "w", encoding="utf-8") as f:
                f.write(titre)
            with open(os.path.join(self.config.output_dir, "description.txt"), "w", encoding="utf-8") as f:
                f.write(description)
                
            if selfie_upscaled_path:
                # On applique l'humanisation visuelle géométrique complète lors de l'export vers le téléphone
                humanize_image(selfie_upscaled_path, os.path.join(self.config.output_dir, "selfie_upscaled.jpg"), apply_transform=True)
            if flat_lay_upscaled_path:
                humanize_image(flat_lay_upscaled_path, os.path.join(self.config.output_dir, "flat_lay_upscaled.jpg"), apply_transform=True)
            print(f"[Watcher] [OK] Tous les fichiers ont été HUMANISÉS et déposés dans {self.config.output_dir}.")
            
        # 4. Nettoyage automatique du dossier Input_Screenshots
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"[Watcher] [OK] Capture d'ecran originale nettoyee de Input_Screenshots.")
        except Exception as e:
            print(f"[Watcher] [WARN] Impossible de nettoyer la capture originale : {e}")
            
        print(f"\n[Watcher] [DONE] Traitement termine ! Annonce prete dans :\n   {product_dir}")
        print("-" * 50)

def start_watcher(account_name="nina"):
    config = get_account_config(account_name)
    
    file_queue = queue.Queue()
    event_handler = ScreenshotHandler(file_queue, config)
    observer = Observer()
    observer.schedule(event_handler, config.input_dir, recursive=False)
    observer.start()
    
    print(f"\n" + "="*50)
    print(f"[WATCHER] DEMARRE ET ACTIF [COMPTE : {config.name.upper()}]")
    print(f"Dossier ecoute : {config.input_dir}")
    print(f"File d'attente active : deposez vos images en vrac !")
    print(f"="*50 + "\n")
    
    try:
        while True:
            try:
                # Recupere l'image suivante. block=True et timeout=1 permet de rester sensible au KeyboardInterrupt (Ctrl+C)
                file_path = file_queue.get(block=True, timeout=1)
                
                # Petite pause pour s'assurer que le fichier est completement ecrit par l'OS
                time.sleep(2)
                
                # Traitement de l'image de maniere strictement sequentielle dans le thread principal
                event_handler.process_image(file_path)
                
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
    parser.add_argument("--account", type=str, default="nina", help="Nom du compte cible à surveiller")
    
    args = parser.parse_args()
    
    start_watcher(args.account)
