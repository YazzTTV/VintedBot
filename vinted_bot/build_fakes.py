import os
import shutil
import time
from processor import analyze_screenshot

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    fake_bank_dir = os.path.join(base_dir, "Fake_Bank")
    raw_dir = os.path.join(fake_bank_dir, "Raw")
    
    if not os.path.exists(raw_dir):
        os.makedirs(raw_dir)
        print(f"[FAKE BUILDER] Le dossier {raw_dir} a été créé.")
        print("[FAKE BUILDER] Placez vos dossiers d'images brutes dans 'Raw' (ex: Raw/veste_bleue/image1.jpg) et relancez le script.")
        return
        
    raw_folders = [d for d in os.listdir(raw_dir) if os.path.isdir(os.path.join(raw_dir, d))]
    
    if not raw_folders:
        print(f"[FAKE BUILDER] Aucun sous-dossier trouvé dans {raw_dir}.")
        print("[FAKE BUILDER] Ajoutez des dossiers contenant vos photos et réessayez.")
        return
        
    print(f"[FAKE BUILDER] {len(raw_folders)} lot(s) d'images trouvés. Début de la génération...\n")
    
    success_count = 0
    
    for folder_name in raw_folders:
        folder_path = os.path.join(raw_dir, folder_name)
        images = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
        
        if not images:
            print(f"-> [IGNORE] {folder_name} : Aucune image trouvée.")
            continue
            
        images.sort()
        first_image_path = os.path.join(folder_path, images[0])
        
        print(f"\n-> Traitement de '{folder_name}' ({len(images)} images)...")
        print("   Appel à l'IA (Edge Gemini) pour générer le titre et la description...")
        
        # On utilise le processor existant (Playwright + Edge Gemini) pour ne rien payer
        result = analyze_screenshot(first_image_path, size="M", language="fr")
        
        if not result or not result.get("titre_vinted"):
            print(f"   [ERREUR] L'IA n'a pas pu générer les textes pour {folder_name}.")
            continue
            
        titre = result["titre_vinted"]
        description = result.get("description_vinted", "")
        
        print(f"   [SUCCÈS] Titre généré : {titre}")
        
        # Création du dossier final
        timestamp = int(time.time())
        dest_folder = os.path.join(fake_bank_dir, f"item_{timestamp}_{folder_name.replace(' ', '_')}")
        os.makedirs(dest_folder, exist_ok=True)
        
        # Déplacement des images
        for img in images:
            src_path = os.path.join(folder_path, img)
            dest_path = os.path.join(dest_folder, img)
            shutil.move(src_path, dest_path)
            
        # Création des fichiers textes
        with open(os.path.join(dest_folder, "titre.txt"), "w", encoding="utf-8") as f:
            f.write(titre)
            
        with open(os.path.join(dest_folder, "description.txt"), "w", encoding="utf-8") as f:
            f.write(description)
            
        # Suppression du dossier brut vide
        try:
            os.rmdir(folder_path)
        except OSError:
            pass # Dossier pas vide (peut-être des fichiers cachés)
            
        print(f"   [TERMINÉ] Article sauvegardé dans Fake_Bank/{os.path.basename(dest_folder)}")
        success_count += 1
        time.sleep(3) # Pause pour le navigateur Edge
        
    print(f"\n[FAKE BUILDER] Opération terminée. {success_count} faux articles générés avec succès !")

if __name__ == "__main__":
    main()
