import base64
import re
from decouple import config
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
import base64 as b64
from datetime import datetime


def send_email(recipient, subject, html_content, text_content=None, attachments=None):
    """
    Envoie un email via SendGrid
    """
    try:
        # Get SendGrid configuration from environment
        sg_api_key = config('SENDGRID_API_KEY')
        from_email = config('FROM_EMAIL')
        from_name = config('FROM_NAME', default='University Stage')
        frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
        
        # Create email
        message = Mail(
            from_email=f"{from_name} <{from_email}>",
            to_emails=recipient,
            subject=subject,
            html_content=html_content
        )
        
        # Add plain text version if provided
        if text_content:
            message.text_content = text_content
        
        # Add attachments if any
        if attachments:
            for filename, file_content, content_type in attachments:
                encoded = b64.b64encode(file_content).decode()
                attachment = Attachment(
                    FileContent(encoded),
                    FileName(filename),
                    FileType(content_type),
                    Disposition('attachment')
                )
                message.add_attachment(attachment)
        
        # Send email
        sg = SendGridAPIClient(sg_api_key)
        response = sg.send(message)
        
        print(f"✅ Email envoyé à {recipient} - Sujet: {subject} - Status: {response.status_code}")
        
        # Also print OTP code if present (for debugging)
        match = re.search(r'<strong>(\d{6})</strong>', html_content)
        if match:
            print(f"📧 CODE OTP: {match.group(1)}")
        
        return response.status_code in [200, 202]
        
    except Exception as e:
        print(f"❌ Erreur envoi email à {recipient}: {str(e)}")
        # Fallback to simulation mode for debugging
        print("\n" + "="*60)
        print(f"📧 [SIMULATION] Email à : {recipient}")
        print(f"📧 Sujet : {subject}")
        match = re.search(r'<strong>(\d{6})</strong>', html_content)
        if match:
            print(f"📧 CODE OTP : {match.group(1)}")
        else:
            print(f"📧 Contenu HTML : {html_content[:200]}...")
        print("="*60 + "\n")
        return False


def send_approval_email(recipient, name, role, approver):
    """
    Envoie un email de notification d'approbation
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    subject = f"✅ Votre compte {role} a été approuvé"
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ 
                display: inline-block;
                padding: 12px 24px;
                background: #22c55e;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                margin-top: 20px;
            }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Compte approuvé !</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Félicitations ! Votre inscription en tant que <strong>{role}</strong> a été <span style="color: #22c55e; font-weight: bold;">approuvée</span> par <strong>{approver}</strong>.</p>
                <p>Vous pouvez maintenant vous connecter à la plateforme et accéder à toutes les fonctionnalités.</p>
                <a href="{frontend_url}/login" class="button">Se connecter</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    text_content = f"""
    ✅ Votre compte {role} a été approuvé
    
    Bonjour {name},
    
    Félicitations ! Votre inscription en tant que {role} a été approuvée par {approver}.
    
    Vous pouvez maintenant vous connecter à la plateforme : {frontend_url}/login
    
    Cordialement,
    L'équipe de la plateforme de stages
    """
    
    return send_email(recipient, subject, html_content, text_content)


def send_rejection_email(recipient, name, role, approver):
    """
    Envoie un email de notification de refus
    """
    subject = f"❌ Votre demande d'inscription {role} a été refusée"
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>❌ Demande refusée</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Nous vous informons que votre demande d'inscription en tant que <strong>{role}</strong> a été <span style="color: #ef4444; font-weight: bold;">refusée</span> par <strong>{approver}</strong>.</p>
                <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter l'administrateur.</p>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    text_content = f"""
    ❌ Votre demande d'inscription {role} a été refusée
    
    Bonjour {name},
    
    Votre demande d'inscription en tant que {role} a été refusée par {approver}.
    
    Cordialement,
    L'équipe de la plateforme de stages
    """
    
    return send_email(recipient, subject, html_content, text_content)


def send_proof_request_email(recipient, name, role, admin_email):
    """
    Envoie un email demandant des justificatifs
    """
    subject = "📎 IMPORTANT : Demande de justificatifs - Validation de votre compte"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .doc-list {{ background: #fff3cd; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }}
            .important {{ background: #e8f4fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📎 Demande de justificatifs</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Votre demande d'inscription en tant que <strong>{role}</strong> a été reçue et est actuellement en cours de traitement.</p>
                
                <div class="doc-list">
                    <strong>📋 Pour finaliser votre inscription, veuillez nous fournir les documents suivants :</strong>
                    <ul style="margin-top: 10px;">
                        <li>Pièce d'identité (carte d'identité ou passeport)</li>
                        <li>Justificatif de poste / fonction (attestation de l'employeur ou de l'université)</li>
                        <li>Document attestant de votre affiliation ({'entreprise' if role == 'Company Manager' else 'université'})</li>
                    </ul>
                </div>
                
                <div class="important">
                    <strong>📧 COMMENT RÉPONDRE ?</strong><br><br>
                    <strong>1.</strong> Répondez DIRECTEMENT à cet email<br>
                    <strong>2.</strong> Joignez vos documents (PDF, JPG, PNG)<br>
                    <strong>3.</strong> Indiquez dans le corps du message : "Je joins les justificatifs demandés"<br><br>
                    <strong>📎 Format accepté :</strong> PDF, JPG, PNG (taille max 10 Mo)
                </div>
                
                <p>Après réception et vérification de vos documents, nous finaliserons l'activation de votre compte.</p>
                <p>Vous recevrez une confirmation par email une fois votre compte activé.</p>
                
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique. Merci de ne pas modifier l'objet de l'email pour faciliter le traitement.</p>
            </div>
        </div>
    </html>
    """
    
    text_content = f"""
    📎 IMPORTANT : Demande de justificatifs - Validation de votre compte
    
    Bonjour {name},
    
    Votre demande d'inscription en tant que {role} a été reçue et est actuellement en cours de traitement.
    
    Pour finaliser votre inscription, veuillez nous fournir les documents suivants :
    
    - Pièce d'identité (carte d'identité ou passeport)
    - Justificatif de poste / fonction (attestation de l'employeur ou de l'université)
    - Document attestant de votre affiliation ({'entreprise' if role == 'Company Manager' else 'université'})
    
    COMMENT RÉPONDRE ?
    
    1. Répondez DIRECTEMENT à cet email
    2. Joignez vos documents (PDF, JPG, PNG)
    3. Indiquez dans le corps du message : "Je joins les justificatifs demandés"
    
    Format accepté : PDF, JPG, PNG (taille max 10 Mo)
    
    Après réception et vérification de vos documents, nous finaliserons l'activation de votre compte.
    Vous recevrez une confirmation par email une fois votre compte activé.
    
    Cordialement,
    L'équipe de la plateforme de stages
    """
    
    return send_email(recipient, subject, html_content, text_content)


