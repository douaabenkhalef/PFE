import requests
import json

base_url = "http://localhost:8000/api"
print("🚀 Test de l'API\n")

# GET - Récupérer tous les items
print("📋 Items existants:")
response = requests.get(f"{base_url}/items/")
if response.status_code == 200:
    items = response.json()
    if items:
        for item in items:
            print(f"  - {item['name']}: {item['description']}")
    else:
        print("  Aucun item trouvé")
else:
    print(f"  Erreur: {response.status_code}")

print("\n" + "="*50 + "\n")

# POST - Créer un nouvel item
print("➕ Création d'un nouvel item...")
new_item = {
    "name": "Test API",
    "description": "Item créé via script Python"
}
response = requests.post(f"{base_url}/items/", json=new_item)
if response.status_code == 201:
    item = response.json()
    print(f"✅ Item créé avec succès!")
    print(f"   ID: {item['id']}")
    print(f"   Nom: {item['name']}")
    print(f"   Description: {item['description']}")
    print(f"   Créé le: {item['created_at']}")
    
    # GET - Récupérer l'item spécifique
    item_id = item['id']
    print(f"\n🔍 Récupération de l'item {item_id}...")
    response = requests.get(f"{base_url}/items/{item_id}/")
    if response.status_code == 200:
        item = response.json()
        print(f"✅ Item trouvé: {item['name']}")
else:
    print(f"❌ Erreur: {response.status_code}")
    if response.text:
        print(response.text)

print("\n✅ Test terminé!")
