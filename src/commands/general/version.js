/**
 * @file Version Command
 * @description Affiche la version actuelle du bot, les nouveautés et l'historique des versions
 * @module commands/general/version
 * @category General
 * @requires discord.js
 */

const { EmbedBuilder } = require('discord.js');
const versionData = require('../../config/version.json');

function addChunkedFields(embed, title, items, maxLength = 1000) {
  if (!items || items.length === 0) return;
  let currentChunk = '';
  let chunkIndex = 1;
  for (const item of items) {
    const line = `• ${item}\n`;
    if (currentChunk.length + line.length > maxLength) {
      embed.addFields({
        name: chunkIndex === 1 ? title : `${title} (${chunkIndex})`,
        value: currentChunk.trim() || '...'
      });
      currentChunk = line;
      chunkIndex++;
    } else {
      currentChunk += line;
    }
  }
  if (currentChunk.trim().length > 0) {
    embed.addFields({
      name: chunkIndex === 1 ? title : `${title} (${chunkIndex})`,
      value: currentChunk.trim() || '...'
    });
  }
}


module.exports = {
  name: 'version',
  description: 'Affiche la version actuelle du bot et les nouveautés',
  usage: '!version [version]',
  
  async execute(message, args, context) {
    const { t, locale } = context;
    const isEn = locale === 'en';

    try {
      // Si un numéro de version est spécifié
      const requestedVersion = args[0];
      
      if (requestedVersion && versionData.changelog[requestedVersion]) {
        // Affiche les détails d'une version spécifique
        const versionInfo = versionData.changelog[requestedVersion];
        const features = (isEn && versionInfo.features_en) ? versionInfo.features_en : versionInfo.features;
        const fixes = (isEn && versionInfo.fixes_en) ? versionInfo.fixes_en : versionInfo.fixes;
        
        const embed = new EmbedBuilder()
          .setColor(0x808080)
          .setTitle(t('version.history_title', { version: requestedVersion }))
          .setDescription(t('version.published_on', { date: versionInfo.date }))
          .setFooter({ text: t('version.current_footer', { version: versionData.current }) })
          .setTimestamp();

        addChunkedFields(embed, t('version.features_title'), features);
        addChunkedFields(embed, t('version.fixes_title'), fixes);

        return message.reply({ embeds: [embed] });
      }

      // Affiche la version actuelle
      const currentVersionKey = `v${versionData.current}`;
      const currentVersionInfo = versionData.changelog[currentVersionKey];
      const allVersions = Object.keys(versionData.changelog).reverse().slice(0, 5);
      
      const currentFeatures = (isEn && currentVersionInfo?.features_en) ? currentVersionInfo.features_en : currentVersionInfo?.features;
      const currentFixes = (isEn && currentVersionInfo?.fixes_en) ? currentVersionInfo.fixes_en : currentVersionInfo?.fixes;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('version.bot_title', { version: versionData.current }))
        .setDescription(t('version.published_on', { date: versionData.releaseDate }))
        .setThumbnail(message.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setFooter({ text: t('common.requested_by', { user: message.author.username }) })
        .setTimestamp();

      // Nouveautés de la version actuelle
      addChunkedFields(embed, t('version.features_title'), currentFeatures);

      // Corrections de la version actuelle
      addChunkedFields(embed, t('version.fixes_title'), currentFixes);

      // Historique des versions
      embed.addFields({
        name: t('version.recent_versions'),
        value: allVersions.map(v => `\`${v}\` - ${versionData.changelog[v].date}`).join('\n') +
               `\n\n${t('version.history_hint', { version: allVersions[1] || 'v0.2.0' })}`
      });

      // Informations
      embed.addFields({
        name: t('version.info_title'),
        value: t('version.developed_by', { developer: versionData.developer }) + `\n` +
               t('version.prefix_label', { prefix: versionData.prefix })
      });

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Erreur dans la commande version:', error);
      message.reply(t('common.error'));
    }
  },
};
