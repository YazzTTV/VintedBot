import asyncio
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

def analyze_risk_page():
    # L'URL fournie par l'utilisateur dans sa capture
    url = "https://fr.shein.com/risk/challenge?captcha_type=909&redirection=https%3A%2F%2Ffr.shein.com%2FWomen-Dresses-c-1727.html%3Ftag_ids%3Dquickship%26price_max%3D15%26page%3D2"
    
    with sync_playwright() as p:
        print("[Diag] Ouverture du navigateur...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        Stealth().apply_stealth_sync(page)
        
        print(f"[Diag] Navigation vers l'URL de risque...")
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(5000)
            
            # Capturer le HTML du corps de la page pour analyse
            content = page.content()
            with open("risk_page_content.html", "w", encoding="utf-8") as f:
                f.write(content)
            print("[Diag] HTML sauvegarde dans risk_page_content.html.")
            
            # Chercher tous les éléments 'svg' ou classes de fermeture dans la modal
            elements = page.evaluate("""() => {
                const list = [];
                document.querySelectorAll('div, span, svg, button, a, img').forEach(el => {
                    const cls = el.className || "";
                    const is_visible = el.offsetParent !== null;
                    if (is_visible && (typeof cls === 'string' && (cls.includes('close') || cls.includes('x') || cls.includes('modal')))) {
                        list.push({
                            tag: el.tagName,
                            class: cls,
                            text: el.innerText || ""
                        });
                    }
                });
                return list;
            }""")
            
            print(f"[Diag] Elements potentiels trouves : {len(elements)}")
            for idx, el in enumerate(elements[:10]):
                print(f" - {el['tag']} | class: {el['class']} | text: {el['text'][:20]}")
                
        except Exception as e:
            print(f"[Diag] Erreur : {e}")
            
        browser.close()

if __name__ == "__main__":
    analyze_risk_page()
