/**
 * @file Message Update Event
 * @description Log les modifications de messages pour l'Audit (v1.0.0)
 * @module events/messageUpdate
 * @listens messageUpdate
 */

const auditService = require('../services/auditService');

module.exports = (client) => {
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      // Partial check - récupère le message complet si nécessaire
      if (oldMessage.partial) await oldMessage.fetch();
      if (newMessage.partial) await newMessage.fetch();

      await auditService.logEdit(oldMessage, newMessage);
    } catch (error) {
      console.error('Erreur dans l\'event messageUpdate:', error);
    }
  });
};
