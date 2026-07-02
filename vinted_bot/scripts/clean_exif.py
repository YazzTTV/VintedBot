import piexif
from PIL import Image
import sys
import datetime
import os

def process_image(input_path, output_path):
    try:
        print(f"Lecture de l'image: {input_path}")
        img = Image.open(input_path)
        
        # S'assurer que c'est du RGB (pour JPEG)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Données EXIF fakes (Imitation iPhone 13)
        now = datetime.datetime.now().strftime("%Y:%m:%d %H:%M:%S")
        
        zeroth_ifd = {
            piexif.ImageIFD.Make: b"Apple",
            piexif.ImageIFD.Model: b"iPhone 13",
            piexif.ImageIFD.Software: b"16.1.1",
            piexif.ImageIFD.DateTime: now.encode('utf-8')
        }
        
        exif_ifd = {
            piexif.ExifIFD.DateTimeOriginal: now.encode('utf-8'),
            piexif.ExifIFD.DateTimeDigitized: now.encode('utf-8'),
            piexif.ExifIFD.LensMake: b"Apple",
            piexif.ExifIFD.LensModel: b"iPhone 13 back dual camera 5.1mm f/1.6",
            # Ajout de données focales basiques pour faire plus "vrai"
            piexif.ExifIFD.FocalLength: (510, 100),
            piexif.ExifIFD.FNumber: (16, 10),
            piexif.ExifIFD.ISOSpeedRatings: 50
        }
        
        exif_dict = {"0th": zeroth_ifd, "Exif": exif_ifd, "1st": {}, "thumbnail": None, "GPS": {}}
        exif_bytes = piexif.dump(exif_dict)
        
        # Sauvegarde (efface les métadonnées existantes, notamment celles de l'IA, et injecte le faux EXIF)
        img.save(output_path, "jpeg", exif=exif_bytes, quality=95)
        print(f"✅ Succès ! L'image a été nettoyée et dotée d'une signature d'iPhone 13.")
        print(f"Fichier final : {output_path}")
        
    except Exception as e:
        print(f"❌ Erreur lors du traitement: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python add_exif.py <input_image.jpg> <output_image.jpg>")
    else:
        process_image(sys.argv[1], sys.argv[2])