def send_proof_received_confirmation(recipient, name):
    """
    Envoie une confirmation de réception des justificatifs
    """
    subject = "✅ Confirmation de réception de vos justificatifs"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Documents reçus</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Nous avons bien reçu vos justificatifs.</p>
                <p>Ils sont actuellement en cours de vérification par notre équipe. Nous reviendrons vers vous sous 48h pour vous informer de la décision concernant votre inscription.</p>
                <p>Si vos documents sont conformes, vous recevrez un email de confirmation d'activation de votre compte.</p>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    return send_email(recipient, subject, html_content)


def send_application_confirmation_student(recipient, student_name, offer_title):
    """
    Envoie une confirmation de candidature à l'étudiant
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    subject = f"📝 Confirmation de candidature: {offer_title}"
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📝 Candidature envoyée</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{student_name}</strong>,</p>
                <p>Votre candidature pour le stage <strong>"{offer_title}"</strong> a été soumise avec succès.</p>
                <p>Vous pouvez suivre l'état de votre candidature dans votre tableau de bord.</p>
                <a href="{frontend_url}/student/applications" class="button">Voir mes candidatures</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    return send_email(recipient, subject, html_content)


def send_application_notification_company(recipient, offer_title, student_name):
    """
    Envoie une notification à l'entreprise pour une nouvelle candidature
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    subject = f"🔔 Nouvelle candidature pour {offer_title}"
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 Nouvelle candidature</h1>
            </div>
            <div class="content">
                <p>Bonjour,</p>
                <p>Une nouvelle candidature a été soumise par <strong>{student_name}</strong> pour le stage <strong>"{offer_title}"</strong>.</p>
                <p>Connectez-vous à votre espace entreprise pour consulter cette candidature et y répondre.</p>
                <a href="{frontend_url}/company/applications" class="button">Voir les candidatures</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    return send_email(recipient, subject, html_content)


