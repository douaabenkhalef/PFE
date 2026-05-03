// frontend/src/services/translationService.js
// Version MyMemory API (gratuite, sans clé)

const MY_MEMORY_API = 'https://api.mymemory.translated.net/get';

// Cache des traductions
const translationCache = new Map();

export const translateText = async (text, targetLang, sourceLang = 'fr') => {
  if (!text || text.trim() === '') return text;
  if (targetLang === sourceLang) return text;
  
  // Vérifier le cache
  const cacheKey = `${text}_${targetLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }
  
  try {
    const response = await fetch(
      `${MY_MEMORY_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    );
    const data = await response.json();
    
    let translatedText = data.responseData?.translatedText || text;
    
    // Nettoyer les caractères HTML encodés
    translatedText = translatedText.replace(/&#39;/g, "'")
                                   .replace(/&quot;/g, '"')
                                   .replace(/&amp;/g, '&')
                                   .replace(/&lt;/g, '<')
                                   .replace(/&gt;/g, '>');
    
    // Mettre en cache
    translationCache.set(cacheKey, translatedText);
    
    return translatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
};

export const translateMultiple = async (texts, targetLang, sourceLang = 'fr') => {
  const promises = texts.map(text => translateText(text, targetLang, sourceLang));
  return Promise.all(promises);
};

export const clearTranslationCache = () => {
  translationCache.clear();
};