from playwright.sync_api import sync_playwright

def inspect_shein():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("https://fr.shein.com/Women-V-Neck-Short-Sleeve-Pleated-Simple-Casual-Short-Embroidered-Doll-Dress-p-53997976.html")
        page.wait_for_selector("text=AJOUTER AU PANIER", timeout=10000)
        
        # Add to cart button
        button = page.locator("button:has-text('AJOUTER AU PANIER')")
        print("Add button HTML:", button.evaluate("el => el.outerHTML"))
        
        # Size elements
        sizes = page.locator("text=/\\(S\\)|36/").all()
        for size in sizes:
            try:
                print("Size HTML:", size.evaluate("el => el.outerHTML"))
            except:
                pass
                
        browser.close()

if __name__ == "__main__":
    inspect_shein()
