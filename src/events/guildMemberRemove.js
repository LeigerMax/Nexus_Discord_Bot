/**
 * @file Guild Member Remove Event
 * @description Log les départs de membres et met à jour les statistiques (v1.1.0)
 * @module events/guildMemberRemove
 * @listens guildMemberRemove
 */

const auditService = require('../services/auditService');
const statsService = require('../services/statsService');

module.exports = (client) => {
  client.on('guildMemberRemove', async (member) => {
    try {
      // Log Audit (v1.0.0)
      await auditService.logLeave(member);

      // MAJ Stats (v1.1.0)
      await statsService.updateStats(member.guild);
    } catch (error) {
      console.error('Erreur dans l\'event guildMemberRemove:', error);
    }
  });
};
