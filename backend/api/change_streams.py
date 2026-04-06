
import threading
import time
from pymongo import MongoClient
from bson import ObjectId
from decouple import config
import os
import django


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import User
from api.email_utils import send_approval_email

class UserChangeStream:
    """
    Écoute les changements dans la collection users
    et envoie des emails quand le status passe de False à True
    """
    
    def __init__(self):
        self.client = MongoClient(config('MONGO_URI'))
        self.db = self.client[config('MONGO_DB_NAME')]
        self.collection = self.db['users']
        self.running = False
        self.thread = None
    
    def start(self):
        """Démarre l'écoute des changements"""
        if self.running:
            print(" Le change stream est déjà en cours d'exécution")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._listen)
        self.thread.daemon = True
        self.thread.start()
        print(" Change stream démarré - Les emails seront envoyés automatiquement")
    
    def stop(self):
        """Arrête l'écoute des changements"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print(" Change stream arrêté")
    
    def _listen(self):
        """Écoute les changements dans la collection"""
        
        pipeline = [
            {
                '$match': {
                    'operationType': 'update',
                    'updateDescription.updatedFields.status': {'$eq': True}
                }
            }
        ]
        
        try:
            with self.collection.watch(pipeline) as stream:
                print("  En attente de changements sur la collection users...")
                for change in stream:
                    self._handle_change(change)
        except Exception as e:
            print(f" Erreur dans le change stream: {e}")
            if self.running:
                
                time.sleep(5)
                self._listen()
    
    def _handle_change(self, change):
        """Traite un changement détecté"""
        try:
            document_key = change.get('documentKey', {})
            user_id = document_key.get('_id')
            
            if user_id:
              
                user = User.objects(id=str(user_id)).first()
                
                if user and user.status:
                    print(f" Détection: Utilisateur {user.email} a été approuvé")
                    
                    
                    role = user.sub_role or user.role
                    if role == 'company_manager':
                        role_display = "Company Manager"
                    elif role == 'hiring_manager':
                        role_display = "Hiring Manager"
                    elif role == 'admin':
                        role_display = "Department Head"
                    elif role == 'co_dept_head':
                        role_display = "Co Department Head"
                    else:
                        role_display = role
                    
                   
                    send_approval_email(
                        recipient=user.email,
                        name=user.username,
                        role=role_display,
                        approver="Administrateur (via base de données)"
                    )
                    print(f"  Email envoyé à {user.email}")
                    
        except Exception as e:
            print(f"  Erreur lors du traitement du changement: {e}")


user_change_stream = UserChangeStream()

def start_change_stream():
    """Démarre le change stream"""
    user_change_stream.start()

def stop_change_stream():
    """Arrête le change stream"""
    user_change_stream.stop()