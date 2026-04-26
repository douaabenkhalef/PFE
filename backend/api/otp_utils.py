
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
    
    OTPVerification.objects(email=email).delete()
    
    
    code = generate_otp_code()
    
    
    otp = OTPVerification(
        email=email,
        code=code,
        data=temp_data,
        expires_at=datetime.now() + timedelta(minutes=15)  
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
                     Ce code est valable pendant <strong>15 minutes</strong>.
                    <br> Après 3 tentatives infructueuses, le code sera invalidé.
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
    
    attempts_key = f"otp_attempts_{email}"
    attempts = getattr(verify_otp_code, attempts_key, 0)
    
    otp = OTPVerification.objects(email=email, code=code).first()
    
    if not otp:
        attempts += 1
        setattr(verify_otp_code, attempts_key, attempts)
        
        if attempts >= 3:
            
            OTPVerification.objects(email=email).delete()
            return None, "Code invalide. Vous avez dépassé le nombre de tentatives autorisées (3). Veuillez demander un nouveau code."
        
        remaining = 3 - attempts
        return None, f"Code invalide. Il vous reste {remaining} tentative(s)."
    
    
    setattr(verify_otp_code, attempts_key, 0)
    
    if not otp.is_valid():
        return None, "Le code a expiré. Veuillez demander un nouveau code (valable 15 minutes)."
    
    if otp.used:
        return None, "Ce code a déjà été utilisé. Veuillez demander un nouveau code."
    
    
    otp.used = True
    otp.save()
    
    return otp.data, None


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
    """Crée une nouvelle vérification OTP"""
    OTPVerification.objects(email=email).delete()
    code = generate_otp_code()
    otp = OTPVerification(
        email=email,
        code=code,
        data=temp_data,
        expires_at=datetime.now() + timedelta(minutes=15)
    )
    otp.save()
    return code

def create_otp_for_recovery(user_id, recovery_email, action):
    """Crée un OTP pour la récupération via email secondaire"""
    OTPVerification.objects(email=recovery_email).delete()
    code = generate_otp_code()
    otp = OTPVerification(
        email=recovery_email,
        code=code,
        data={
            'action': action,
            'user_id': user_id,
            'recovery_email': recovery_email,
            'primary_email': None
        },
        expires_at=datetime.now() + timedelta(minutes=15)
    )
    otp.save()
    return code

def send_otp_email(email, code, action="inscription"):
    """Envoie l'email avec le code OTP"""
    if action == "reset_password":
        subject = "Réinitialisation de votre mot de passe - Code OTP"
        title = "🔐 Réinitialisation du mot de passe"
        message = "Vous avez demandé la réinitialisation de votre mot de passe."
    elif action == "login_2fa":  # 🔥 أضف هذا الشرط الجديد
        subject = "🔐 Code de vérification - Connexion à votre compte"
        title = "🔐 Code de vérification"
        message = "Voici votre code de vérification pour vous connecter à votre compte. Ce code est valable 15 minutes."
    elif action == "recovery_email_verification":
        subject = "Vérification de votre email de récupération - Code OTP"
        title = "🔐 Vérification de l'email de récupération"
        message = "Vous avez ajouté un email de récupération à votre compte."
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
                    <br> Après 3 tentatives infructueuses, le code sera invalidé.
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
    attempts_key = f"otp_attempts_{email}"
    attempts = getattr(verify_otp_code, attempts_key, 0)
    
    otp = OTPVerification.objects(email=email, code=code).first()
    
    if not otp:
        attempts += 1
        setattr(verify_otp_code, attempts_key, attempts)
        
        if attempts >= 3:
            OTPVerification.objects(email=email).delete()
            return None, "Code invalide. Vous avez dépassé le nombre de tentatives autorisées (3). Veuillez demander un nouveau code."
        
        remaining = 3 - attempts
        return None, f"Code invalide. Il vous reste {remaining} tentative(s)."
    
    setattr(verify_otp_code, attempts_key, 0)
    
    if not otp.is_valid():
        return None, "Le code a expiré. Veuillez demander un nouveau code (valable 15 minutes)."
    
    if otp.used:
        return None, "Ce code a déjà été utilisé. Veuillez demander un nouveau code."
    
    otp.used = True
    otp.save()
    
    return otp.data, None


# api/email_utils.py - أضف هذه الدوال في نهاية الملف

def send_recovery_email_confirmation(recipient, name, recovery_email):
    """
    Envoie un email de confirmation pour l'ajout d'un email de récupération
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    subject = "🔐 Confirmation - Email de récupération ajouté"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info {{ background: #e8f4fd; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Email de récupération ajouté</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Un email de récupération a été ajouté à votre compte.</p>
                
                <div class="info">
                    <strong>📧 Email de récupération :</strong><br/>
                    {recovery_email}
                </div>
                
                <p>Cet email pourra être utilisé pour réinitialiser votre mot de passe si vous perdez l'accès à votre compte principal.</p>
                
                <p style="margin-top: 20px;">Si vous n'avez pas effectué cette action, veuillez contacter immédiatement le support.</p>
                
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    text_content = f"""
    🔐 Email de récupération ajouté
    
    Bonjour {name},
    
    Un email de récupération a été ajouté à votre compte.
    
    Email de récupération : {recovery_email}
    
    Cet email pourra être utilisé pour réinitialiser votre mot de passe si vous perdez l'accès à votre compte principal.
    
    Si vous n'avez pas effectué cette action, veuillez contacter immédiatement le support.
    
    Cordialement,
    L'équipe de la plateforme de stages
    """
    
    return send_email(recipient, subject, html_content, text_content)


def send_recovery_email_removed_confirmation(recipient, name):
    """
    Envoie un email de confirmation pour la suppression de l'email de récupération
    """
    subject = "🔐 Confirmation - Email de récupération supprimé"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Email de récupération supprimé</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>L'email de récupération a été supprimé de votre compte.</p>
                
                <div class="warning">
                    <strong>⚠️ Important :</strong><br/>
                    Si vous n'avez pas effectué cette action, veuillez contacter immédiatement le support.
                </div>
                
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    return send_email(recipient, subject, html_content)


def send_password_reset_via_recovery_email(recipient, name, primary_email):
    """
    Envoie un email à l'adresse de récupération pour informer d'une demande de réinitialisation
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    subject = "🔐 Demande de réinitialisation de mot de passe"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .warning {{ background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Demande de réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Une demande de réinitialisation de mot de passe a été faite pour le compte associé à votre email de récupération.</p>
                
                <div class="warning">
                    <strong>📧 Compte principal :</strong><br/>
                    {primary_email}
                </div>
                
                <p>Un code de vérification a été envoyé à cette adresse (<strong>{recipient}</strong>) pour confirmer la réinitialisation.</p>
                
                <p>Si vous n'êtes pas à l'origine de cette demande, veuillez contacter immédiatement le support.</p>
                
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    return send_email(recipient, subject, html_content)


# أضف هذه الدالة في نهاية ملف otp_utils.py

def create_otp_for_password_change(user_id, target_email, primary_email=None):
    """Crée un OTP pour le changement de mot de passe"""
    OTPVerification.objects(email=target_email).delete()
    code = generate_otp_code()
    otp = OTPVerification(
        email=target_email,
        code=code,
        data={
            'action': 'change_password',
            'user_id': user_id,
            'target_email': target_email,
            'primary_email': primary_email or target_email
        },
        expires_at=datetime.now() + timedelta(minutes=15)
    )
    otp.save()
    return code