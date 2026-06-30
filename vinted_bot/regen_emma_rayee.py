"""
regen_emma_rayee.py — Régénère les IMAGES de la robe rayée d'emma (selfie à 3 bras)
en conservant titre/description/prix. Réutilise salve.prepare_winner.
Source : _scrape_winners_pm (salve du 30/06 après-midi).
"""
import os
import sys
import asyncio

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

import salve
from config_manager import get_account_config

ACCOUNT = "emma"
BOT = os.path.dirname(os.path.abspath(__file__))
SCRAPE = os.path.join(BOT, "_scrape_winners_pm")
SALVE_OUT = os.path.join(BOT, "_salve_out", ACCOUNT)

KEY = "shein_yazz_1782830477_3.png"   # robe rayée bleue
DIRN = "w1_shein_yazz_1782830477_3"


async def main():
    cfg = get_account_config(ACCOUNT)
    out = os.path.join(SALVE_OUT, DIRN)
    os.makedirs(out, exist_ok=True)
    bak = {}
    for t in ("titre.txt", "description.txt", "price.txt"):
        p = os.path.join(out, t)
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                bak[t] = f.read()
    winner = {"path": os.path.join(SCRAPE, KEY), "sourceKey": KEY, "sold_count": 0}
    print(f"\n=== Régénération {KEY} -> {DIRN} ===")
    ok = await salve.prepare_winner(ACCOUNT, cfg, winner, out)
    for t, v in bak.items():
        with open(os.path.join(out, t), "w", encoding="utf-8") as f:
            f.write(v)
    print(f"=== images régénérées (ok={ok}), textes restaurés ===")


if __name__ == "__main__":
    asyncio.run(main())
