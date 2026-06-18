"""
publier_tous.py — Publie (brouillon) sur plusieurs comptes via UNE SEULE instance Brave.

Principe (valide sur ce serveur 6 Go) : toutes les fenetres de profils Brave de
l'utilisateur tournent dans une meme instance exposee sur le port CDP 9220. Chaque
onglet garde la session de son profil. Pour chaque compte, on retrouve SON onglet
(identifie par le login Vinted connecte), on le marque ?bot_profile=<compte>, puis
on appelle le publisher habituel qui agit sur cet onglet.

Pas de fermeture/relance de Brave, pas de dossiers separes.

Usage : python publier_tous.py                 (tous les comptes joignables)
        python publier_tous.py emma             (un seul)
        python publier_tous.py --submit ...      (publier en VRAI au lieu de brouillon)
"""
import os, sys, time, random
from playwright.sync_api import sync_playwright
from vinted_publisher import publish_listing

BOT = os.path.dirname(os.path.abspath(__file__))
PORT = 9220
USERNAME = {
    "emma": "emma_clt3", "Yazz": "yazz_tw", "nina": "nina_mamey",
    "lena": "lenabalvade", "orane": "orane_dlt",
}

SUBMIT = "--submit" in sys.argv
args = [a for a in sys.argv[1:] if not a.startswith("--")]
accounts = args if args else list(USERNAME.keys())


def mark_tab(account: str) -> bool:
    """Trouve l'onglet connecte au compte et le place sur ?bot_profile=<account>."""
    want = USERNAME[account].lower()
    p = sync_playwright().start()
    try:
        b = p.chromium.connect_over_cdp(f"http://127.0.0.1:{PORT}", timeout=60000)
        ctx = b.contexts[0]
        for pg in ctx.pages:
            if "vinted.fr" not in pg.url.lower():
                continue
            try:
                who = pg.evaluate("""async () => {
                    const r = await fetch('/api/v2/users/current', {headers:{'Accept':'application/json'}});
                    if(!r.ok) return null; const j = await r.json();
                    return j.user ? j.user.login : null;
                }""")
            except Exception:
                who = None
            if who and who.lower() == want:
                pg.goto(f"https://www.vinted.fr/?bot_profile={account.lower()}",
                        timeout=45000, wait_until="domcontentloaded")
                time.sleep(1)
                b.close()
                return True
        b.close()
        return False
    finally:
        p.stop()


results = {}
print(f"===== Publication ({'REELLE' if SUBMIT else 'BROUILLON'}) via port {PORT} =====")
todo = [a for a in accounts if a in USERNAME]
for i, acc in enumerate(todo):
    product_dir = os.path.join(BOT, f"_test_out_{acc}")
    print(f"\n----- {acc} ({USERNAME[acc]}) -----")
    if not os.path.isdir(product_dir):
        print(f"  dossier produit introuvable: {product_dir}")
        results[acc] = "pas de dossier"
        continue
    if not mark_tab(acc):
        print(f"  [WARN] onglet de {acc} ({USERNAME[acc]}) introuvable -> compte non ouvert/connecte ?")
        results[acc] = "onglet introuvable"
        continue
    ok = publish_listing(acc, product_dir, auto_submit=SUBMIT, save_draft=not SUBMIT)
    results[acc] = "OK" if ok else "ECHEC"
    if i < len(todo) - 1:
        d = random.uniform(15, 30)
        print(f"  Pause anti-bot {int(d)}s...")
        time.sleep(d)

print("\n===== RECAP =====")
for acc in todo:
    print(f"  {acc:6} : {results.get(acc, '?')}")
