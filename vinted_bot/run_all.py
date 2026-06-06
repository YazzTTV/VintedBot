import os
import sys
import subprocess
from config_manager import list_available_accounts

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    accounts = list_available_accounts()
    
    if not accounts:
        print("[LANCEUR] Aucun compte trouvé dans le dossier Accounts.")
        return
        
    print(f"[LANCEUR] {len(accounts)} compte(s) détecté(s) : {', '.join(accounts)}")
    print("[LANCEUR] Démarrage du Watcher Centralisé (File d'attente multi-compte)...\n")
    
    creation_flags = 0x00000010 if sys.platform == "win32" else 0
    
    # On lance watcher.py avec l'argument --account all
    subprocess.Popen(
        [sys.executable, "watcher.py", "--account", "all", "--publish", "--submit"],
        cwd=base_dir,
        creationflags=creation_flags
    )
        
    print("\n[LANCEUR] ✅ Watcher Centralisé lancé avec succès !")
    print("[LANCEUR] Vous pouvez fermer cette fenêtre, le processus tournera dans sa propre fenêtre.")
    
if __name__ == "__main__":
    main()
