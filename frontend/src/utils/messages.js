export const VALIDATION_MESSAGES = {
  PASSWORD_MISMATCH: "Les mots de passe ne correspondent pas.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 8 caractères.",
  SKILLS_REQUIRED: "Ajoutez au moins une compétence.",
  ROLE_REQUIRED: "Veuillez sélectionner votre rôle.",
  STUDENT_EMAIL_UNIVERSITY: "Vous devez utiliser une adresse email universitaire algérienne (contenant 'univ' et '.dz').",
  LOGIN_CREDENTIALS_REQUIRED: "Email et mot de passe requis.",
  LOGIN_INVALID: "Email ou mot de passe incorrect.",
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Connexion réussie !",
  OTP_SENT: "Un code de vérification a été envoyé à votre email.",
  OTP_VERIFIED: "Inscription réussie !",
  LOGOUT_SUCCESS: "Déconnexion réussie",
};

export const OTP_MESSAGES = {
  CODE_REQUIRED: "Le code de vérification doit contenir exactement 6 chiffres.",
  CODE_INVALID: "❌ Code invalide. Vérifiez le code reçu par email.",
  CODE_EXPIRED: "❌ Le code a expiré (valable 15 minutes). Veuillez demander un nouveau code.",
  CODE_ALREADY_USED: "❌ Ce code a déjà été utilisé. Veuillez demander un nouveau code.",
  CODE_TOO_MANY_ATTEMPTS: "❌ Trop de tentatives. Veuillez demander un nouveau code.",
  RESEND_SUCCESS: "✅ Un nouveau code a été envoyé par email.",
  RESEND_ERROR: "❌ Erreur lors du renvoi du code. Veuillez réessayer.",
};

export const ERROR_MESSAGES = {
  SERVER_ERROR: "Erreur de connexion au serveur.",
  REGISTRATION_FAILED: "Erreur lors de l'inscription.",
  NETWORK_ERROR: "Erreur de connexion. Vérifiez votre réseau.",
  UNKNOWN_ERROR: "Une erreur inattendue s'est produite.",
};

export const translateError = (errorMessage) => {
  if (!errorMessage) return ERROR_MESSAGES.UNKNOWN_ERROR;
  return errorMessage;
};

export const extractErrors = (errors) => {
  if (!errors) return [];
  const messages = [];
  for (const [field, errorList] of Object.entries(errors)) {
    if (Array.isArray(errorList)) {
      for (const msg of errorList) {
        messages.push(msg);
      }
    } else if (typeof errorList === 'string') {
      messages.push(errorList);
    }
  }
  return messages;
};