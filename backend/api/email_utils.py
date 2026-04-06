
import requests
from decouple import config

def send_email(recipient, subject, html_content, text_content=None):
    """
    Envoie un email via SendGrid
    """
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, Email, To
        
        api_key = config('SENDGRID_API_KEY')
        from_email = config('FROM_EMAIL')
        from_name = config('FROM_NAME', default='PFE Internship Platform')
        
        if not api_key:
            print(" SENDGRID_API_KEY not configured")
            return False
            
        sg = sendgrid.SendGridAPIClient(api_key=api_key)
        
        from_address = Email(from_email, name=from_name)
        to_address = To(recipient)
        
        mail = Mail(from_address, to_address, subject, html_content=html_content)
        
        response = sg.send(mail)
        print(f" Email envoyé à {recipient} depuis {from_email}")
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        print(f" Email send error: {e}")
        return False


def send_approval_email(recipient, name, role, approver):
    """
    Envoie un email de confirmation d'approbation
    """
    subject = f" Votre compte {role} a été approuvé"
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
                <h1> Compte approuvé !</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Félicitations ! Votre inscription en tant que <strong>{role}</strong> a été <span style="color: #22c55e; font-weight: bold;">approuvée</span> par <strong>{approver}</strong>.</p>
                <p>Vous pouvez maintenant vous connecter à la plateforme et accéder à toutes les fonctionnalités.</p>
                <a href="http://localhost:5173/login" class="button">Se connecter</a>
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
     Votre compte {role} a été approuvé
    
    Bonjour {name},
    
    Félicitations ! Votre inscription en tant que {role} a été approuvée par {approver}.
    
    Vous pouvez maintenant vous connecter à la plateforme : http://localhost:5173/login
    
    Cordialement,
    L'équipe de la plateforme de stages
    """
    
    return send_email(recipient, subject, html_content, text_content)


def send_rejection_email(recipient, name, role, approver):
    """
    Envoie un email de notification de refus
    """
    subject = f" Votre demande d'inscription {role} a été refusée"
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
                <h1> Demande refusée</h1>
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
    </body>
    </html>
    """
    
    text_content = f"""
     Votre demande d'inscription {role} a été refusée
    
    Bonjour {name},
    
    Votre demande d'inscription en tant que {role} a été refusée par {approver}.
    
    Cordialement,
    L'équipe de la plateforme de stages
    """
    
    return send_email(recipient, subject, html_content, text_content)


def send_proof_request_email(recipient, name, role, admin_email):
    """
    Envoie un email demandant des preuves d'identité et de poste
    L'utilisateur doit répondre à cet email avec ses documents
    """
    subject = " IMPORTANT : Demande de justificatifs - Validation de votre compte"
    
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
                <h1> Demande de justificatifs</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{name}</strong>,</p>
                <p>Votre demande d'inscription en tant que <strong>{role}</strong> a été reçue et est actuellement en cours de traitement.</p>
                
                <div class="doc-list">
                    <strong> Pour finaliser votre inscription, veuillez nous fournir les documents suivants :</strong>
                    <ul style="margin-top: 10px;">
                        <li>Pièce d'identité (carte d'identité ou passeport)</li>
                        <li>Justificatif de poste / fonction (attestation de l'employeur ou de l'université)</li>
                        <li>Document attestant de votre affiliation ({'entreprise' if role == 'Company Manager' else 'université'})</li>
                    </ul>
                </div>
                
                <div class="important">
                    <strong> COMMENT RÉPONDRE ?</strong><br><br>
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
    </body>
    </html>
    """
    
    text_content = f"""
     IMPORTANT : Demande de justificatifs - Validation de votre compte
    
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
    Envoie un email confirmant la réception des documents
    """
    subject = " Confirmation de réception de vos justificatifs"
    
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
                <h1> Documents reçus</h1>
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
    </body>
    </html>
    """
    
    return send_email(recipient, subject, html_content, text_content)
    

def send_application_confirmation_student(recipient, student_name, offer_title):
    subject = f"Application Confirmation: {offer_title}"
    html = f"""
    <html><body>
    <p>Hello {student_name},</p>
    <p>Your application for <strong>{offer_title}</strong> has been submitted successfully.</p>
    <p>You can track your application status in your dashboard.</p>
    <p>Best regards,<br>Internship Platform</p>
    </body></html>
    """
    return send_email(recipient, subject, html)

