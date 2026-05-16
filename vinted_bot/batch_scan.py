import os
from PIL import Image

def scan_file(fpath):
    with open(fpath, 'rb') as f:
        raw = f.read().lower()
    c2pa = raw.count(b'c2pa')
    xmp = raw.count(b'xmp')
    dalle = raw.count(b'dall-e')
    return (c2pa, xmp, dalle)

listing_dir = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\nina\Output_Listings"
print(f"Scanning directory: {listing_dir}\n")

for root, dirs, files in os.walk(listing_dir):
    for name in files:
        if name.lower().endswith(('.png', '.jpg', '.jpeg')):
            p = os.path.join(root, name)
            res = scan_file(p)
            print(f"FILE: {name}")
            print(f" - C2PA tags: {res[0]}")
            print(f" - XMP tags: {res[1]}")
            print(f" - DALL-E tags: {res[2]}")
            print("-" * 30)
