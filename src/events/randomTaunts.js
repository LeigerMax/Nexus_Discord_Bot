/**
 * @file Random Taunts & Praises Event
 * @description Génère aléatoirement des moqueries contre les loosers ou des éloges envers les kings selon une probabilité configurable
 * @module events/randomTaunts
 */

const storageService = require('../services/storageService');
const i18n = require('../services/i18nService');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Récupère la config
    const config = storageService.get(message.guild.id);
    if (!config || !config.features || config.features.randomTaunts !== true) {
      return; 
    }

    const chancePct = config.features.randomTauntsChance !== undefined ? config.features.randomTauntsChance : 1.0;
    
    // Si la probabilité est configurée à 0, ne rien faire
    if (chancePct <= 0) return;

    // Calcul de la chance (par exemple, 1.0% = 0.01)
    const rand = Math.random() * 100;
    if (rand > chancePct) {
      return; // Ne s'est pas déclenché
    }

    // Récupération des Kings et Loosers
    // On s'assure d'avoir des listes depuis la config, sinon tableaux vides
    const kings = config.kings || [];
    const loosers = config.loosers || [];
    
    const hasKings = kings.length > 0;
    const hasLoosers = loosers.length > 0;

    // S'il n'y a personne de configuré, on ne peut rien dire
    if (!hasKings && !hasLoosers) return;

    const locale = i18n.getGuildLocale(message.guild.id);

    try {
      // Choix aléatoire entre King ou Looser
      // S'il y a les deux, 50/50. Sinon on force l'un ou l'autre.
      let targetType = '';
      if (hasKings && hasLoosers) {
        targetType = Math.random() > 0.5 ? 'king' : 'looser';
      } else if (hasKings) {
        targetType = 'king';
      } else {
        targetType = 'looser';
      }

      if (targetType === 'looser') {
        // Sélectionne un looser au hasard
        const targetId = loosers[Math.floor(Math.random() * loosers.length)];
        
        // Récupérer le cache de membre pour valider qu'il est bien sur le serveur
        let member;
        try { member = await message.guild.members.fetch(targetId); } catch(e) {}
        if (!member) return;

        // Récupérer une insulte parmi les 5 disponibles dans les traductions
        // La structure JSON est dans le modèle events.random_taunts.insults (index 0-4)
        // Mais i18n.t() permet de cibler un tableau ou un index
        // En accédant via i18nService aux clés, il suffit de taper events.random_taunts.insults.[i]
        const insultIndex = Math.floor(Math.random() * 5);
        const text = i18n.t(`events.random_taunts.insults.${insultIndex}`, locale, { user: `<@${targetId}>` });
        
        await message.channel.send(text);
      } else {
        // Sélectionne un king au hasard
        const targetId = kings[Math.floor(Math.random() * kings.length)];
        
        let member;
        try { member = await message.guild.members.fetch(targetId); } catch(e) {}
        if (!member) return;

        const praiseIndex = Math.floor(Math.random() * 5);
        const text = i18n.t(`events.random_taunts.praises.${praiseIndex}`, locale, { user: `<@${targetId}>` });
        
        await message.channel.send(text);
      }

    } catch (err) {
      console.error('Erreur lors du randomTaount:', err);
    }
  });
};
