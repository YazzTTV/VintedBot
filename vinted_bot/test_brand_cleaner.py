import sys
import os

# Importer la fonction du processor
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from processor import _clean_forbidden_words

def run_tests():
    test_cases = [
        ("Robe court jaune Shein", "Robe court jaune"),
        ("Jolie robe - SHEIN - Jamais portee", "Jolie robe - Jamais portee"),
        ("Top temu pas cher", "Top pas cher"),
        ("Tee-shirt de chez Aliexpress", "Tee-shirt de chez"),
        ("Produit original Ali Express cool", "Produit original cool"),
        ("Shein Robe d'ete", "Robe d'ete"),
        ("Superbe pantalon temu , taille M", "Superbe pantalon, taille M"), # Le regex gère la virgule ? voyons le résultat
    ]
    
    print("🧪 TESTS DE DÉSINFECTION ANTI-MARQUE 🧪\n")
    success_count = 0
    for i, (raw, expected) in enumerate(test_cases, 1):
        cleaned = _clean_forbidden_words(raw)
        success = "Shein" not in cleaned and "Temu" not in cleaned and "Aliexpress" not in cleaned and "Ali Express" not in cleaned
        print(f"Test #{i}:")
        print(f"  Brut    : '{raw}'")
        print(f"  Nettoyé : '{cleaned}'")
        if success:
            print(f"  ✅ SUCCESS (Aucune marque interdite)")
            success_count += 1
        else:
            print(f"  ❌ FAILURE")
        print("-" * 20)
        
    print(f"\n🎯 Résultat : {success_count}/{len(test_cases)} tests validés !")

if __name__ == "__main__":
    run_tests()
