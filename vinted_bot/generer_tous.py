"""
generer_tous.py — Genere une annonce complete (analyse + 3 images) pour chaque compte,
a partir d'une photo produit. Sortie : vinted_bot/_test_out_<compte>/ (images + titre.txt + description.txt),
prete pour publier_tous.py.

Pour chaque compte : analyse Gemini dans SA langue (fr/nl) -> titre/description/prompt anglais,
puis generation des images avec l'avatar du compte (selfie/profil/cintre pour la niche garment).

Usage : python generer_tous.py <photo_produit>            (tous les comptes)
        python generer_tous.py <photo_produit> emma nina   (ceux-la)
"""
import os, sys, asyncio
from dotenv import load_dotenv
load_dotenv()

from config_manager import get_account_config
from processor import analyze_screenshot
from nano_banana import generate_all_images_parallel_async

BOT = os.path.dirname(os.path.abspath(__file__))
ALL = ["emma", "Yazz", "nina", "lena", "orane"]

if len(sys.argv) < 2:
    print("Usage: python generer_tous.py <photo_produit> [comptes...]")
    sys.exit(1)

product = sys.argv[1]
accounts = sys.argv[2:] if len(sys.argv) > 2 else ALL

if not os.path.exists(product):
    print(f"Photo produit introuvable: {product}")
    sys.exit(1)


async def gen_account(account: str):
    cfg = get_account_config(account)
    print(f"\n===== {account} (langue={cfg.language}, taille={cfg.size}, niche={cfg.niche}) =====")
    data = analyze_screenshot(product, cfg.size, cfg.language, cfg.niche)
    if not data:
        print(f"  [ERREUR] analyse echouee pour {account}")
        return account, False
    titre = data.get("titre_vinted", "")
    desc = data.get("description_vinted", "")
    prompt = data.get("prompt_image_anglais", "")
    print(f"  Titre: {titre}")

    out_dir = os.path.join(BOT, f"_test_out_{account}")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "titre.txt"), "w", encoding="utf-8") as f:
        f.write(titre)
    with open(os.path.join(out_dir, "description.txt"), "w", encoding="utf-8") as f:
        f.write(desc)

    res = await generate_all_images_parallel_async(
        niche=cfg.niche,
        file_path=product,
        avatar_path=cfg.avatar_path,
        floor_template_path=cfg.floor_template_path,
        hanger_template_path=cfg.hanger_template_path if os.path.exists(cfg.hanger_template_path) else None,
        product_dir=out_dir,
        prompt=prompt,
        niche_def=cfg.niche_def,
    )
    n = sum(1 for v in res.values() if v)
    print(f"  Images generees -> {out_dir} ({n} cles)")
    return account, True


async def main():
    print(f"Produit: {product}\nComptes: {accounts}")
    for acc in accounts:
        try:
            await gen_account(acc)
        except Exception as e:
            print(f"  [ERREUR] {acc}: {e}")

asyncio.run(main())
print("\nTermine. Verifie les dossiers _test_out_<compte>, puis: python publier_tous.py")
