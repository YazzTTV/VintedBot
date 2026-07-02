"""
scrape_via_yazz.py — Scrape N produits Shein en RÉUTILISANT le tab Shein déjà
connecté (profil Yazz) sur le Brave de publication (CDP 9220).

Le scraper standard (scraper.py) lance un profil vierge sans session -> Shein
sert 0 carte (bot detection). Ici on pilote l'onglet Shein déjà loggué : la
session passe la détection et les produits se chargent.

Sortie : <output_dir>/shein_*.png + .txt (URL produit) + .price (prix d'achat €,
si détecté sur la carte). list_winners() les voit comme des winners et lit le
prix d'achat pour calculer une marge minimale au moment du pricing.
"""
import os
import re
import sys
import time
import asyncio
import argparse
from urllib.parse import urlparse

from playwright.async_api import async_playwright

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

from scraper import dismiss_popups  # logique de fermeture captcha/popups éprouvée
import routine_state          # anti-doublon : ne pas re-scraper une robe déjà publiée
import routine_pools

CDP = os.environ.get("SCRAPE_CDP_URL", "http://127.0.0.1:9220")
DRESS_INCLUDE = ["dress", "robe", "skirt", "jupe"]
DRESS_EXCLUDE = ["swim", "bikini", "maillot", "beachwear", "bodysuit", "romper", "jumpsuit"]

# Montants adjacents à un € (avant ou après). Décimale à 2 chiffres obligatoire pour
# éviter les faux positifs (notes "4.9", "-70%", "1000+ vendus"...).
_PRICE_RE = re.compile(r'€\s*(\d{1,4}[.,]\d{2})|(\d{1,4}[.,]\d{2})\s*€')


def parse_purchase_price(card_text: str) -> float | None:
    """Extrait le prix d'achat (€) du texte d'une carte produit Shein.

    Shein affiche parfois le prix soldé ET le prix barré : on retient le PLUS BAS
    (= ce qu'on paie réellement). None si aucun montant € plausible trouvé."""
    if not card_text:
        return None
    vals = []
    for m in _PRICE_RE.finditer(card_text):
        raw = m.group(1) or m.group(2)
        try:
            vals.append(float(raw.replace(",", ".")))
        except Exception:
            pass
    vals = [v for v in vals if 0.5 <= v <= 200]  # bornes plausibles pour une robe Shein
    return min(vals) if vals else None


async def find_shein_page(browser):
    for ctx in browser.contexts:
        for pg in ctx.pages:
            if "shein.com" in (pg.url or "").lower():
                return pg
    return None


