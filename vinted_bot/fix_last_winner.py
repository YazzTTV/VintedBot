import os, shutil
from humanizer import humanize_image

folder = "shein_quickship_1778525001_7_Robe noire à fr"
src = os.path.join(r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\lena\Products_Archive", folder)
out = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\lena\Output_Listings"

# Nettoyage
if os.path.exists(out):
    for f in os.listdir(out):
        p = os.path.join(out, f)
        if os.path.isfile(p): os.remove(p)

# Selfie
s_src = os.path.join(src, "selfie_upscaled.jpg")
if not os.path.exists(s_src): s_src = os.path.join(src, "selfie.jpg")
humanize_image(s_src, os.path.join(out, "selfie_upscaled.jpg"))

# Flat Lay
f_src = os.path.join(src, "flat_lay_upscaled.jpg")
if not os.path.exists(f_src): f_src = os.path.join(src, "flat_lay.jpg")
humanize_image(f_src, os.path.join(out, "flat_lay_upscaled.jpg"))

# Textes
shutil.copy2(os.path.join(src, "titre.txt"), os.path.join(out, "titre.txt"))
shutil.copy2(os.path.join(src, "description.txt"), os.path.join(out, "description.txt"))
print("Dernier winner envoyé avec succès.")
