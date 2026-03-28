# api/otp_utils.py
import secrets
import random
from datetime import datetime, timedelta
from .models import OTPVerification
from .email_utils import send_email

def generate_otp_code():
    """Génère un code OTP à 6 chiffres"""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])

def create_otp_verification(email, temp_data):
    """
    Crée une nouvelle vérification OTP
    Retourne le code généré
    """
    # Supprimer les anciens OTP pour cet email
    OTPVerification.objects(email=email).delete()
    
    # Générer un code
    code = generate_otp_code()
    
    # Créer l'OTP
    otp = OTPVerification(
        email=email,
        code=code,
        data=temp_data,
        expires_at=datetime.now() + timedelta(minutes=15)  # Valide 15 minutes
    )
    otp.save()
    
    return code

def send_otp_email(email, code, action="inscription"):
    """Envoie l'email avec le code OTP"""
    if action == "reset_password":
        subject = "Réinitialisation de votre mot de passe - Code OTP"
        title = "🔐 Réinitialisation du mot de passe"
        message = "Vous avez demandé la réinitialisation de votre mot de passe."
    else:
        subject = "Vérification de votre compte - Code OTP"
        title = "🔐 Vérification de votre compte"
        message = "Merci de vous être inscrit sur notre plateforme de stages."
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #9333ea, #6b21a8); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .code {{ 
                font-size: 32px;
                font-weight: bold;
                text-align: center;
                padding: 20px;
                background: #e9e9e9;
                border-radius: 8px;
                letter-spacing: 5px;
                font-family: monospace;
                margin: 20px 0;
            }}
            .warning {{ 
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 12px;
                margin: 15px 0;
                font-size: 14px;
            }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{title}</h1>
            </div>
            <div class="content">
                <p>Bonjour,</p>
                <p>{message}</p>
                
                <div class="code">
                    <strong>{code}</strong>
                </div>
                
                <div class="warning">
                    ⚠️ Ce code est valable pendant <strong>15 minutes</strong>.
                    <br>⚠️ Après 3 tentatives infructueuses, le code sera invalidé.
                </div>
                
                <p>Si vous n'avez pas demandé cette action, ignorez cet email.</p>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    {title}
    
    Bonjour,
    
    {message}
    
    CODE: {code}
    
    Ce code est valable pendant 15 minutes.
    Après 3 tentatives infructueuses, le code sera invalidé.
    
    Si vous n'avez pas demandé cette action, ignorez cet email.
    
    Cordialement,
    L'équipe de la plateforme de stages
    """
    
    return send_email(email, subject, html_content, text_content)

def verify_otp_code(email, code):
    """Vérifie si le code OTP est valide et retourne les données associées"""
    # Compter les tentatives pour cet email
    attempts_key = f"otp_attempts_{email}"
    attempts = getattr(verify_otp_code, attempts_key, 0)
    
    otp = OTPVerification.objects(email=email, code=code).first()
    
    if not otp:
        attempts += 1
        setattr(verify_otp_code, attempts_key, attempts)
        
        if attempts >= 3:
            # Supprimer tous les OTP pour cet email après 3 tentatives
            OTPVerification.objects(email=email).delete()
            return None, "Code invalide. Vous avez dépassé le nombre de tentatives autorisées (3). Veuillez demander un nouveau code."
        
        remaining = 3 - attempts
        return None, f"Code invalide. Il vous reste {remaining} tentative(s)."
    
    # Réinitialiser les tentatives si code trouvé
    setattr(verify_otp_code, attempts_key, 0)
    
    if not otp.is_valid():
        return None, "Le code a expiré. Veuillez demander un nouveau code (valable 15 minutes)."
    
    if otp.used:
        return None, "Ce code a déjà été utilisé. Veuillez demander un nouveau code."
    
    # Marquer comme utilisé
    otp.used = True
    otp.save()
    
    return otp.data, None