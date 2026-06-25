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
    """Retourne [{sourceKey, path}] pour chaque capture Winner."""
    wdir = get_winners_dir()
    if not wdir:
        return []
    out = []
    for f in sorted(os.listdir(wdir)):
        if f.lower().endswith(IMG_EXTS):
            out.append({"sourceKey": f, "path": os.path.join(wdir, f)})
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


if __name__ == "__main__":
    w = list_winners()
    f = list_fakes()
    print(f"WINNERS_DIR = {get_winners_dir()}")
    print(f"  -> {len(w)} winners")
    print(f"FAKES_DIR   = {get_fakes_dir()}")
    print(f"  -> {len(f)} fakes (photos: {sum(len(x['photos']) for x in f)})")
