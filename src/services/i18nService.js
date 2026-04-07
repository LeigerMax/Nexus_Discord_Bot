/**
 * @file i18n Service
 * @description Service de gestion des traductions (Français/Anglais)
 * @module services/i18nService
 */

const fs = require('node:fs');
const path = require('node:path');

class I18nService {
  constructor() {
    this.locales = new Map();
    this.defaultLocale = 'fr';
    this.loadLocales();
  }

  /**
   * Charge tous les fichiers de langue depuis le dossier locales
   */
  loadLocales() {
    const localesPath = path.join(__dirname, '../public/locales');
    if (!fs.existsSync(localesPath)) {
      fs.mkdirSync(localesPath, { recursive: true });
    }

    const localeFiles = (fs.readdirSync(localesPath) || []).filter(file => file.endsWith('.json'));
    
    for (const file of localeFiles) {
      const locale = file.split('.')[0];
      try {
        const content = fs.readFileSync(path.join(localesPath, file), 'utf8');
        this.locales.set(locale, JSON.parse(content));
        console.log(`✅ Langue chargée: ${locale}`);
      } catch (error) {
        console.error(`❌ Erreur lors du chargement de la langue ${locale}:`, error.message);
      }
    }
  }

  /**
   * Traduit une clé dans une langue donnée
   * @param {string} key - La clé de traduction (ex: 'ping.latency')
   * @param {string} locale - Le code de la langue (fr, en)
   * @param {Object} params - Paramètres de remplacement (ex: { value: 100 })
   * @returns {string} - La chaîne traduite
   */
  t(key, locale = this.defaultLocale, params = {}) {
    const translations = this.locales.get(locale) || this.locales.get(this.defaultLocale) || {};
    let text = this.getNestedValue(translations, key);

    if (text === undefined) {
      // Fallback sur la langue par défaut si non trouvé
      const defaultTranslations = this.locales.get(this.defaultLocale) || {};
      text = this.getNestedValue(defaultTranslations, key);
    }

    if (text === undefined) {
      return key; // Retourne la clé si aucune traduction n'est trouvée
    }

    // Remplacement des paramètres {param}
    Object.keys(params).forEach(param => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });

    return text;
  }

  /**
   * Récupère la langue configurée pour un serveur
   * @param {string} guildId 
   * @returns {string}
   */
  getGuildLocale(guildId) {
    if (!guildId) return this.defaultLocale;
    const storageService = require('./storageService');
    const config = storageService.get(guildId);
    return config?.language || this.defaultLocale;
  }

  /**
   * Récupère une valeur imbriquée dans un objet à partir d'une chaîne pointée (ex: 'a.b.c')
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
  }
}

module.exports = new I18nService();
