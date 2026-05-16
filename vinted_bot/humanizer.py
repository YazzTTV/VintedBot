"""
Moteur d'Humanisation des Images pour Vinted Bot.
1. Applique des micro-rotations et recadrages aléatoires (casse l'empreinte de fond pixel-à-pixel).
2. Injecte des métadonnées EXIF réalistes de smartphone Apple/iOS.
"""
import os
import random
import datetime
from PIL import Image, ImageEnhance

def get_iphone_profile():
    """Génère un profil technique d'un iPhone 14 Pro fixe (le même pour tout le bot) avec optiques variables."""
    # Un seul modèle fixe et premium pour tout le bot afin de simuler l'unique téléphone physique de l'utilisateur
    make = "Apple"
    model = "iPhone 14 Pro"
    software = "iOS 17.4.1"
    
    # Les paramètres de prise de vue varient naturellement d'une photo à l'autre selon la lumière
    f_numbers = [(17, 10), (22, 10), (28, 10)] # F/1.78, F/2.2, F/2.8 (Lentilles réelles iPhone 14 Pro)
    focal_lengths = [(68, 10), (22, 10), (90, 10)] # 6.86mm, 2.22mm, 9.0mm (Focales physiques réelles)
    isos = [32, 40, 50, 64, 80, 100, 125, 160, 200, 250]
    
    return {
        "Make": make,
        "Model": model,
        "Software": software,
        "FNumber": random.choice(f_numbers),
        "FocalLength": random.choice(focal_lengths),
        "ISO": random.choice(isos)
    }

def apply_human_transform(img: Image.Image) -> Image.Image:
    """
    Applique un micro-mouvement aléatoire pour briser le hachage de fond static :
    - Rotation aléatoire imperceptible (-0.5° à +0.5°)
    - Zoom/Crop aléatoire (2% à 4%)
    - Micro-ajustement de la luminosité/contraste (+/- 2%)
    """
    width, height = img.size
    
    # 1. Micro rotation
    angle = random.uniform(-0.5, 0.5)
    # Faire la rotation sans étendre l'image (on va masquer les coins via le zoom suivant)
    img = img.rotate(angle, resample=Image.Resampling.BILINEAR, expand=False)
    
    # 2. Micro Zoom / Recadrage (pour éliminer tout coin noir créé par la rotation et décaler les pixels)
    zoom_factor = random.uniform(1.025, 1.045) # Zoom de 2.5% à 4.5%
    new_w = int(width / zoom_factor)
    new_h = int(height / zoom_factor)
    
    # Décalage aléatoire infime du centre pour le recadrage (1-3 pixels)
    center_x_offset = random.randint(-2, 2)
    center_y_offset = random.randint(-2, 2)
    
    left = max(0, ((width - new_w) // 2) + center_x_offset)
    top = max(0, ((height - new_h) // 2) + center_y_offset)
    right = min(width, left + new_w)
    bottom = min(height, top + new_h)
    
    img = img.crop((left, top, right, bottom))
    
    # Ramener aux dimensions d'origine avec interpolation de haute qualité
    img = img.resize((width, height), resample=Image.Resampling.LANCZOS)
    
    # 3. Micro variations visuelles (lum/contraste imperceptibles mais changent les hashs des pixels)
    if random.random() > 0.3:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(random.uniform(0.98, 1.02))
    if random.random() > 0.3:
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(random.uniform(0.98, 1.02))
        
    return img

def humanize_image(input_path: str, output_path: str, apply_transform: bool = True) -> bool:
    """
    Charge l'image, applique la transformation géométrique aléatoire (optionnel)
    et injecte des métadonnées EXIF iPhone complètes et réalistes.
    """
    try:
        if not os.path.exists(input_path):
            print(f"[Humanizer] ERREUR : Fichier d'entrée introuvable : {input_path}")
            return False
            
        with Image.open(input_path) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
                
            # 1. Transformation visuelle
            if apply_transform:
                img = apply_human_transform(img)
                print(f"[Humanizer] Micro-transformation géométrique appliquée sur {os.path.basename(input_path)}")
            
            # 2. Création des métadonnées EXIF
            exif = img.getexif()
            
            # Purge totale des anciens EXIF système pour repartir à zéro
            exif.clear()
            
            profile = get_iphone_profile()
            
            # Standard IFD0 tags
            exif[271] = profile["Make"]      # Make
            exif[272] = profile["Model"]     # Model
            exif[305] = profile["Software"]  # Software
            exif[274] = 1                    # Orientation: Horizontal (normal)
            exif[531] = 1                    # YCbCrPositioning: Centered
            
            # Calculer une heure de prise de vue décalée aléatoirement dans le passé (5 à 45 min avant l'upload)
            dt = datetime.datetime.now() - datetime.timedelta(minutes=random.randint(5, 45), seconds=random.randint(0, 59))
            time_str = dt.strftime("%Y:%m:%d %H:%M:%S")
            exif[306] = time_str             # DateTime
            
            # Sub-IFD EXIF tags (34665 / 0x8769)
            exif_ifd = exif.get_ifd(0x8769)
            exif_ifd[36867] = time_str               # DateTimeOriginal
            exif_ifd[36868] = time_str               # DateTimeDigitized
            exif_ifd[34855] = profile["ISO"]         # ISO
            exif_ifd[33437] = profile["FNumber"]     # FNumber
            exif_ifd[37386] = profile["FocalLength"] # FocalLength
            exif_ifd[40962] = img.width              # PixelXDimension
            exif_ifd[40963] = img.height             # PixelYDimension
            exif_ifd[40961] = 1                      # ColorSpace (sRGB)
            
            # 3. Sauvegarde physique avec les EXIFs humains
            img.save(output_path, "JPEG", quality=95, optimize=True, exif=exif, icc_profile=None)
            
            print(f"[Humanizer] [SUCCÈS] Empreinte humaine injectée dans {os.path.basename(output_path)} ({profile['Model']}, {profile['Software']})")
            return True
            
    except Exception as e:
        print(f"[Humanizer] [ERREUR] Echec de l'humanisation : {e}")
        return False

if __name__ == "__main__":
    # Test direct
    import glob
    test_files = glob.glob(r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\*\Products_Archive\*\selfie.jpg")
    if test_files:
        test_img = test_files[0]
        output_test = test_img.replace(".jpg", "_humanized_test.jpg")
        humanize_image(test_img, output_test, apply_transform=True)
        print(f"Image de test humanisée générée : {output_test}")
    else:
        print("Aucune image selfie trouvée pour tester.")
