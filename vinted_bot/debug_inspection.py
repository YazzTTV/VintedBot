import asyncio
import time
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def dismiss_popups(page):
    try:
        captcha_selectors = [
            ".sh-captcha-close-btn", ".sh-captcha-close", ".captcha-close", ".geetest_close",
            "div[class*='risk'] span > i", ".she-close", ".risk-challenge-modal i"
        ]
        for sel in captcha_selectors:
            try:
                el = page.locator(sel).first
                if await el.is_visible():
                    print(f"[Scraper] Captcha detecte. Fermeture...")
                    await el.click(force=True, timeout=1000)
                    break
            except Exception:
                pass
    except Exception:
        pass

async def launch_and_reach_failure_point():
    print("\n🚀 DÉMARRAGE DE LA REPRODUCTION IDENTIQUE...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled', '--disable-infobars', '--window-size=1920,1080']
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale='fr-FR'
        )
        
        page = await context.new_page()
        await Stealth().apply_stealth_async(page)
        
        # 1. Même initialisation que le vrai scraper
        print("[1/4] Initialisation de la session (comme le vrai scraper)...")
        await page.goto("https://fr.shein.com/", wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(2000)
        await page.keyboard.press("Escape")
        
        cookie_btn = page.locator("button:has-text('Accepter'), #onetrust-accept-btn-handler").first
        if await cookie_btn.is_visible(timeout=3000):
            await cookie_btn.click(force=True)
            print("[DEBUG] Cookies validés.")
            
        # 2. Atteindre la page des robes
        url = "https://fr.shein.com/Women-Dresses-c-1727.html?tag_ids=quickship&price_max=15"
        print(f"[2/4] Chargement Page 1 : {url}")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(2000)
        
        # Injection CSS du vrai bot
        await page.add_style_tag(content="div[class*='quick-register' i]{display:none !important;}")
        
        print("[3/4] Défilement vers le bas pour activer la pagination...")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2000)
        await dismiss_popups(page)
        
        # 3. Lancer la transition vers Page 2
        print("[4/4] TENTATIVE DE CLIC SUR 'SUIVANT'...")
        
        next_btn_selectors = [".sui-pagination__next", "button[aria-label='Next page']", ".sui-pagination__next button"]
        nav_success = False
        
        for sel in next_btn_selectors:
            try:
                btn = page.locator(sel).first
                if await btn.is_visible(timeout=3000):
                    print(f"-> Clic sur '{sel}' !")
                    await btn.scroll_into_view_if_needed()
                    await page.wait_for_timeout(500)
                    await btn.click(force=True, timeout=5000)
                    nav_success = True
                    break
            except Exception:
                pass
                
        if nav_success:
            print("\n🎯 CLIC RÉUSSI ! ATTENTE DU CHARGEMENT...")
            await page.wait_for_load_state("domcontentloaded")
            await page.wait_for_timeout(4000) # Laisse le temps au bug d'apparaître
        else:
            print("\n⚠️ ÉCHEC DU CLIC. Je ne peux pas passer à la page 2.")
            
        print("\n" + "="*70)
        print("💥 POINT DE BLOCAGE ATTEINT - JE TE LAISSE LE CONTRÔLE !")
        print("Regarde le navigateur, inspecte pourquoi les cartes ne chargent pas.")
        print("Ferme simplement la fenêtre de Chrome quand tu as compris !")
        print("="*70 + "\n")
        
        while True:
            if browser.is_connected():
                await asyncio.sleep(1)
            else:
                break

if __name__ == "__main__":
    asyncio.run(launch_and_reach_failure_point())