async def scrape(count: int, url: str, output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    state = routine_state.load_state()  # anti-doublon : produits déjà publiés
    skipped_dup = 0
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(CDP)
        page = await find_shein_page(browser)
        if page is None:
            print("[Scrape] ERREUR : aucun onglet Shein trouvé sur le Brave 9220. "
                  "Ouvre fr.shein.com sur le profil Yazz et relance.")
            return 0
        print(f"[Scrape] Onglet Shein réutilisé : {page.url[:80]}")

        count_saved = 0
        saved_imgs = set()
        page_num = 1

        print(f"[Scrape] Navigation vers : {url}")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(3000)
        await page.keyboard.press("Escape")

        while count_saved < count and page_num <= 6:
            print(f"\n[Scrape] --- Page {page_num} (enregistrés {count_saved}/{count}) ---")
            if "risk/challenge" in (page.url or "").lower():
                print("[Scrape] Risk Challenge détecté -> tentative de fermeture / retour.")
                await dismiss_popups(page)
                await page.wait_for_timeout(2000)

            # masquer popups promo
            try:
                await page.add_style_tag(content="""
                    div[class*='quick-register' i],div[class*='quick-login' i],
                    [class*='coupon' i],[class*='promo' i]{display:none !important;}
                """)
            except Exception:
                pass

            # scroll progressif pour le lazy-load
            for _ in range(20):
                await page.mouse.wheel(0, 900)
                await page.wait_for_timeout(700)
                await dismiss_popups(page)
            await page.evaluate("window.scrollTo(0, 0)")
            await page.wait_for_timeout(1500)

            cards = await page.locator(".product-card, .S-product-item, .S-product-card, [data-product-id]").all()
            if not cards:
                await page.reload(wait_until="domcontentloaded")
                await page.wait_for_timeout(4000)
                cards = await page.locator(".product-card, .S-product-item, .S-product-card, [data-product-id]").all()
            print(f"[Scrape] {len(cards)} cartes trouvées.")

            for i, card in enumerate(cards):
                if count_saved >= count:
                    break
                if i % 3 == 0:
                    await dismiss_popups(page)

                product_url = ""
                try:
                    a = card.locator("a").first
                    if await a.count() > 0:
                        href = await a.get_attribute("href")
                        if href:
                            product_url = href if href.startswith("http") else f"https://fr.shein.com{href}"
                except Exception:
                    pass

                card_text = ""
                try:
                    card_text = (await card.inner_text()).lower()
                except Exception:
                    pass
                url_path = urlparse(product_url).path.lower()
                # exclure la marque SHEIN, garder la marketplace
                if "shein" in card_text or "shein" in url_path:
                    continue
                ul = product_url.lower()
                if DRESS_EXCLUDE and any(w in ul for w in DRESS_EXCLUDE):
                    continue
                if DRESS_INCLUDE and not any(w in ul for w in DRESS_INCLUDE):
                    continue

                # Anti-doublon (URL) : robe déjà publiée -> on saute avant la capture.
                if product_url and routine_state.product_is_used(state, url=product_url):
                    skipped_dup += 1
                    continue

                img_el = None
                for sel in ["img.goods-img-sub", "img.j-ver-smart-img", "img"]:
                    loc = card.locator(sel).first
                    if await loc.count() > 0:
                        img_el = loc
                        break
                if not img_el:
                    continue
                try:
                    await img_el.scroll_into_view_if_needed()
                    await page.wait_for_timeout(300)
                    box = await img_el.bounding_box()
                    src = await img_el.get_attribute("src")
                    data_src = await img_el.get_attribute("data-src")
                    url_img = data_src or src
                    if not url_img:
                        continue
                    key = url_img.split('?')[0].lower()
                    if key in saved_imgs:
                        continue
                    if not box or box["width"] < 100 or box["height"] < 100:
                        continue
                    if not any(k in key for k in ["shein", "fcdn", "ltwebstatic"]):
                        continue
                    if any(k in key for k in ["logo", "icon", "detail", "collar", "back", "hover"]):
                        continue
                    await img_el.scroll_into_view_if_needed()
                    await page.wait_for_timeout(600)
                    await dismiss_popups(page)
                    fname = f"shein_yazz_{int(time.time())}_{count_saved+1}.png"
                    out = os.path.join(output_dir, fname)
                    await img_el.screenshot(path=out)
                    # Anti-doublon (empreinte visuelle) : robe quasi identique déjà publiée
                    # via une autre URL -> on jette la capture.
                    ph = routine_pools.dhash_path(out)
                    if ph and routine_state.product_is_used(state, phash=ph):
                        try:
                            os.remove(out)
                        except Exception:
                            pass
                        saved_imgs.add(key)
                        skipped_dup += 1
                        print(f"[Scrape] [DUP] robe deja publiee (image) -> ignoree  ({product_url[:60]})")
                        continue
                    with open(out.replace(".png", ".txt"), "w", encoding="utf-8") as f:
                        f.write(product_url or "https://fr.shein.com")
                    # Sidecar prix d'achat (.price) : sert au calcul de marge du prix de vente.
                    purchase_price = parse_purchase_price(card_text)
                    if purchase_price:
                        with open(out.replace(".png", ".price"), "w", encoding="utf-8") as f:
                            f.write(f"{purchase_price:.2f}")
                    saved_imgs.add(key)
                    count_saved += 1
                    _pp = f" | achat {purchase_price:.2f}€" if purchase_price else " | achat ?"
                    print(f"[Scrape] [OK] {count_saved}/{count} -> {fname}{_pp}  ({product_url[:70]})")
                    await page.wait_for_timeout(800)
                except Exception:
                    continue

            if count_saved < count:
                page_num += 1
                import re
                if "page=" in url:
                    nxt = re.sub(r'page=\d+', f'page={page_num}', url)
                else:
                    nxt = f"{url}{'&' if '?' in url else '?'}page={page_num}"
                print(f"[Scrape] -> page suivante : {nxt}")
                await page.goto(nxt, wait_until="domcontentloaded", timeout=60000)
                await page.wait_for_timeout(2500)

        print(f"\n[Scrape] [DONE] {count_saved}/{count} produits capturés dans {output_dir} "
              f"({skipped_dup} doublon(s) déjà publié(s) ignoré(s))")
        return count_saved


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=3)
    ap.add_argument("--url", type=str,
                    default="https://fr.shein.com/Women-Dresses-c-1727.html?tag_ids=quickship&price_max=15")
    ap.add_argument("--output-dir", type=str, required=True)
    args = ap.parse_args()
    n = asyncio.run(scrape(args.count, args.url, args.output_dir))
    sys.exit(0 if n > 0 else 2)
