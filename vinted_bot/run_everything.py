import sys
import subprocess
import time
from config_manager import list_available_accounts

def main():
    print("==================================================")
    print("      🚀 DÉMARRAGE DE L'USINE VINTED 100% PC      ")
    print("==================================================\n")

    # 1. Récupération des comptes actifs
    accounts = list_available_accounts()
    if not accounts:
        print("❌ Aucun compte actif trouvé dans la configuration.")
        return

    print(f"✅ Comptes détectés : {', '.join([acc.capitalize() for acc in accounts])}")
    print(f"📦 Scraping prévu : 5 articles par compte (Total: {5 * len(accounts)} articles)\n")

    # 2. Boucle de Scraping Shein
    print("--- 🕷️ PHASE 1 : SCRAPING SHEIN ---")
    for acc in accounts:
        print(f"\n>> Démarrage du Scraper pour le compte : {acc.upper()}")
        # On lance scraper.py en mode synchrone (on attend qu'il finisse avant de passer au compte suivant)
        try:
            subprocess.run([
                sys.executable, "scraper.py", 
                "--account", acc, 
                "--count", "5"
            ], check=True)
            print(f"✅ Scraping terminé pour {acc.upper()}.")
        except subprocess.CalledProcessError as e:
            print(f"❌ Erreur lors du scraping pour {acc.upper()} : {e}")
        
        # Pause de courtoisie entre chaque compte pour ne pas brusquer Shein
        time.sleep(3)

    print("\n--- ✅ PHASE 1 TERMINÉE ---")
    print("Tous les articles ont été scrapés et déposés dans les dossiers Input_Screenshots respectifs.\n")

    # 3. Lancement du Watcher et de la publication
    print("--- ⚙️ PHASE 2 : GÉNÉRATION IA & PUBLICATION ---")
    print("Lancement du Watcher centralisé (mode: publication automatique)...\n")
    
    try:
        # On lance watcher.py qui va dépiler tous les dossiers Input_Screenshots
        subprocess.run([
            sys.executable, "watcher.py", 
            "--account", "all", 
            "--publish", "--submit"
        ])
    except KeyboardInterrupt:
        print("\nArrêt manuel du processus.")
    except Exception as e:
        print(f"❌ Erreur fatale du Watcher : {e}")

    print("\n==================================================")
    print("               🎉 PROCESSUS TERMINÉ               ")
    print("==================================================")

if __name__ == "__main__":
    main()
