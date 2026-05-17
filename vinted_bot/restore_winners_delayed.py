import os
import time
import shutil
from humanizer import humanize_image

# Configuration
ACCOUNT_NAME = "lena"
BASE_DIR = r"D:\AntiGravity\02 Projects\Business Vinted"
ARCHIVE_ROOT = os.path.join(BASE_DIR, "Accounts", ACCOUNT_NAME, "Products_Archive")
OUTPUT_DIR = os.path.join(BASE_DIR, "Accounts", ACCOUNT_NAME, "Output_Listings")

# Liste des dossiers cibles dans l'ordre
WINNERS = [
    "shein_quickship_1778524973_1_Robe bleue mari",
    "shein_quickship_1778524989_5_Robe courte  p",
    "shein_quickship_1778524994_6_Jolie robe noir",
    "shein_quickship_1778524979_3_Petite robe noi",
    "shein_quickship_1778525001_7_Robe noire  fr"
]

def clean_output_dir():
    """Nettoie le dossier output pour s'assurer qu'il est prêt pour la nouvelle annonce."""
    if os.path.exists(OUTPUT_DIR):
        for file in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, file)
            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"[Restorer] Erreur nettoyage : {e}")

def process_and_copy(folder_name):
    source_dir = os.path.join(ARCHIVE_ROOT, folder_name)
    if not os.path.exists(source_dir):
        print(f"[Restorer] [SKIP] Dossier introuvable : {folder_name}")
        return False

    print(f"\n[Restorer] Traitement de : {folder_name}")
    
    # 1. Nettoyage préventif
    clean_output_dir()

    # 2. Identification des images (Selfie et Flat Lay)
    # On cherche les versions upscalées en priorité
    selfie_src = None
    for cand in ["selfie_upscaled.jpg", "selfie.jpg"]:
        p = os.path.join(source_dir, cand)
        if os.path.exists(p):
            selfie_src = p
            break
            
    flat_lay_src = None
    for cand in ["flat_lay_upscaled.jpg", "flat_lay.jpg"]:
        p = os.path.join(source_dir, cand)
        if os.path.exists(p):
            flat_lay_src = p
            break
    
    if not selfie_src and not flat_lay_src:
        print(f"[Restorer] [ERROR] Aucune image trouvée dans {folder_name}")
        return False

    # 3. Humanisation et copie des images vers le dossier Output
    if selfie_src:
        dest_selfie = os.path.join(OUTPUT_DIR, "selfie_upscaled.jpg")
        if humanize_image(selfie_src, dest_selfie, apply_transform=True):
            print(f"[Restorer] [OK] Selfie humanisé.")
            
    if flat_lay_src:
        dest_flat = os.path.join(OUTPUT_DIR, "flat_lay_upscaled.jpg")
        if humanize_image(flat_lay_src, dest_flat, apply_transform=True):
            print(f"[Restorer] [OK] Flat Lay humanisé.")

    # 4. Copie des textes
    for txt_file in ["titre.txt", "description.txt"]:
        src_txt = os.path.join(source_dir, txt_file)
        if os.path.exists(src_txt):
            shutil.copy2(src_txt, os.path.join(OUTPUT_DIR, txt_file))
    
    print(f"[Restorer] [SUCCESS] Produit envoyé dans Output_Listings.")
    return True

if __name__ == "__main__":
    print(f"=== DÉMARRAGE DE LA RESTAURATION DES WINNERS (Compte: {ACCOUNT_NAME}) ===")
    print(f"Délai entre chaque envoi : 180 secondes (3 min)")
    
    for i, folder in enumerate(WINNERS):
        success = process_and_copy(folder)
        
        if i < len(WINNERS) - 1: # Ne pas attendre après le dernier
            print(f"[Restorer] Attente de 180 secondes avant le prochain produit...")
            time.sleep(180)

    print("\n=== RESTAURATION TERMINÉE ===")