def send_company_response_email(recipient, offer_title, status):
    """
    Envoie un email à l'étudiant concernant la réponse de l'entreprise
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    status_text = "acceptée" if status == "accepted" else "refusée"
    status_color = "#22c55e" if status == "accepted" else "#ef4444"
    
    subject = f"📬 Mise à jour de votre candidature: {offer_title}"
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, {status_color}, {status_color}); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: {status_color}; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📬 Candidature {status_text}</h1>
            </div>
            <div class="content">
                <p>Bonjour,</p>
                <p>Votre candidature pour le stage <strong>"{offer_title}"</strong> a été <strong style="color: {status_color};">{status_text}</strong> par l'entreprise.</p>
                <p>Connectez-vous à votre tableau de bord pour plus de détails.</p>
                <a href="{frontend_url}/student/applications" class="button">Voir mes candidatures</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    return send_email(recipient, subject, html_content)


def send_validation_pending_to_co_dept(co_dept_email, co_dept_name, student_name, company_name, offer_title, application_id):
    """
    Envoie une notification au Co Department Head pour validation
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    subject = "📋 Nouvelle convention de stage en attente de validation"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info {{ background: #e8f4fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Nouvelle convention à valider</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{co_dept_name}</strong>,</p>
                <p>Une nouvelle candidature a été acceptée par l'entreprise et nécessite votre validation.</p>
                <div class="info">
                    <strong>📌 Détails de la demande :</strong><br/>
                    • <strong>Étudiant :</strong> {student_name}<br/>
                    • <strong>Entreprise :</strong> {company_name}<br/>
                    • <strong>Stage :</strong> {offer_title}
                </div>
                <a href="{frontend_url}/co-dept-head/validations" class="button">📋 Voir les demandes</a>
                <p style="margin-top: 20px;">Cordialement,<br>Plateforme de stages PFE</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    return send_email(co_dept_email, subject, html_content)


def send_convention_validated_email(application, co_dept):
    """
    Envoie un email quand la convention est validée avec PDF en pièce jointe
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    attachments = []
    if hasattr(application, 'convention_pdf') and application.convention_pdf:
        try:
            application.convention_pdf.seek(0)
            pdf_content = application.convention_pdf.read()
            filename = f"convention_{application.student.full_name}_{application.offer.company.company_name}.pdf"
            attachments.append((filename, pdf_content, 'application/pdf'))
        except Exception as e:
            print(f"❌ Erreur lecture PDF: {e}")
    
    # Email pour l'étudiant
    student_subject = f"✅ Votre convention de stage '{application.offer.title}' a été validée"
    student_html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info {{ background: #e8f4fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Convention de stage validée</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{application.student.full_name}</strong>,</p>
                <p>Félicitations ! Votre convention de stage pour <strong>"{application.offer.title}"</strong> a été validée par <strong>{co_dept.full_name}</strong>.</p>
                <div class="info">
                    <strong>📌 Récapitulatif :</strong><br/>
                    • Entreprise : {application.offer.company.company_name}<br/>
                    • Durée : {application.offer.duration}<br/>
                    • Date de début : {application.offer.start_date.strftime('%d/%m/%Y') if application.offer.start_date else 'À déterminer'}
                </div>
                <p>Vous trouverez ci-joint votre convention de stage en format PDF.</p>
                <a href="{frontend_url}/student/applications" class="button">📋 Voir mes candidatures</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    send_email(application.student.user.email, student_subject, student_html, attachments=attachments)
    
    # Email pour l'entreprise
    company_subject = f"✅ Convention validée pour {application.student.full_name}"
    company_html = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info {{ background: #e8f4fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Convention de stage validée</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{application.offer.company.company_name}</strong>,</p>
                <p>La convention de stage pour <strong>{application.student.full_name}</strong> a été validée par l'université.</p>
                <div class="info">
                    <strong>📌 Récapitulatif :</strong><br/>
                    • Étudiant : {application.student.full_name}<br/>
                    • Stage : {application.offer.title}<br/>
                    • Durée : {application.offer.duration}<br/>
                    • Date de début : {application.offer.start_date.strftime('%d/%m/%Y') if application.offer.start_date else 'À déterminer'}
                </div>
                <p>Vous trouverez ci-joint la convention de stage en format PDF.</p>
                <a href="{frontend_url}/company/applications" class="button">📋 Voir les candidatures</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    send_email(application.offer.company.user.email, company_subject, company_html, attachments=attachments)


def send_convention_rejected_email(application, co_dept, rejection_reason):
    """
    Envoie un email quand la convention est refusée
    """
    frontend_url = config('FRONTEND_URL', default='http://localhost:5173')
    
    subject = f"❌ Votre demande de stage '{application.offer.title}' a été refusée"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ text-align: center; padding: 20px; background: linear-gradient(135deg, #ef4444, #dc2626); border-radius: 10px 10px 0 0; }}
            .header h1 {{ color: white; margin: 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .reason {{ background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>❌ Demande de stage refusée</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{application.student.full_name}</strong>,</p>
                <p>Votre demande de stage pour <strong>"{application.offer.title}"</strong> a été refusée par <strong>{co_dept.full_name}</strong>.</p>
                <div class="reason">
                    <strong>📝 Motif du refus :</strong><br/>
                    {rejection_reason}
                </div>
                <a href="{frontend_url}/student/applications" class="button">📋 Voir mes candidatures</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    send_email(application.student.user.email, subject, html_content)
    
    # Email pour l'entreprise
    company_subject = f"❌ Candidature refusée pour {application.student.full_name}"
    company_html = f"""
    <html>
    <body>
        <h2>❌ Candidature refusée par l'université</h2>
        <p>La candidature de <strong>{application.student.full_name}</strong> pour le stage <strong>"{application.offer.title}"</strong> a été refusée.</p>
        <p><strong>📝 Motif :</strong> {rejection_reason}</p>
        <p>Connectez-vous à votre espace pour plus d'informations.</p>
        <p>Cordialement,<br>L'équipe de la plateforme de stages</p>
    </body>
    </html>
    """
    send_email(application.offer.company.user.email, company_subject, company_html)