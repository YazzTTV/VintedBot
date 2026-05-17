import os, shutil
from humanizer import humanize_image

# On utilise un pattern de recherche pour éviter les problèmes de caractères spéciaux
root = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\lena\Products_Archive"
out = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\lena\Output_Listings"

# Trouver le dossier par son ID
folder_id = "1778524989_5"
target_folder = None
for d in os.listdir(root):
    if folder_id in d:
        target_folder = os.path.join(root, d)
        break

if target_folder:
    print(f"Dossier trouvé : {target_folder}")
    # Nettoyage
    for f in os.listdir(out):
        p = os.path.join(out, f)
        if os.path.isfile(p): os.remove(p)

    # Selfie
    s_src = os.path.join(target_folder, "selfie_upscaled.jpg")
    if not os.path.exists(s_src): s_src = os.path.join(target_folder, "selfie.jpg")
    humanize_image(s_src, os.path.join(out, "selfie_upscaled.jpg"))

    # Flat Lay
    f_src = os.path.join(target_folder, "flat_lay_upscaled.jpg")
    if not os.path.exists(f_src): f_src = os.path.join(target_folder, "flat_lay.jpg")
    humanize_image(f_src, os.path.join(out, "flat_lay_upscaled.jpg"))

    # Textes
    shutil.copy2(os.path.join(target_folder, "titre.txt"), os.path.join(out, "titre.txt"))
    shutil.copy2(os.path.join(target_folder, "description.txt"), os.path.join(out, "description.txt"))
    print("Robe courte marron envoyée avec succès.")
else:
    print("Dossier introuvable.")
