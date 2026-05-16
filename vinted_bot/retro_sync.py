import os
import time
import re
import requests
from dotenv import load_dotenv

load_dotenv()

def sync_to_google_sheets(account: str, date_str: str, titre: str, url: str, fiche: str):
    webhook_url = os.getenv("GOOGLE_SHEET_WEBHOOK_URL")
    if not webhook_url:
        print("ERR: No Webhook URL in env.")
        return False
    try:
        payload = {
            "account": account,
            "date": date_str,
            "titre": titre,
            "url": url,
            "fiche": fiche
        }
        response = requests.post(webhook_url, json=payload, timeout=15)
        return response.status_code == 200
    except Exception as e:
        print(f"Error sync: {e}")
        return False

def main():
    account = "lena"
    history_file = r"D:\AntiGravity\02 Projects\Business Vinted\Accounts\lena\Sourcing_History.md"
    
    if not os.path.exists(history_file):
        print("History file not found.")
        return
        
    with open(history_file, "r", encoding="utf-8") as f:
        content = f.read()
        
    lines = content.split('\n')
    synced_count = 0
    
    for line in lines:
        line = line.strip()
        # Match table row
        if line.startswith('|') and not ':---' in line and 'Statut' not in line:
            cells = [c.strip() for c in line.split('|')]
            cells = [c for c in cells if c]
            
            if len(cells) >= 5:
                date_str = cells[1].replace("**", "")
                titre = cells[2].replace("**", "")
                # Extract url from [Text](URL)
                shein_raw = cells[3]
                match = re.search(r'\[.*?\]\((https?://.*?)\)', shein_raw)
                url = match.group(1) if match else shein_raw
                
                fiche = cells[4].strip()
                
                print(f"Syncing: {titre}...")
                success = sync_to_google_sheets(account, date_str, titre, url, fiche)
                if success:
                    synced_count += 1
                    print("  [OK]")
                else:
                    print("  [FAILED]")
                time.sleep(1) # Throttle a bit to be nice to Apps Script
                
    print(f"\nRetro-sync complete! Sent {synced_count} items to Google Sheets.")

if __name__ == "__main__":
    main()
