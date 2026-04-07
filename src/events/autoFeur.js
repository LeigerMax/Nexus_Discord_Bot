/**
 * @file Auto Feur Event
 * @description Répond automatiquement "feur" aux messages se terminant par "quoi"
 * @module events/autoFeur
 */

const storageService = require('../services/storageService');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Vérifie si la fonctionnalité est activée pour ce serveur
    const config = storageService.get(message.guild.id);
    if (config && config.features && config.features.autoFeur === false) {
      return; 
    }

    const content = message.content.toLowerCase().trim();
    
    if (content.endsWith('quoi') || content.endsWith('quoi?') || content === 'quoi') {
      try {
        await message.reply('feur');
      } catch {
        // Ignorer silencieusement les erreurs d'envoi
      }
    }
  });
};