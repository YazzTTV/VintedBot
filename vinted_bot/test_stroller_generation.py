import os
import sys
import shutil

# Ajout du dossier parent au path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from image_generator import generate_stroller_domestic, generate_stroller_with_dog

def run_test():
    print("=== TEST GÉNÉRATION DE POUSSETTES ===")
    
    # 1. Image source de test
    input_dir = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\orane\Input_Screenshots"
    stroller_images = [f for f in os.listdir(input_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))] if os.path.exists(input_dir) else []
    
    if stroller_images:
        src_img = os.path.join(input_dir, stroller_images[0])
        print(f"[Test] Image de poussette réelle trouvée : {src_img}")
    else:
        archive_dir = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\nina\Products_Archive\shein_quickship_1778267272_1_Robe noire flui"
        src_img = os.path.join(archive_dir, "original_shein_quickship_1778267272_1.png")
        if not os.path.exists(src_img):
            print(f"[Test] [ERROR] Image source de test introuvable : {src_img}")
            return
        print(f"[Test] Aucune poussette réelle. Fallback sur l'image robe : {src_img}")
        
    test_input = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_stroller_input.png")
    shutil.copy2(src_img, test_input)
    print(f"[Test] Image copiée vers le fichier de test : {test_input}")
    
    # 2. Définition du prompt descriptif de test
    prompt_anglais = "A luxury black foldable stroller with comfortable basket and wheels"
    
    # 3. Chemins de sortie
    output_domestic = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_stroller_domestic.jpg")
    output_dog = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_stroller_with_dog.jpg")
    
    # 4. Exécution 1 - Poussette domestique
    print(f"\n--- [1/2] Lancement de generate_stroller_domestic ---")
    success_dom = generate_stroller_domestic(prompt_anglais, test_input, output_domestic)
    if success_dom:
        print(f"[Test] [SUCCESS] Poussette domestique générée sous : {output_domestic}")
    else:
        print("[Test] [ERROR] Échec de la génération domestique.")
        
    # 5. Exécution 2 - Poussette avec chien
    print(f"\n--- [2/2] Lancement de generate_stroller_with_dog ---")
    success_dog = generate_stroller_with_dog(prompt_anglais, test_input, output_dog)
    if success_dog:
        print(f"[Test] [SUCCESS] Poussette avec chien générée sous : {output_dog}")
    else:
        print("[Test] [ERROR] Échec de la génération avec chien.")

    # Nettoyage de l'image d'entrée temporaire
    try:
        if os.path.exists(test_input):
            os.remove(test_input)
    except Exception:
        pass

if __name__ == "__main__":
    run_test()
