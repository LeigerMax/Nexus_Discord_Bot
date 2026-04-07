/**
 * @file Setup Ticket Command
 * @description Configure le message initial du système de tickets (v1.1.0)
 * @module commands/admin/tickets
 * @requires discord.js
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'ticket-setup',
  description: 'Envoie le message initial pour le système de tickets',
  category: 'admin',
  permissions: [PermissionFlagsBits.Administrator],
  
  async execute(message, args, context) {
    const { t } = context;
    // Message descriptif (peut être personnalisé via args si besoin)
    const title = args.join(' ') || t('tickets.default_title');
    const description = t('tickets.default_desc');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎫 ${title}`)
      .setDescription(description)
      .setFooter({ text: t('tickets.embed_footer') })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel(t('tickets.btn_label'))
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✉️')
    );

    try {
      await message.channel.send({ embeds: [embed], components: [row] });
      if (message.deletable) await message.delete().catch(() => {});
    } catch (err) {
      console.error('[TICKETS] Erreur setup:', err.message);
      // On n'utilise pas message.reply ici car le message est peut-être déjà mort ou supprimé
      try {
        await message.channel.send(t('tickets.setup_error', { user: message.author }));
      } catch (sendErr) {
        // Au cas où le salon est inaccessible
      }
    }
  },
};
