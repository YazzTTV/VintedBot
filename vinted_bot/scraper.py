import asyncio
import argparse
import os
import time
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from config_manager import get_account_config
from edge_browser import start_edge, CDP_URL

async def dismiss_popups(page):
    """
    Ferme automatiquement les pop-ups indésirables (captcha, bannières promo orange).
    """
    try:
        # 1. Captcha - Recherche de la petite croix de fermeture 'x'
        captcha_selectors = [
            ".sh-captcha-close-btn",
            ".sh-captcha-close",
            ".captcha-close",
            ".captcha-close-btn",
            ".geetest_close",
            ".geetest_panel_close",
            "[class*='captcha' i] [class*='close' i]",
            "div[class*='captcha' i] span[class*='close' i]",
            "div[class*='captcha' i] svg",
            "div[class*='captcha' i] img[src*='close' i]",
            "div[class*='risk'] span > i",
            "div[class*='risk'] i",
            "[class*='risk-challenge'] [class*='close' i]",
            ".she-close",
            ".risk-challenge-modal i"
        ]
        for sel in captcha_selectors:
            try:
                el = page.locator(sel).first
                if await el.is_visible():
                    print(f"[Scraper] Captcha detecte (via '{sel}'). Fermeture...")
                    await el.click(force=True, timeout=1000)
                    await page.wait_for_timeout(500)
                    break
            except Exception:
                continue

        # 2. Bandeau promo orange sur la droite de l'écran
        promo_selectors = [
            ".quick-register-sidebar-close",
            ".quick-register-close",
            "div[class*='quick-register' i] [class*='close' i]",
            "div[class*='quick-register' i] svg",
            "div[class*='quick-register' i] [class*='arrow' i]",
            "div[class*='quick-register' i] [class*='sidebar-tab' i]",
            "div[class*='quick-register' i] button",
            "[class*='coupon' i] [class*='close' i]"
        ]
        for sel in promo_selectors:
            try:
                el = page.locator(sel).first
                if await el.is_visible():
                    print(f"[Scraper] Pop-up promotionnel orange detecte (via '{sel}'). Fermeture...")
                    await el.click(force=True, timeout=1000)
                    await page.wait_for_timeout(500)
                    break
            except Exception:
                continue
    except Exception as e:
        print(f"[Scraper] Note popups : {e}")

