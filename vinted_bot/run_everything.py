import sys
import subprocess
import time
import argparse
from config_manager import list_available_accounts

def main():
    parser = argparse.ArgumentParser(description="Usine Vinted Globale")
    parser.add_argument("--hidden", action="store_true", help="Lance le Scraper et le Generateur IA en arriere-plan (invisible)")
    parser.add_argument("--account", type=str, help="Cible un compte specifique (ex: lena, orane)", default=None)
    args = parser.parse_args()

    print("==================================================")
    print("      🚀 DÉMARRAGE DE L'USINE VINTED 100% PC      ")
    print("==================================================\n")

    if args.hidden:
        print("👻 MODE INVISIBLE ACTIVÉ (Scraper et IA en arrière-plan)")

    # 1. Récupération des comptes actifs
    if args.account:
        accounts = [args.account.lower()]
    else:
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
        cmd = [sys.executable, "scraper.py", "--account", acc, "--count", "5"]
        if args.hidden:
            cmd.append("--hidden")
            
        try:
            subprocess.run(cmd, check=True)
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
        watcher_acc = args.account if args.account else "all"
        cmd = [sys.executable, "watcher.py", "--account", watcher_acc, "--publish", "--submit"]
        if args.hidden:
            cmd.append("--hidden")
            
        # On lance watcher.py avec un timeout de 1 heure pour eviter un blocage infini
        subprocess.run(cmd, timeout=3600)
    except subprocess.TimeoutExpired:
        print("\n❌ Erreur : Le Watcher a depasse le delai de 1 heure (Timeout).")
    except KeyboardInterrupt:
        print("\nArrêt manuel du processus.")
    except Exception as e:
        print(f"❌ Erreur fatale du Watcher : {e}")

    print("\n==================================================")
    print("               🎉 PROCESSUS TERMINÉ               ")
    print("==================================================")

if __name__ == "__main__":
    main()
