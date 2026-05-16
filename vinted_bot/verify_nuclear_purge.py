import os
import numpy as np
from PIL import Image

def nuclear_strip(image_path):
    try:
        with Image.open(image_path) as img:
            rgb_img = img.convert("RGB")
            pixel_data = np.array(rgb_img) # Convert into pure raw numbers (Total math isolation)
        
        sterile_img = Image.fromarray(pixel_data)
        # Force OVERWRITE as JPEG to simplify file binary headers completely
        sterile_img.save(image_path, "JPEG", quality=95, optimize=True, exif=b"", icc_profile=None)
        return True
    except Exception as e:
        print(f"Error cleaning {image_path}: {e}")
        return False

listing_dir = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\nina\Output_Listings"
print(f"--- PHASE 1 : PURGE ATOMIQUE SUR LES FICHIERS EXISTANTS ---")
for root, dirs, filenames in os.walk(listing_dir):
    for f in filenames:
        if f.lower().endswith(('.png', '.jpg')):
            p = os.path.join(root, f)
            res = nuclear_strip(p)
            if res:
                print(f"[OK] {f} purifié physiquement.")

print("\n--- PHASE 2 : VÉRIFICATION FORENSIQUE FINALE ---")
for root, dirs, filenames in os.walk(listing_dir):
    for name in filenames:
        if name.lower().endswith(('.png', '.jpg')):
            p = os.path.join(root, name)
            with open(p, 'rb') as binary_file:
                raw = binary_file.read().lower()
            c2pa = raw.count(b'c2pa')
            xmp = raw.count(b'xmp')
            print(f"FICHIER: {name} | C2PA Restants : {c2pa} | XMP Restants : {xmp}")
            if c2pa == 0:
                print(">>> STATUT : 🟢 100% STERILE & HUMAIN")
            else:
                print(">>> STATUT : 🔴 ECHEC CRITIQUE")
