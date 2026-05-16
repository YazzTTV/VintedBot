from PIL import Image
import sys
import os

def strip_metadata(image_path: str):
    """
    Ouvre l'image, copie les pixels dans un tout nouvel objet, et ré-enregistre.
    Cela garantit la suppression de 100% des métadonnées EXIF, XMP, C2PA, etc.
    """
    try:
        if not os.path.exists(image_path):
            print(f"Fichier introuvable : {image_path}")
            return
            
        print(f"Nettoyage de {image_path}...")
        img = Image.open(image_path)
        
        # Créer un nouvel objet Image vierge avec le même mode et taille
        # Note: convert('RGB') permet d'être sûr de purger tout canal caché
        clean_img = Image.new("RGB", img.size)
        
        if img.mode != "RGB":
             img = img.convert("RGB")
             
        clean_img.paste(img)
        
        # Enregistrement forcé (écrase l'original) sans aucune option de métadonnée
        # On force le format JPEG pour maximiser la compatibilité Vinted et la compression
        output_path = image_path
        
        # Si on veut vraiment forcer JPEG même si l'extension dit PNG, on peut. 
        # Vinted s'en moque de l'extension si le header interne est valide, mais c'est plus propre de garder PNG si demandé.
        
        clean_img.save(output_path, quality=95, optimize=True)
        print(f"[SUCCÈS] {image_path} nettoyé de toute métadonnée AI.")
        
    except Exception as e:
        print(f"[ERREUR] Impossible de nettoyer l'image : {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        strip_metadata(sys.argv[1])
    else:
        # Tester sur l'avatar par exemple
        strip_metadata(r"D:\AntiGravity\02 Projects\Business Vinted\vinted_bot\avatar.jpg")
