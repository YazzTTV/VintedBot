import os
import subprocess
import sys
from config_manager import list_available_accounts, get_account_config

def publish_pending_archives():
    accounts = list_available_accounts()
    
    print("="*50)
    print("🚀 REPRISE DES PUBLICATIONS EN ATTENTE")
    print("="*50)
    
    for acc in accounts:
        config = get_account_config(acc)
        archive_dir = config.archive_dir
        
        if not os.path.exists(archive_dir):
            continue
            
        folders = [os.path.join(archive_dir, d) for d in os.listdir(archive_dir) if os.path.isdir(os.path.join(archive_dir, d))]
        # Trier du plus ancien au plus récent
        folders.sort(key=os.path.getmtime)
        
        for folder in folders:
            published_marker = os.path.join(folder, "published.txt")
            if os.path.exists(published_marker):
                continue  # Déjà publié avec succès
                
            titre_path = os.path.join(folder, "titre.txt")
            if not os.path.exists(titre_path):
                continue
                
            with open(titre_path, "r", encoding="utf-8") as f:
                titre = f.read().strip()
                
            print(f"\n📦 Produit trouvé : {titre}")
            print(f"   Compte  : {acc.upper()}")
            print(f"   Dossier : {os.path.basename(folder)}")
            
            ans = input("   👉 Publier maintenant ? (O = Oui / N = Non / S = Marquer comme déjà publié) : ").strip().lower()
            
            if ans == 's':
                with open(published_marker, "w") as f:
                    f.write("OK")
                print("   [OK] Marqué comme publié (ignoré pour la suite).")
            elif ans == 'o' or ans == '':
                print(f"   🔄 Lancement de la publication...")
                cmd = [sys.executable, "vinted_publisher.py", "--account", acc, "--dir", folder, "--submit"]
                try:
                    subprocess.run(cmd, check=True)
                    print("   ✅ Publication terminée !")
                except subprocess.CalledProcessError:
                    print("   ❌ Erreur lors de la publication.")
            else:
                print("   ⏭️ Ignoré pour cette fois.")

    print("\n🎉 Terminé ! Tous les dossiers ont été passés en revue.")

if __name__ == "__main__":
    publish_pending_archives()
