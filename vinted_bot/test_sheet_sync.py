import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()

def test_sync():
    webhook_url = os.getenv("GOOGLE_SHEET_WEBHOOK_URL")
    print(f"Attempting push to: {webhook_url}")
    
    if not webhook_url:
        print("ERROR: Webhook URL not found in .env!")
        return

    payload = {
        "account": "nina",
        "date": time.strftime("%Y-%m-%d"),
        "titre": "Robe de Test IA",
        "url": "https://fr.shein.com/test-item",
        "fiche": "[[fiche_test_123]]"
    }
    
    try:
        print("Sending POST request...")
        # Google redirects the POST so allow_redirects helps ensure delivery
        response = requests.post(webhook_url, json=payload, timeout=15)
        print(f"HTTP Status Code: {response.status_code}")
        print(f"Response Text: {response.text}")
        
        if response.status_code == 200:
            print("\nSUCCESS! Check the 'Nina' tab in your Google Sheet to see the 'Robe de Test IA'.")
        else:
            print("\nFAIL: Non-200 status code.")
    except Exception as e:
        print(f"\nCRASH: {e}")

if __name__ == "__main__":
    test_sync()
