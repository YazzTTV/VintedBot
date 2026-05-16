import os
import shutil
import sys
from config_manager import get_account_config, BASE_DIR

def migrate(account_name="nina"):
    print(f"--- DEMARRAGE DE LA MIGRATION VERS {account_name} ---")
    config = get_account_config(account_name)
    
    mapping = {
        os.path.join(BASE_DIR, "Input_Screenshots"): config.input_dir,
        os.path.join(BASE_DIR, "Output_Listings"): config.output_dir,
        os.path.join(BASE_DIR, "Products_Archive"): config.archive_dir,
    }
    
    # Migrer les répertoires en fusionnant le contenu
    for legacy_dir, target_dir in mapping.items():
        if os.path.exists(legacy_dir) and os.listdir(legacy_dir):
            print(f"Migration du contenu de {os.path.basename(legacy_dir)}...")
            for item in os.listdir(legacy_dir):
                s = os.path.join(legacy_dir, item)
                d = os.path.join(target_dir, item)
                if not os.path.exists(d):
                    try:
                        shutil.move(s, d)
                    except Exception as e:
                        print(f"Erreur lors du déplacement de {s} : {e}")
            print(f"[OK] Contenu déplacé vers {target_dir}")
        else:
            print(f"[INFO] {legacy_dir} n'existe pas ou est vide.")

    # Migrer le fichier Markdown Sourcing_History.md
    legacy_history = os.path.join(BASE_DIR, "Sourcing_History.md")
    if os.path.exists(legacy_history):
        try:
            shutil.move(legacy_history, config.history_path)
            print(f"[OK] Fichier d'historique déplacé vers {config.history_path}")
        except Exception as e:
            print(f"Erreur historique : {e}")
    
    print("\n--- MIGRATION TERMINEE ---")
    print(f"Vérifie que tes dossiers dans '{config.account_dir}' sont bien remplis.")

if __name__ == "__main__":
    # On prend le premier argument comme nom de compte cible, sinon "nina" par défaut.
    target = sys.argv[1] if len(sys.argv) > 1 else "nina"
    migrate(target)
