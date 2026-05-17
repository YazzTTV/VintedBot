import os
import time
import shutil
from humanizer import humanize_image

# Configuration
ACCOUNT_NAME = "lena"
BASE_DIR = r"D:\AntiGravity\02 Projects\Business Vinted"
ARCHIVE_ROOT = os.path.join(BASE_DIR, "Accounts", ACCOUNT_NAME, "Products_Archive")
OUTPUT_DIR = os.path.join(BASE_DIR, "Accounts", ACCOUNT_NAME, "Output_Listings")

# Liste restreinte des 3 robes demandées
WINNERS = [
    "shein_quickship_1778524973_1_Robe bleue mari",
    "shein_quickship_1778524989_5_Robe courte  p",
    "shein_quickship_1778524994_6_Jolie robe noir"
]

def clean_output_dir():
    if os.path.exists(OUTPUT_DIR):
        for file in os.listdir(OUTPUT_DIR):
            file_path = os.path.join(OUTPUT_DIR, file)
            try:
                if os.path.isfile(file_path): os.remove(file_path)
            except Exception as e: print(f"Erreur nettoyage : {e}")

def process_and_copy(folder_name):
    source_dir = os.path.join(ARCHIVE_ROOT, folder_name)
    if not os.path.exists(source_dir):
        print(f"[Restorer] [SKIP] Dossier introuvable : {folder_name}")
        return False

    print(f"\n[Restorer] Traitement de : {folder_name}")
    clean_output_dir()

    # Selfie
    selfie_src = None
    for cand in ["selfie_upscaled.jpg", "selfie.jpg"]:
        p = os.path.join(source_dir, cand)
        if os.path.exists(p): selfie_src = p; break
            
    # Flat Lay
    flat_lay_src = None
    for cand in ["flat_lay_upscaled.jpg", "flat_lay.jpg"]:
        p = os.path.join(source_dir, cand)
        if os.path.exists(p): flat_lay_src = p; break
    
    # Humanisation
    if selfie_src:
        humanize_image(selfie_src, os.path.join(OUTPUT_DIR, "selfie_upscaled.jpg"), apply_transform=True)
    if flat_lay_src:
        humanize_image(flat_lay_src, os.path.join(OUTPUT_DIR, "flat_lay_upscaled.jpg"), apply_transform=True)

    # Textes
    for txt_file in ["titre.txt", "description.txt"]:
        shutil.copy2(os.path.join(source_dir, txt_file), os.path.join(OUTPUT_DIR, txt_file))
    
    print(f"[Restorer] [SUCCESS] Produit envoyé dans Output_Listings.")
    return True

if __name__ == "__main__":
    for i, folder in enumerate(WINNERS):
        process_and_copy(folder)
        if i < len(WINNERS) - 1:
            print(f"Attente de 180 secondes...")
            time.sleep(180)
    print("RESTAURATION TERMINÉE.")
