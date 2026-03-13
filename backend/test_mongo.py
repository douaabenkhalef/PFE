from pymongo import MongoClient
from pathlib import Path

def test_mongo_connection():
    # Utiliser le chemin courant
    env_path = Path('.env')
    
    if env_path.exists():
        print('📄 Fichier .env trouvé')
        with open(env_path) as f:
            env_vars = {}
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env_vars[key] = value.strip('"\'')
        
        mongo_uri = env_vars.get('MONGO_URI', 'mongodb://localhost:27017/')
        db_name = env_vars.get('MONGO_DB_NAME', 'pfe_db')
    else:
        print('⚠️  Fichier .env non trouvé, création...')
        with open('.env', 'w') as f:
            f.write('MONGO_DB_NAME=pfe_db\n')
            f.write('MONGO_URI=mongodb://localhost:27017/\n')
            f.write('SECRET_KEY=django-insecure-votre-clé-secrète-ici\n')
            f.write('DEBUG=True\n')
        print('✅ Fichier .env créé avec les valeurs par défaut')
        mongo_uri = 'mongodb://localhost:27017/'
        db_name = 'pfe_db'
    
    print(f'\n🔌 Connexion à MongoDB: {mongo_uri}')
    print(f'📊 Base de données: {db_name}')
    
    try:
        # Tenter la connexion
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print('✅ Connexion MongoDB réussie!')
        
        # Lister les bases de données
        dbs = client.list_database_names()
        print('📚 Bases de données disponibles:', dbs)
        
        # Vérifier notre base
        if db_name in dbs:
            print(f'✅ La base de données "{db_name}" existe')
            
            # Vérifier la collection items
            db = client[db_name]
            collections = db.list_collection_names()
            print(f'📚 Collections: {collections}')
            
            if 'items' in collections:
                count = db.items.count_documents({})
                print(f'📝 Collection "items" contient {count} document(s)')
                
                # Afficher quelques documents
                if count > 0:
                    print('\n📄 Derniers documents:')
                    for doc in db.items.find().sort('created_at', -1).limit(3):
                        print(f'  - {doc.get("name")}: {doc.get("description")}')
            else:
                print('📝 Collection "items" pas encore créée')
        else:
            print(f'📝 La base de données "{db_name}" sera créée à la première insertion')
            
        return True
        
    except Exception as e:
        print(f'❌ Erreur de connexion: {e}')
        print('\n💡 Solutions possibles:')
        print('  1. Vérifier que MongoDB est démarré: brew services list')
        print('  2. Démarrer MongoDB: brew services start mongodb-community@8.0')
        print('  3. Vérifier l\'URI MongoDB dans le fichier .env')
        return False

if __name__ == '__main__':
    print('🔍 Test de connexion MongoDB\n')
    test_mongo_connection()
