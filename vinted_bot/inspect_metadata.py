import os
from PIL import Image
import time

listing_dir = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\nina\Output_Listings"
if not os.path.exists(listing_dir):
    print("Dossier introuvable.")
    exit()

files = []
for root, dirs, filenames in os.walk(listing_dir):
    for f in filenames:
        if f.lower().endswith(".jpg") or f.lower().endswith(".png"):
            files.append(os.path.join(root, f))

if not files:
    print("Aucun fichier image trouve dans Output_Listings.")
    exit()

# Prendre le fichier le plus récent
files.sort(key=os.path.getmtime)
target = files[-1]
print(f"\n[Diagnostic] Fichier cible : {os.path.basename(target)}")
print(f"[Diagnostic] Chemin complet : {target}")

try:
    img = Image.open(target)
    print(f"-> Format: {img.format}")
    print(f"-> Info Dictionary (Metadata existante): {list(img.info.keys())}")
    
    has_exif = hasattr(img, '_getexif') and img._getexif() is not None
    print(f"-> Contient EXIF standard: {has_exif}")
    
    # Chercher manuellement des marqueurs binaires C2PA ou DALL-E dans le fichier brut
    with open(target, 'rb') as f:
        raw_data = f.read()
        
    sig_count_c2pa = raw_data.count(b'c2pa')
    sig_count_dalle = raw_data.count(b'dalle')
    sig_count_adobe = raw_data.count(b'adobe')
    sig_count_xmp = raw_data.count(b'xmp')
    
    print("\n[Scan Binaire Direct du Fichier] :")
    print(f"- Occurrences 'c2pa'  : {sig_count_c2pa}")
    print(f"- Occurrences 'dalle' : {sig_count_dalle}")
    print(f"- Occurrences 'adobe' : {sig_count_adobe}")
    print(f"- Occurrences 'xmp'   : {sig_count_xmp}")
    
    if sig_count_c2pa == 0 and not has_exif and sig_count_xmp <= 2:
        print("\n✅ VERDICT : Le fichier est PROPRE du point de vue des métadonnées.")
        print("Si le téléphone détecte encore de l'IA, c'est de l'analyse VISUELLE ou une empreinte invisible dans les pixels.")
    else:
        print("\n❌ VERDICT : Il reste des traces binaires.")
except Exception as e:
    print(f"Erreur analyse : {e}")
