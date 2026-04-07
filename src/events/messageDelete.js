/**
 * @file Message Delete Event
 * @description Enregistre les messages supprimés en mémoire pour permettre leur consultation ultérieure
 * @module events/messageDelete
 * @listens messageDelete
 * @requires discord.js
 */

const auditService = require('../services/auditService');

// Stockage en mémoire des messages supprimés (max 100 derniers)
const deletedMessages = [];
const MAX_DELETED_MESSAGES = 100;

module.exports = (client) => {
  // Stocke les handlers pour que showdeleted puisse y accéder
  client.eventHandlers = client.eventHandlers || new Map();
  
  client.eventHandlers.set('messageDelete', {
    getDeletedMessages(limit = 10, userId = null) {
      let messages = deletedMessages;
      
      if (userId) {
        messages = messages.filter(msg => msg.author.id === userId);
      }
      
      return messages.slice(0, limit);
    },

    clearHistory() {
      deletedMessages.length = 0;
    }
  });

  client.on('messageDelete', async (message) => {
    try {
      // Ignore les messages des bots
      if (message.author?.bot) return;
      
      // Ignore les messages sans contenu
      if (!message.content && message.attachments.size === 0) return;

      // Stocke le message supprimé
      const deletedData = {
        id: message.id,
        author: {
          id: message.author?.id,
          username: message.author?.username || 'Inconnu',
          displayName: message.author?.displayName || 'Inconnu',
          avatar: message.author?.displayAvatarURL() || null
        },
        content: message.content || '[Aucun contenu texte]',
        attachments: Array.from(message.attachments.values()).map(att => ({
          name: att.name,
          url: att.url,
          size: att.size
        })),
        channel: {
          id: message.channel.id,
          name: message.channel.name
        },
        guild: {
          id: message.guild?.id,
          name: message.guild?.name
        },
        deletedAt: new Date(),
        createdAt: message.createdAt
      };

      deletedMessages.unshift(deletedData);

      // Limite la taille du stockage
      if (deletedMessages.length > MAX_DELETED_MESSAGES) {
        deletedMessages.pop();
      }

      // Note: Les messages supprimés sont stockés en mémoire
      // et peuvent être consultés avec la commande !showdeleted
      
      // Log Audit (v1.0.0)
      await auditService.logDelete(message);

    } catch (error) {
      console.error('Erreur dans l\'event messageDelete:', error);
    }
  });
};