async def scrape_products(count: int, url: str, output_dir: str, archive_dir: str, niche: str = "garment", niche_def=None, hidden: bool = False):
    os.makedirs(output_dir, exist_ok=True)
    
    if not start_edge(headless=hidden):
        print("[Scraper] ERREUR : Impossible de lancer Edge.")
        return

    async with async_playwright() as p:
        print(f"[Scraper] Connexion au navigateur Edge existant (Confiance Maximale)...")
        
        try:
            browser = await p.chromium.connect_over_cdp(CDP_URL)
            context = browser.contexts[0]
        except Exception as conn_err:
            print(f"[Scraper] ERREUR de connexion CDP : {conn_err}")
            return
        
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)
        
        # 1. Navigation page d'accueil d'abord pour poser les cookies de session
        print("[Scraper] Etape 1 : Initialisation de la session sur fr.shein.com...")
        try:
            await page.goto("https://fr.shein.com/", wait_until="domcontentloaded", timeout=60000)
            await page.wait_for_timeout(3000)
            
            # Appuyer sur Escape d'abord pour masquer les pop-ups coupons d'avant-plan
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(1000)
            
            # Fermeture des cookies si pop-up visible (clic force pour ignorer le chevauchement)
            cookie_btn = page.locator("button:has-text('Accepter'), #onetrust-accept-btn-handler, button:has-text('OK')").first
            if await cookie_btn.is_visible(timeout=3000):
                await cookie_btn.click(force=True, timeout=4000)
                print("[Scraper] Cookies acceptes (clic force).")
        except Exception as e:
            print(f"[Scraper] Note cookies : {e}")
            
        # Touche Escape pour fermer les pop-ups de bienvenue/coupons intrusifs
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(1000)
        await page.keyboard.press("Escape")
        
        # 2. Boucle de sourcing multipage jusqu'à atteindre la quantité cible
        count_saved = 0
        saved_urls = set()
        
        # Charger l'historique des articles déjà scrapés ou en attente pour éviter les doublons inter-sessions
        history_urls = set()
        # archive_dir est désormais passé en paramètre dynamique selon le compte !
        if os.path.exists(output_dir):
            for f in os.listdir(output_dir):
                if f.endswith(".txt"):
                    try:
                        with open(os.path.join(output_dir, f), "r", encoding="utf-8") as url_f:
                            url_val = url_f.read().strip()
                            if url_val:
                                history_urls.add(url_val.split('?')[0].strip().lower())
                    except Exception:
                        pass
        if os.path.exists(archive_dir):
            for folder in os.listdir(archive_dir):
                folder_path = os.path.join(archive_dir, folder)
                if os.path.isdir(folder_path):
                    txt_path = os.path.join(folder_path, "shein_url.txt")
                    if os.path.exists(txt_path):
                        try:
                            with open(txt_path, "r", encoding="utf-8") as url_f:
                                url_val = url_f.read().strip()
                                if url_val:
                                    history_urls.add(url_val.split('?')[0].strip().lower())
                        except Exception:
                            pass
        if history_urls:
            print(f"[Scraper] {len(history_urls)} articles uniques detectes dans l'historique. Ils seront automatiquement exclus.")
        
        page_num = 1
        # Chargement initial de la Page 1 (seulement la toute première fois)
        print(f"\n[Scraper] Navigation initiale vers la Page 1 : {url}")
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        except Exception as init_err:
            print(f"[Scraper] [WARN] Delai depasse lors du chargement initial : {init_err}")
            
        while count_saved < count:
            print(f"\n[Scraper] --- Analyse de la Page {page_num} (Total enregistres : {count_saved}/{count}) ---")
            
            # --- RECONSTRUCTION DE L'URL CIBLE (Fallback de secours en cas de crash/captcha) ---
            import re
            if page_num == 1:
                target_fallback_url = url
            elif "page=" in url:
                target_fallback_url = re.sub(r'page=\d+', f'page={page_num}', url)
            else:
                connector = "&" if "?" in url else "?"
                target_fallback_url = f"{url}{connector}page={page_num}"
            
            try:
                # Détection et parade ultime Anti-Redirection 'Risk Challenge'
                
                # Détection et parade ultime Anti-Redirection 'Risk Challenge'
                if "risk/challenge" in page.url:
                    print("[Scraper] DETECTE : Redirection vers la page de securite Shein (Risk Challenge) !")
                    # Tenter la fermeture avec les sélecteurs identifiés
                    challenge_selectors = [
                        "div[class*='risk'] span > i",
                        "div[class*='risk'] i",
                        "[class*='risk-challenge'] [class*='close' i]",
                        ".she-close",
                        ".risk-challenge-modal i",
                        ".sh-captcha-close-btn",
                        ".sh-captcha-close",
                        ".captcha-close"
                    ]
                    found = False
                    for sel in challenge_selectors:
                        try:
                            el = page.locator(sel).first
                            if await el.is_visible():
                                print(f"[Scraper] Fermeture du challenge via '{sel}'...")
                                await el.click(force=True, timeout=2000)
                                found = True
                                break
                        except Exception:
                            pass
                    
                    # Attendre la redirection naturelle 3s
                    await page.wait_for_timeout(3000)
                    
                    # Si on est toujours sur la page de risque, forcer le retour à l'URL produit
                    if "risk/challenge" in page.url:
                        print("[Scraper] Toujours bloque sur Risk Challenge. Forcage du retour vers la page produit...")
                        await page.goto(target_fallback_url, wait_until="domcontentloaded", timeout=60000)
                
                
                # Attente active immédiate d'un éventuel captcha post-navigation (max 5s)
                print("[Scraper] Attente active d'un eventuel captcha de chargement (max 5s)...")
                for _ in range(10):
                    await page.keyboard.press("Escape")
                    await dismiss_popups(page)
                    await page.wait_for_timeout(500)
                
                # Injection CSS à chaque chargement de page
                try:
                    await page.add_style_tag(content="""
                        div[class*='quick-register' i], 
                        div[class*='quick-login' i],
                        [class*='coupon' i],
                        [class*='promo' i],
                        .quick-register-container,
                        .quick-login-container {
                            display: none !important;
                            visibility: hidden !important;
                            opacity: 0 !important;
                            width: 0 !important;
                            height: 0 !important;
                            pointer-events: none !important;
                        }
                    """)
                except Exception:
                    pass
                
                # Défilement progressif plus profond pour charger les images (Lazy-loading)
                print("[Scraper] Defilement progressif pour charger les images de cette page...")
                for _ in range(25):
                    await page.mouse.wheel(0, 800)
                    await page.wait_for_timeout(1000)
                    await dismiss_popups(page)
                        
                # Revenir tout en haut de la page courante
                await page.evaluate("window.scrollTo(0, 0)")
                await page.wait_for_timeout(1500)
                
                # Extraction des cartes produits de la page courante
                cards = await page.locator(".product-card, .S-product-item, .S-product-card, [data-product-id]").all()
                
                # --- MESURE DE SÉCURITÉ 0 PRODUITS ---
                if len(cards) == 0:
                    print(f"[Scraper] [WARN] Aucune carte detectee. Tentative d'ACTUALISATION ADAPTATIVE...")
                    await page.reload(wait_until="domcontentloaded")
                    await page.wait_for_timeout(4000)
                    # Scroll réveil
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight / 2)")
                    await page.wait_for_timeout(1500)
                    await page.evaluate("window.scrollTo(0, 0)")
                    cards = await page.locator(".product-card, .S-product-item, .S-product-card, [data-product-id]").all()
                
                print(f"[Scraper] Analyse de {len(cards)} cartes produits trouvees sur la Page {page_num}...")
                
                if len(cards) == 0:
                    print(f"[Scraper] [CRITIQUE] Toujours 0 carte apres attente. Fin de la boucle pour cette page.")
                    # Au lieu de Break total, on va essayer quand même de passer à la page suivante plus loin
                    
                cards_processed_on_page = 0
                for i, card in enumerate(cards):
                    if count_saved >= count:
                        break
                        
                    if i % 3 == 0:
                        await dismiss_popups(page)
                        
                    # Extraire l'URL de l'article sur Shein
                    product_url = "https://fr.shein.com"
                    try:
                        a_el = card.locator("a").first
                        if await a_el.count() > 0:
                            href = await a_el.get_attribute("href")
                            if href:
                                product_url = href if href.startswith("http") else f"https://fr.shein.com{href}"
                    except Exception:
                        pass
                        
                    # Éviter absolument de re-scraper un article déjà dans l'historique ou en attente
                    product_url_base = product_url.split('?')[0].strip().lower()
                    if product_url_base in history_urls:
                        continue
                        
                    # Obtenir le texte de la carte pour identifier la marque
                    card_text = ""
                    try:
                        card_text = await card.inner_text()
                    except Exception:
                        pass
                        
                    # Filtrer les produits de marque SHEIN (SHEIN Clasi, SHEIN LUNE, etc.)
                    # afin de conserver uniquement les autres marques de la marketplace (Breezaya, Emery Rose, etc.)
                    from urllib.parse import urlparse
                    url_path = urlparse(product_url).path.lower()
                    if "shein" in card_text.lower() or "shein" in url_path:
                        print(f"[Scraper] Produit de la marque SHEIN ignore : {product_url_base.split('/')[-1]}")
                        continue
                        
                    # --- Filtre strict de catégories selon la niche (config-driven) ---
                    product_url_lower = product_url.lower()

                    # Charger les listes depuis la definition de niche si disponible,
                    # sinon retomber sur les valeurs hardcodees de la niche garment (retrocompat)
                    if niche_def is not None:
                        _keywords_include = niche_def.keywords_include
                        _keywords_exclude = niche_def.keywords_exclude
                    else:
                        # Fallback legacy : reproduit exactement le comportement original
                        if niche == "stroller":
                            _keywords_include = ["stroller", "poussette", "buggy", "hondenbuggy", "pet", "chien", "dog"]
                            _keywords_exclude = []
                        else:
                            _keywords_include = ["dress", "robe", "skirt", "jupe"]
                            _keywords_exclude = ["swim", "bikini", "maillot", "beachwear", "bodysuit", "romper", "jumpsuit"]

                    if _keywords_exclude and any(word in product_url_lower for word in _keywords_exclude):
                        continue
                    if _keywords_include and not any(word in product_url_lower for word in _keywords_include):
                        continue
                        
                    # Trouver l'image principale de cette carte
                    img_el = None
                    for sel in ["img.goods-img-sub", "img.j-ver-smart-img", "img"]:
                        loc = card.locator(sel).first
                        if await loc.count() > 0:
                            img_el = loc
                            break
                            
                    if not img_el:
                        continue
                        
                    try:
                        # Faire d'abord défiler pour forcer le rendu et le chargement (Lazy-loading)
                        await img_el.scroll_into_view_if_needed()
                        await page.wait_for_timeout(300)
        
                        box = await img_el.bounding_box()
                        src = await img_el.get_attribute("src")
                        data_src = await img_el.get_attribute("data-src")
                        url_img = data_src if data_src else src
        
                        if not url_img:
                            continue
                            
                        url_img_clean = url_img.split('?')[0].lower()
        
                        # Eviter les doublons d'images
                        if url_img_clean in saved_urls:
                            continue
        
                        # Filtrer les petits elements (icones, swatches de couleur, images d'aperçu de moins de 100px)
                        if not box or box["width"] < 100 or box["height"] < 100:
                            continue
                            
                        # Ignorer si ce n'est pas un serveur d'image Shein ou si c'est un logo / detail zoomé
                        if not any(k in url_img_clean for k in ["shein", "fcdn", "ltwebstatic"]):
                            continue
                        if any(k in url_img_clean for k in ["logo", "icon", "detail", "collar", "back", "hover"]):
                            continue
                            
                        # Centrer proprement l'image avant capture
                        await img_el.scroll_into_view_if_needed()
                        await page.wait_for_timeout(800)
                        await dismiss_popups(page) # Securite de derniere seconde juste avant la capture !
                        
                        # Prendre la capture d'ecran de l'image du produit
                        filename = f"shein_quickship_{int(time.time())}_{count_saved+1}.png"
                        output_path = os.path.join(output_dir, filename)
                        
                        await img_el.screenshot(path=output_path)
                        print(f"[Scraper] [OK] Capture {count_saved+1}/{count} enregistree : {filename}")
                        
                        # Sauvegarder l'URL associée dans un fichier .txt
                        url_filename = filename.replace(".png", ".txt")
                        url_path = os.path.join(output_dir, url_filename)
                        with open(url_path, "w", encoding="utf-8") as url_f:
                            url_f.write(product_url)
                            
                        saved_urls.add(url_img_clean)
                        count_saved += 1
                        cards_processed_on_page += 1
                        
                        # Pause pour eviter d'exciter les systemes de protection
                        await page.wait_for_timeout(1000)
                        
                    except Exception:
                        continue
                        
                print(f"[Scraper] Fin de la Page {page_num} : {cards_processed_on_page} nouveaux articles captures.")
                
                # --- LOGIQUE DE NAVIGATION VERS LA PAGE SUIVANTE ---
                if count_saved < count:
                    print(f"\n[Scraper] Preparation du passage a la Page {page_num + 1}...")
                    page_num += 1
                    
                    # Tenter d'abord de cliquer sur le NUMÉRO DE LA PAGE spécifique (Découverte Gaëtan !)
                    page_number_selectors = [
                        f"button[aria-label='Page {page_num}']",
                        f"a[aria-label='Page {page_num}']",
                        f"li[title='{page_num}']",
                        # Sélecteurs fallback pour le bouton "Suivant"
                        ".sui-pagination__next",
                        "button[aria-label='Next page']"
                    ]
                    
                    nav_success = False
                    # Scroller tout en bas pour faire apparaître la pagination
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await page.wait_for_timeout(2500)
                    
                    for selector in page_number_selectors:
                        try:
                            btn = page.locator(selector).first
                            if await btn.is_visible(timeout=2000):
                                print(f"[Scraper] Clic sur la Page cible via '{selector}'...")
                                await btn.scroll_into_view_if_needed()
                                await page.wait_for_timeout(500)
                                await btn.click(force=True, timeout=5000)
                                nav_success = True
                                break
                        except Exception:
                            continue
                            
                    if nav_success:
                        print(f"[Scraper] [OK] Transition initiee. Attente du chargement...")
                        try:
                            await page.wait_for_load_state("domcontentloaded", timeout=5000)
                        except:
                            pass
                        await page.wait_for_timeout(3000)
                    else:
                        # FALLBACK ULTIME : Navigation via URL construite si les boutons foirent
                        print(f"[Scraper] [WARN] Impossible de cliquer sur 'Suivant'. Utilisation du Fallback URL...")
                        next_url = target_fallback_url # Utiliser notre URL calculée plus haut
                            
                        print(f"[Scraper] Fallback URL : {next_url}")
                        await page.goto(next_url, wait_until="domcontentloaded", timeout=60000)
                        await page.wait_for_timeout(2000)
                
            except Exception as page_err:
                print(f"[Scraper] [ERROR] Erreur critique lors du traitement : {page_err}")
                await page.wait_for_timeout(3000)
                # Fallback de secours ultime : tenter de forcer l'URL suivante quand même
                page_num += 1
                
        print(f"\n[Scraper] [DONE] Scraping termine ! {count_saved}/{count} articles sauvegardes dans {output_dir}")
        await browser.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper de sourcing Shein (Entrepots UE, Prix < 15e)")
    parser.add_argument("--count", type=int, default=10, help="Nombre de produits a capturer (defaut: 10)")
    parser.add_argument("--account", type=str, default="nina", help="Nom du compte cible")
    parser.add_argument("--url", type=str, default="https://fr.shein.com/Women-Dresses-c-1727.html?tag_ids=quickship&price_max=15", help="URL Shein filtree de depart")
    parser.add_argument("--output-dir", type=str, default=None, help="Dossier force (defaut: Dossier du compte)")
    parser.add_argument("--hidden", action="store_true", help="Lance Edge en arriere-plan (invisible)")
    
    args = parser.parse_args()
    
    # Récupération de la configuration du compte
    config = get_account_config(args.account)

    # Charger la definition de niche (config-driven)
    niche_def = config.niche_def

    # URL par défaut : si l'utilisateur n'a pas fourni d'URL personnalisee,
    # utiliser celle de la definition de niche (remplace l'ancien if niche=="stroller")
    garment_default_url = "https://fr.shein.com/Women-Dresses-c-1727.html?tag_ids=quickship&price_max=15"
    if args.url == garment_default_url:
        start_url = niche_def.default_start_url
    else:
        start_url = args.url

    final_output_dir = args.output_dir if args.output_dir else config.input_dir

    print("="*50)
    print(f"DEMARRAGE DU SCRAPER SHEIN [COMPTE : {config.name.upper()}]")
    print(f"Quantite cible : {args.count}")
    print(f"URL de depart  : {start_url}")
    print(f"Dossier de sortie : {final_output_dir}")
    print(f"Dossier archive   : {config.archive_dir}")
    print(f"Niche              : {config.niche.upper()} ({niche_def.display_name})")
    print(f"Mode Invisible    : {args.hidden}")
    print("="*50 + "\n")

    asyncio.run(scrape_products(args.count, start_url, final_output_dir, config.archive_dir, config.niche, niche_def=niche_def, hidden=args.hidden))
