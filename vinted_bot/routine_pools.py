"""
routine_pools.py — Découverte des sources de la routine de publication.

Deux pools :
  - WINNERS : les captures Winner (produits Shein testés). Réutilisables par
    plusieurs comptes (mannequin/fond différents par compte) ; sourceKey = nom du fichier.
  - FAKES   : les dossiers Produit_XX (vraies photos). SINGLE-USE GLOBAL ; un fake
    assigné à un compte n'est jamais réutilisé. sourceFolder = "Produit_XX".

Les chemins sources sont auto-détectés sur le Bureau (motifs Winner*/ et Banque*Fake*),
surchargables via les variables d'env WINNERS_DIR / FAKES_DIR.
"""
import os
import glob

IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp")
DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop")


def _first_match(*patterns):
    for pat in patterns:
        hits = sorted(glob.glob(pat))
        for h in hits:
            if os.path.isdir(h):
                return h
    return None


def get_winners_dir() -> str | None:
    env = os.environ.get("WINNERS_DIR")
    if env and os.path.isdir(env):
        return env
    # ex: ~/Desktop/Winner-20260621T121118Z-3-001/Winner
    return _first_match(
        os.path.join(DESKTOP, "Winner*", "Winner"),
        os.path.join(DESKTOP, "Winner*"),
    )


def get_fakes_dir() -> str | None:
    env = os.environ.get("FAKES_DIR")
    if env and os.path.isdir(env):
        return env
    # ex: ~/Desktop/Banque d'image Fake Annonce-.../Banque d_image Fake Annonce
    return _first_match(
        os.path.join(DESKTOP, "Banque*Fake*", "Banque*"),
        os.path.join(DESKTOP, "Banque*Fake*"),
    )


def list_winners() -> list[dict]:
    """Retourne [{sourceKey, path, purchase_price}] pour chaque capture Winner.

    purchase_price = coût d'achat Shein (€) lu depuis le sidecar .price (None si absent,
    ex: winners scrapés avant l'ajout de la capture du prix, ou via l'ancien scraper.py)."""
    wdir = get_winners_dir()
    if not wdir:
        return []
    out = []
    for f in sorted(os.listdir(wdir)):
        if f.lower().endswith(IMG_EXTS):
            path = os.path.join(wdir, f)
            out.append({"sourceKey": f, "path": path, "purchase_price": sidecar_price(path)})
    return out


def list_fakes() -> list[dict]:
    """Retourne [{sourceFolder, path, photos[]}] pour chaque dossier Produit_XX (>=1 photo)."""
    fdir = get_fakes_dir()
    if not fdir:
        return []
    out = []
    for d in sorted(glob.glob(os.path.join(fdir, "Produit_*"))):
        if not os.path.isdir(d):
            continue
        photos = sorted(
            os.path.join(d, f) for f in os.listdir(d) if f.lower().endswith(IMG_EXTS)
        )
        if photos:
            out.append({"sourceFolder": os.path.basename(d), "path": d, "photos": photos})
    return out


def sidecar_url(image_path: str) -> str | None:
    """URL produit Shein enregistrée à côté d'une image scrapée (fichier .txt jumeau)."""
    try:
        txt = os.path.splitext(image_path)[0] + ".txt"
        if os.path.exists(txt):
            with open(txt, encoding="utf-8") as f:
                return (f.read().strip() or None)
    except Exception:
        pass
    return None


def sidecar_price(image_path: str) -> float | None:
    """Prix d'achat Shein (€) enregistré à côté d'une image scrapée (fichier .price jumeau).

    Format du fichier : un nombre décimal (ex "12.99"). None si absent/illisible."""
    try:
        p = os.path.splitext(image_path)[0] + ".price"
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                raw = f.read().strip().replace(",", ".")
            return float(raw) if raw else None
    except Exception:
        pass
    return None


def dhash_path(image_path: str, hash_size: int = 8) -> str | None:
    """Empreinte perceptuelle (dHash) 64 bits en hex via Pillow. None si échec.

    Deux images quasi identiques ont une faible distance de Hamming entre leurs
    dHash (robuste au léger recadrage/recompression, contrairement à un hash de
    fichier qui change au moindre octet)."""
    try:
        from PIL import Image
        img = Image.open(image_path).convert("L").resize((hash_size + 1, hash_size), Image.LANCZOS)
        px = list(img.getdata())
        bits = 0
        for row in range(hash_size):
            base = row * (hash_size + 1)
            for col in range(hash_size):
                bits = (bits << 1) | (1 if px[base + col] > px[base + col + 1] else 0)
        return f"{bits:016x}"
    except Exception:
        return None


if __name__ == "__main__":
    w = list_winners()
    f = list_fakes()
    print(f"WINNERS_DIR = {get_winners_dir()}")
    print(f"  -> {len(w)} winners")
    print(f"FAKES_DIR   = {get_fakes_dir()}")
    print(f"  -> {len(f)} fakes (photos: {sum(len(x['photos']) for x in f)})")
