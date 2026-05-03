// frontend/src/components/LanguageSelector.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Globe, ChevronDown, Check, Loader2 } from 'lucide-react';
import { translateText } from '../services/translationService';

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷', nativeName: 'Français', dir: 'ltr' },
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', nativeName: 'العربية', dir: 'rtl' },
  { code: 'es', name: 'Español', flag: '🇪🇸', nativeName: 'Español', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'pt', name: 'Português', flag: '🇵🇹', nativeName: 'Português', dir: 'ltr' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', nativeName: 'Русский', dir: 'ltr' },
];

const LanguageSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('fr');
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const dropdownRef = useRef(null);

  // Appliquer la direction RTL pour l'arabe
  const applyDirection = (langCode) => {
    const lang = languages.find(l => l.code === langCode);
    if (lang?.dir === 'rtl') {
      document.body.dir = 'rtl';
    } else {
      document.body.dir = 'ltr';
    }
  };

  // Traduire toute la page
  const translatePage = async (targetLang) => {
    setIsTranslating(true);
    setProgress(0);
    applyDirection(targetLang);
    
    // Récupérer tous les éléments texte
    const elements = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, p, span, button, a, label, div, td, th, li'
    );
    
    const textsToTranslate = [];
    const elementsToTranslate = [];
    
    elements.forEach(el => {
      if (el.closest('.no-translate')) return;
      if (el.getAttribute('data-no-translate')) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
      if (el.getAttribute('data-translated') === targetLang) return;
      
      const originalText = el.innerText.trim();
      if (originalText && originalText.length > 0 && originalText.length < 1000) {
        textsToTranslate.push(originalText);
        elementsToTranslate.push({ el, originalText });
      }
    });
    
    if (textsToTranslate.length === 0) {
      setIsTranslating(false);
      return;
    }
    
    // Traduire par lots de 3
    const batchSize = 3;
    let completed = 0;
    
    for (let i = 0; i < textsToTranslate.length; i += batchSize) {
      const batch = textsToTranslate.slice(i, i + batchSize);
      const elementsBatch = elementsToTranslate.slice(i, i + batchSize);
      
      const translatedBatch = await Promise.all(
        batch.map(text => translateText(text, targetLang, 'fr'))
      );
      
      translatedBatch.forEach((translatedText, index) => {
        if (translatedText && translatedText !== elementsBatch[index].originalText) {
          elementsBatch[index].el.innerText = translatedText;
          elementsBatch[index].el.setAttribute('data-translated', targetLang);
        }
      });
      
      completed += batch.length;
      setProgress(Math.round((completed / textsToTranslate.length) * 100));
    }
    
    setIsTranslating(false);
    setProgress(0);
  };

  const changeLanguage = async (langCode) => {
    if (langCode === currentLang) return;
    
    setCurrentLang(langCode);
    localStorage.setItem('selected_language', langCode);
    
    if (langCode === 'fr') {
      window.location.reload();
    } else {
      await translatePage(langCode);
    }
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('selected_language');
    if (savedLang && savedLang !== 'fr' && savedLang !== currentLang) {
      setCurrentLang(savedLang);
      applyDirection(savedLang);
      setTimeout(() => translatePage(savedLang), 1500);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentLanguageDisplay = () => {
    const lang = languages.find(l => l.code === currentLang);
    return lang ? `${lang.flag} ${lang.name}` : '🌐 Langue';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
      >
        {isTranslating ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Globe size={18} />
        )}
        <span className="text-sm hidden sm:inline">{getCurrentLanguageDisplay()}</span>
        <ChevronDown size={14} className={`hidden sm:block transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isTranslating && progress > 0 && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e293b] border border-slate-700 rounded-lg overflow-hidden z-50">
          <div className="p-2 text-xs text-white/70 text-center">Traduction... {progress}%</div>
          <div className="h-1 bg-purple-600/30">
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-white/10">
            <p className="text-xs text-white/50 uppercase tracking-wider">Choisir une langue</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  currentLang === lang.code
                    ? 'bg-purple-600/30 text-purple-300'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1 text-left font-medium">{lang.nativeName}</span>
                {currentLang === lang.code && <Check size={16} className="text-purple-400" />}
              </button>
            ))}
          </div>
          <div className="p-2 border-t border-white/10 text-center">
            <p className="text-[10px] text-white/30">Traduit par MyMemory</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;