def send_application_notification_company(recipient, offer_title, student_name):
    subject = f"New Application for {offer_title}"
    html = f"""
    <html><body>
    <p>A new application has been submitted by <strong>{student_name}</strong> for the internship <strong>{offer_title}</strong>.</p>
    <p>Please log in to your company dashboard to review and respond.</p>
    <p>Best regards,<br>Internship Platform</p>
    </body></html>
    """
    return send_email(recipient, subject, html)

def send_company_response_email(recipient, offer_title, status):
    subject = f"Application Update: {offer_title}"
    html = f"""
    <html><body>
    <p>Your application for <strong>{offer_title}</strong> has been <strong>{status}</strong> by the company.</p>
    <p>Log in to your dashboard for more details.</p>
    <p>Best regards,<br>Internship Platform</p>
    </body></html>
    """
    return send_email(recipient, subject, html)


def send_validation_pending_to_co_dept(co_dept_email, co_dept_name, student_name, company_name, offer_title, application_id):
    """Email au Co Dept Head pour l'informer d'une candidature à valider"""
    subject = " Nouvelle convention de stage en attente de validation"
    
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
                <h1> Nouvelle convention à valider</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{co_dept_name}</strong>,</p>
                <p>Une nouvelle candidature a été acceptée par l'entreprise et nécessite votre validation.</p>
                <div class="info">
                    <strong> Détails de la demande :</strong><br/>
                    • <strong>Étudiant :</strong> {student_name}<br/>
                    • <strong>Entreprise :</strong> {company_name}<br/>
                    • <strong>Stage :</strong> {offer_title}
                </div>
                <a href="http://localhost:5173/co-dept-head/validations" class="button"> Voir les demandes</a>
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
    """Email quand la convention est validée avec PDF en pièce jointe"""
    
    subject = f" Votre convention de stage '{application.offer.title}' a été validée"
    
    html_content = f"""
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
                <h1> Convention de stage validée</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{application.student.full_name}</strong>,</p>
                <p>Félicitations ! Votre convention de stage pour <strong>"{application.offer.title}"</strong> a été validée par <strong>{co_dept.full_name}</strong>.</p>
                <div class="info">
                    <strong> Récapitulatif :</strong><br/>
                    • Entreprise : {application.offer.company.company_name}<br/>
                    • Durée : {application.offer.duration}<br/>
                    • Date de début : {application.offer.start_date.strftime('%d/%m/%Y') if application.offer.start_date else 'À déterminer'}
                </div>
                <p>Connectez-vous à votre espace étudiant pour télécharger votre convention.</p>
                <a href="http://localhost:5173/student/applications" class="button"> Voir mes candidatures</a>
                <p style="margin-top: 20px;">Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique, merci de ne pas y répondre.</p>
            </div>
        </div>
    </html>
    """
    
    send_email(application.student.user.email, subject, html_content)
    
    
    company_subject = f" Convention validée pour {application.student.full_name}"
    company_html = f"""
    <html>
    <body>
        <h2>Convention de stage validée</h2>
        <p>La convention de stage pour <strong>{application.student.full_name}</strong> a été validée par l'université.</p>
        <p>Cordialement.</p>
    </body>
    </html>
    """
    send_email(application.offer.company.user.email, company_subject, company_html)


def send_convention_rejected_email(application, co_dept, rejection_reason):
    """Email quand la convention est refusée"""
    
    subject = f" Votre demande de stage '{application.offer.title}' a été refusée"
    
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
            .footer {{ text-align: center; margin-top: 20px; font-size: 12px; color: #666; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1> Demande de stage refusée</h1>
            </div>
            <div class="content">
                <p>Bonjour <strong>{application.student.full_name}</strong>,</p>
                <p>Votre demande de stage pour <strong>"{application.offer.title}"</strong> a été refusée par <strong>{co_dept.full_name}</strong>.</p>
                <div class="reason">
                    <strong>📝 Motif du refus :</strong><br/>
                    {rejection_reason}
                </div>
                <p>Cordialement,<br>L'équipe de la plateforme de stages</p>
            </div>
            <div class="footer">
                <p>Ceci est un email automatique.</p>
            </div>
        </div>
    </html>
    """
    
    send_email(application.student.user.email, subject, html_content)
    
   
    company_subject = f" Candidature refusée pour {application.student.full_name}"
    company_html = f"""
    <html>
    <body>
        <h2>Candidature refusée par l'université</h2>
        <p>La candidature de <strong>{application.student.full_name}</strong> a été refusée.</p>
        <p><strong>Motif :</strong> {rejection_reason}</p>
    </body>
    </html>
    """
    send_email(application.offer.company.user.email, company_subject, company_html)