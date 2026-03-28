import sys
sys.path.append('/Users/douaabenkhalef/Desktop/PFE/backend')

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from api.models import User
from api.email_utils import send_approval_email

def approve_user_from_db(email):
    user = User.objects(email=email).first()
    if user:
        # Vérifier si déjà approuvé
        if user.status:
            print(f"ℹ️ Utilisateur {email} est déjà approuvé")
            reponse = input("Voulez-vous renvoyer l'email ? (o/n): ")
            if reponse.lower() != 'o':
                return
        
        # Mettre à jour le statut
        user.status = True
        user.save()
        
        # Envoyer l'email
        send_approval_email(
            recipient=user.email,
            name=user.username,
            role=user.sub_role or user.role,
            approver="Administrateur (via base de données)"
        )
        print(f"✅ Email envoyé à {user.email}")
    else:
        print(f"❌ Utilisateur {email} non trouvé")

if __name__ == "__main__":
    print("=" * 50)
    print("📧 Envoi d'email d'approbation")
    print("=" * 50)
    email = input("Email de l'utilisateur: ")
    approve_user_from_db(email)
