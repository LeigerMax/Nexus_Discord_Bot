/**
 * @file Auto Feur Event
 * @description Répond automatiquement "feur" aux messages se terminant par "quoi"
 * @module events/autoFeur
 * @listens messageCreate
 */

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
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