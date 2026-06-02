import os
import re
import time
import shutil
import queue
import argparse
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from playwright.sync_api import sync_playwright
from config_manager import get_account_config
from edge_browser import start_edge, open_gemini_page, upload_files, type_and_send, wait_for_response, get_last_response_text

PROMPT_ANALYSE_FAKE = """Je te donne une photo d'un objet d'occasion réel (que je souhaite vendre sur Vinted).
Il peut s'agir de n'importe quel objet du quotidien (décoration, meuble, vêtement, livre, vaisselle, etc.).

IMPORTANT : Ne mentionne AUCUNE marque de site low-cost ou e-commerce (Shein, Temu, AliExpress, etc.).
IMPORTANT : Ne crée aucun fichier ou document. Réponds directement en texte brut.

Effectue les tâches suivantes :
1. Identifie précisément l'objet présent sur la photo (nature, matière, couleur, style, état apparent).
2. Rédige un titre de vente court et sympa pour Vinted (max 40 caractères). {CONSIGNES_LANGUE} IMPORTANT : N'utilise AUCUN emoji (pas de smileys, pas de coeurs, etc.).
3. Rédige une description de vente réaliste, humaine et concise pour Vinted (maximum 3 à 4 courtes phrases simples). Décris l'état de l'objet de manière honnête (ex: très bon état, comme neuf, traces d'usure légères, etc.), ses dimensions approximatives si c'est pertinent, et pourquoi il est vendu (ex: double emploi, déménagement, vide-grenier). Le ton doit être super naturel, comme une personne ordinaire qui vide ses placards. N'utilise AUCUN hashtag (#) et N'utilise AUCUN emoji. {PHRASES_TYPIQUES}

Formate obligatoirement ta réponse avec ces balises précises :

[TITRE_VINTED]
(titre de vente ici)
[/TITRE_VINTED]

[DESCRIPTION_VINTED]
(description de vente ici)
[/DESCRIPTION_VINTED]"""

def analyze_fake_image(image_path: str, language: str = "fr") -> dict | None:
    print(f"[Fake Builder] Analyse de l'image via Gemini Web : {os.path.basename(image_path)} (Langue : {language.upper()})...")
    
    instructions_langue = "Rédige le titre et la description EXCLUSIVEMENT en Français."
    phrases_typiques = "Inclus des phrases typiques comme 'N\'hesitez pas si vous avez des questions !', 'Envoi rapide'."
    
    lang_lower = language.lower()
    if lang_lower == "nl":
        instructions_langue = "IMPORTANT : Rédige le titre et la description EXCLUSIVEMENT en Néerlandais fluide, naturel et moderne. N'utilise aucun mot français ou anglais."
        phrases_typiques = "Inclus des phrases typiques néerlandaises comme 'Stel gerust vragen als je die hebt!', 'Snelle verzending'."
    elif lang_lower == "lb":
        instructions_langue = "IMPORTANT : Rédige le titre et la description EXCLUSIVEMENT en Luxembourgeois fluide, moderne et naturel."
        phrases_typiques = "Inclus des phrases typiques luxembourgeoises adaptées comme 'Zéckt net, wann der Froen hutt!', 'Schnell verschéckt'."

    final_prompt = PROMPT_ANALYSE_FAKE.format(
        CONSIGNES_LANGUE=instructions_langue,
        PHRASES_TYPIQUES=phrases_typiques
    )

    if not start_edge():
        print("[Fake Builder] ERREUR : impossible de démarrer Edge.")
        return None

    with sync_playwright() as p:
        try:
            browser, page = open_gemini_page(p)

            # 1. Upload de la photo de l'objet
            print("[Fake Builder] Upload de la photo de l'objet...")
            if not upload_files(page, [image_path]):
                print("[Fake Builder] ERREUR : upload de l'image échoué.")
                page.close()
                return None

            # 2. Envoi du prompt d'analyse
            print("[Fake Builder] Envoi du prompt d'analyse...")
            type_and_send(page, final_prompt)

            # 3. Attente de la réponse (max 60s)
            wait_for_response(page, timeout_s=60)

            # 4. Extraction du texte
            raw_text = get_last_response_text(page)
            page.close()

            if not raw_text:
                print("[Fake Builder] ERREUR : réponse vide.")
                return None

            # 5. Parsing du titre et description
            titre_match = re.search(r'\[TITRE_VINTED\]\s*(.*?)\s*\[/TITRE_VINTED\]', raw_text, re.DOTALL | re.IGNORECASE)
            desc_match = re.search(r'\[DESCRIPTION_VINTED\]\s*(.*?)\s*\[/DESCRIPTION_VINTED\]', raw_text, re.DOTALL | re.IGNORECASE)
            
            if titre_match and desc_match:
                from processor import _clean_forbidden_words
                titre = _clean_forbidden_words(titre_match.group(1).strip())
                description = _clean_forbidden_words(desc_match.group(1).strip())
                print(f"[Fake Builder] Analyse réussie : '{titre}'")
                return {
                    "titre": titre,
                    "description": description
                }
            
            print("[Fake Builder] ERREUR : Impossible de parser la réponse de Gemini.")
            return None

        except Exception as e:
            print(f"[Fake Builder] Erreur critique lors de l'analyse : {e}")
            return None

