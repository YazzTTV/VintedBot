import os
import time
import subprocess
import requests
from playwright.sync_api import sync_playwright

def is_debugging_active():
    try:
        response = requests.get("http://127.0.0.1:9222/json/version", timeout=1)
        return response.status_code == 200
    except:
        return False

def start_edge():
    if is_debugging_active():
        return True
        
    print("Demarrage de Edge avec le port de debogage 9222...")
    user_data_dir = r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\Bot_Profile"
    
    # Chemin complet car subprocess ne trouve pas msedge dans le PATH
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge_path):
        edge_path = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
        
    subprocess.Popen([edge_path, f'--user-data-dir={user_data_dir}', '--remote-debugging-port=9222'])
    time.sleep(3)
    return True

def test_gemini():
    start_edge()
    
    with sync_playwright() as p:
        print("Connexion a Edge (Mode CDP Fantome)...")
        try:
            browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
        except Exception as e:
            print(f"Erreur de connexion : {e}")
            return
            
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else context.new_page()
        
        print("Navigation vers Gemini...")
        try:
            page.goto("https://gemini.google.com/app", timeout=60000)
        except Exception as e:
            print(f"Erreur de navigation : {e}")
            return
            
        print("Attente du chargement de l'interface (10s)...")
        time.sleep(10)
        
        print("Recherche de la barre de chat...")
        chat_box = page.locator('rich-textarea, div[contenteditable="true"]').first
        
        if chat_box.is_visible():
            print("[OK] Barre de chat trouvee !")
            chat_box.click()
            time.sleep(1)
            print("Frappe du texte au clavier...")
            page.keyboard.type("Genere-moi une image d'un petit chat avec un chapeau rigolo, format portrait 3:4. C'est pour tester mon automatisation.", delay=10)
            time.sleep(1)
            page.keyboard.press("Enter")
            print("[OK] Message envoye ! On attend 30 secondes pour voir s'il genere l'image...")
            time.sleep(30)
        else:
            print("[ERROR] Impossible de trouver la barre de chat.")
            print("[INFO] Si tu n'es pas connecte, tu peux cliquer sur 'Connexion' directement dans la fenetre.")
            print("Google ne te bloquera plus car nous avons rendu le robot invisible !")
            time.sleep(60)
            
        browser.disconnect()

if __name__ == "__main__":
    test_gemini()
