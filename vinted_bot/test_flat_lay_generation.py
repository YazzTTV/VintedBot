import os
import sys
from image_generator import generate_flat_lay

# Ajout du dossier parent au path si besoin
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def run_test():
    print("=== TEST GÉNÉRATION FLAT LAY ===")
    
    # 1. Sélection d'une image d'entrée de test
    input_dir = r"D:\AntiGravity\02 Projects\Business Vinted\Input_Screenshots"
    if not os.path.exists(input_dir):
        print(f"Dossier d'entrée introuvable : {input_dir}")
        return
        
    images = [f for f in os.listdir(input_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    if not images:
        print(f"Aucune image de test trouvée dans {input_dir}")
        return
        
    test_image_name = images[0]
    input_image_path = os.path.join(input_dir, test_image_name)
    print(f"[Test] Image de test sélectionnée : {test_image_name}")
    
    # 2. Définition du prompt de test
    prompt_anglais = "A nice yellow dress with short sleeves"
    
    # 3. Chemin de sortie
    output_path = r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\test_flat_lay_output.jpg"
    
    # 4. Exécution
    print(f"[Test] Lancement de la génération flat lay...")
    success = generate_flat_lay(prompt_anglais, input_image_path, output_path)
    
    if success:
        print(f"\n[Test] [SUCCESS] L'image flat lay a été générée et enregistrée avec succès sous :\n   {output_path}")
    else:
        print("\n[Test] [ERROR] La génération de l'image flat lay a échoué. Vérifier les logs ou l'image d'erreur de secours.")

if __name__ == "__main__":
    run_test()