def get_next_item_index(fake_bank_dir: str) -> int:
    max_idx = 0
    if os.path.exists(fake_bank_dir):
        for name in os.listdir(fake_bank_dir):
            if os.path.isdir(os.path.join(fake_bank_dir, name)):
                m = re.match(r'^item_(\d+)_', name)
                if m:
                    idx = int(m.group(1))
                    if idx > max_idx:
                        max_idx = idx
    # Parcourir aussi le dossier Used pour ne pas réutiliser un index déjà utilisé dans le passé
    used_dir = os.path.join(fake_bank_dir, "Used")
    if os.path.exists(used_dir):
        for name in os.listdir(used_dir):
            if os.path.isdir(os.path.join(used_dir, name)):
                m = re.match(r'^\d{4}-\d{2}-\d{2}_item_(\d+)_', name)
                if m:
                    idx = int(m.group(1))
                    if idx > max_idx:
                        max_idx = idx
    return max_idx + 1

def make_slug(title: str) -> str:
    slug = title.lower()
    accents = {'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'ç': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'ÿ': 'y'}
    for char, replacement in accents.items():
        slug = slug.replace(char, replacement)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug[:20]

def check_recycle_reminders(fake_bank_dir: str):
    used_dir = os.path.join(fake_bank_dir, "Used")
    if not os.path.exists(used_dir):
        return
    
    print("\n📢 [RAPPELS RECYCLAGE] Objets prêts à être re-photographiés (J+3) :")
    count = 0
    now = datetime.now()
    
    for name in os.listdir(used_dir):
        path = os.path.join(used_dir, name)
        if os.path.isdir(path):
            m = re.match(r'^(\d{4}-\d{2}-\d{2})_item_(\d+)_([a-zA-Z0-9\-]+)', name)
            if m:
                date_str = m.group(1)
                item_slug = m.group(3)
                try:
                    used_date = datetime.strptime(date_str, "%Y-%m-%d")
                    diff_days = (now - used_date).days
                    if diff_days >= 3:
                        print(f"  - [ ] {item_slug} (utilisé il y a {diff_days} jours, le {date_str})")
                        count += 1
                except Exception:
                    pass
    if count == 0:
        print("  Aucun objet à recycler pour le moment (tous ont moins de 3 jours d'utilisation).")
    print()

def process_batch(fake_bank_dir: str, input_dir: str, language: str):
    if not os.path.exists(input_dir):
        os.makedirs(input_dir)
        print(f"[Fake Builder] Dossier d'entrée créé : {input_dir}")
        return

    items_to_process = []
    for name in os.listdir(input_dir):
        path = os.path.join(input_dir, name)
        # Éviter de s'auto-traiter
        if name.lower() == "used" or name.lower() == "input":
            continue
        items_to_process.append((name, path))

    if not items_to_process:
        print("[Fake Builder] Aucun fichier ou dossier trouvé dans Fake_Bank/Input/. Prêt à recevoir des dépôts.")
        return

    print(f"[Fake Builder] {len(items_to_process)} élément(s) à traiter...")

    for name, path in items_to_process:
        if os.path.isdir(path):
            # Traitement d'un dossier (multi-photos pour un seul produit)
            images = [f for f in os.listdir(path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
            images.sort()
            if not images:
                print(f"[Fake Builder] [WARN] Le dossier '{name}' ne contient aucune image. Ignoré.")
                continue
                
            first_image_path = os.path.join(path, images[0])
            print(f"\n[Fake Builder] Traitement du dossier '{name}' ({len(images)} photos)...")
            data = analyze_fake_image(first_image_path, language=language)
            if not data:
                continue
                
            titre = data.get('titre')
            description = data.get('description')
            
            next_idx = get_next_item_index(fake_bank_dir)
            slug = make_slug(titre)
            dest_dir = os.path.join(fake_bank_dir, f"item_{next_idx}_{slug}")
            os.makedirs(dest_dir, exist_ok=True)
            
            # Copie toutes les images
            for idx, img_name in enumerate(images):
                src_img = os.path.join(path, img_name)
                dest_img = os.path.join(dest_dir, f"photo_{idx+1}.jpg")
                shutil.copy2(src_img, dest_img)
                
            with open(os.path.join(dest_dir, "titre.txt"), "w", encoding="utf-8") as f:
                f.write(titre)
            with open(os.path.join(dest_dir, "description.txt"), "w", encoding="utf-8") as f:
                f.write(description)
                
            print(f"[Fake Builder] [OK] Item {next_idx} créé pour '{name}' avec {len(images)} photos.")
            
            try:
                shutil.rmtree(path)
                print(f"[Fake Builder] Dossier source '{name}' nettoyé.")
            except Exception as e:
                print(f"[Fake Builder] [WARN] Échec suppression dossier source : {e}")

        elif os.path.isfile(path) and name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            # Traitement d'une photo seule
            print(f"\n[Fake Builder] Traitement de la photo seule '{name}'...")
            data = analyze_fake_image(path, language=language)
            if not data:
                continue
                
            titre = data.get('titre')
            description = data.get('description')
            
            next_idx = get_next_item_index(fake_bank_dir)
            slug = make_slug(titre)
            dest_dir = os.path.join(fake_bank_dir, f"item_{next_idx}_{slug}")
            os.makedirs(dest_dir, exist_ok=True)
            
            dest_image_path = os.path.join(dest_dir, "photo_1.jpg")
            shutil.copy2(path, dest_image_path)
            
            with open(os.path.join(dest_dir, "titre.txt"), "w", encoding="utf-8") as f:
                f.write(titre)
            with open(os.path.join(dest_dir, "description.txt"), "w", encoding="utf-8") as f:
                f.write(description)
                
            print(f"[Fake Builder] [OK] Item {next_idx} créé pour la photo '{name}'.")
            
            try:
                os.remove(path)
                print(f"[Fake Builder] Photo source '{name}' nettoyée.")
            except Exception as e:
                print(f"[Fake Builder] [WARN] Échec suppression photo source : {e}")

class FakeImageHandler(FileSystemEventHandler):
    def __init__(self, file_queue, fake_bank_dir, language):
        super().__init__()
        self.processed_files = set()
        self.file_queue = file_queue
        self.fake_bank_dir = fake_bank_dir
        self.language = language

    def on_created(self, event):
        if event.is_directory:
            return
        file_path = event.src_path
        if not file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            return
        if file_path in self.processed_files:
            return
        self.processed_files.add(file_path)
        print(f"\n[Fake Builder] [Mode Watcher] Nouvelle photo détectée : {os.path.basename(file_path)}")
        self.file_queue.put(file_path)

    def process_image(self, file_path):
        filename = os.path.basename(file_path)
        data = analyze_fake_image(file_path, language=self.language)
        if not data:
            return
        titre = data.get('titre', 'Objet d\'occasion')
        description = data.get('description', '')
        
        next_idx = get_next_item_index(self.fake_bank_dir)
        slug = make_slug(titre)
        item_dir = os.path.join(self.fake_bank_dir, f"item_{next_idx}_{slug}")
        os.makedirs(item_dir, exist_ok=True)
        
        shutil.copy2(file_path, os.path.join(item_dir, "photo_1.jpg"))
        with open(os.path.join(item_dir, "titre.txt"), "w", encoding="utf-8") as f:
            f.write(titre)
        with open(os.path.join(item_dir, "description.txt"), "w", encoding="utf-8") as f:
            f.write(description)
            
        print(f"[Fake Builder] [OK] Item {next_idx} créé sous Fake_Bank : item_{next_idx}_{slug}")
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            pass

def start_builder(account_name="nina", forced_lang=None, run_watcher=False):
    config = get_account_config(account_name)
    language = forced_lang if forced_lang else config.language
    
    fake_bank_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Fake_Bank")
    input_dir = os.path.join(fake_bank_dir, "Input")
    
    os.makedirs(fake_bank_dir, exist_ok=True)
    os.makedirs(input_dir, exist_ok=True)
    
    # 1. Vérification des rappels de recyclage
    check_recycle_reminders(fake_bank_dir)
    
    if not run_watcher:
        # Mode Lot (Batch) par défaut
        print("="*60)
        print(f"[FAKE BANK BUILDER] EXÉCUTION EN MODE LOT (BATCH)")
        print(f"Dossier source : {input_dir}")
        print(f"Dossier cible  : {fake_bank_dir}")
        print(f"Langue cible   : {language.upper()}")
        print("="*60)
        process_batch(fake_bank_dir, input_dir, language)
        print("\n[Fake Builder] Traitement en lot terminé.")
    else:
        # Mode Watcher continu (si --watch)
        file_queue = queue.Queue()
        event_handler = FakeImageHandler(file_queue, fake_bank_dir, language)
        observer = Observer()
        observer.schedule(event_handler, input_dir, recursive=False)
        observer.start()
        
        print("="*60)
        print(f"[FAKE BANK BUILDER] MODE WATCHER ACTIF (En attente d'images...)")
        print(f"Dossier écoute : {input_dir}")
        print(f"Dossier cible  : {fake_bank_dir}")
        print("="*60 + "\n")
        
        try:
            while True:
                try:
                    file_path = file_queue.get(block=True, timeout=1)
                    time.sleep(2)
                    event_handler.process_image(file_path)
                    file_queue.task_done()
                except queue.Empty:
                    continue
        except KeyboardInterrupt:
            observer.stop()
            print("\nArrêt du Fake Bank Builder.")
        observer.join()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Watcher/Batch automatique de création de la Fake Bank")
    parser.add_argument("--account", type=str, default="nina", help="Compte de référence pour la langue")
    parser.add_argument("--language", type=str, default=None, help="Forcer une langue (fr/nl/lb)")
    parser.add_argument("--watch", action="store_true", help="Lancer en mode watcher continu au lieu du mode lot par défaut")
    
    args = parser.parse_args()
    
    start_builder(args.account, args.language, args.watch)
