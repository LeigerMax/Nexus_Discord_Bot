/**
 * @file Interaction Create Event
 * @description Gère les interactions (boutons, sélecteurs, etc.) pour le système de tickets (v1.1.0)
 * @module events/interactionCreate
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const storageService = require('../services/storageService');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton()) {
        const customId = interaction.customId;
        
        // 1. Bouton : Ouvrir un ticket
        if (customId === 'create_ticket') {
          await handleCreateTicket(interaction);
        }
        
        // 2. Bouton : Fermer un ticket
        if (customId === 'close_ticket') {
          await handleCloseTicket(interaction);
        }
      }
    } catch (error) {
      console.error('Erreur dans l\'event interactionCreate:', error);
    }
  });
};

/**
 * Logique de création de ticket
 */
async function handleCreateTicket(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;
  const config = storageService.get(guild.id);

  if (!config || !config.tickets || !config.tickets.enabled) {
    return interaction.reply({ content: '❌ Le système de tickets est désactivé.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const { categoryId, staffRoleIds } = config.tickets;

  try {
    // Création du salon privé
    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id, // Auteur
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
      }
    ];

    // Ajout des rôles staff
    if (staffRoleIds && staffRoleIds.length > 0) {
      staffRoleIds.forEach(roleId => {
        permissionOverwrites.push({
          id: roleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
        });
      });
    }

    const ticketChannel = await guild.channels.create({
      name: `🎫-ticket-${member.user.username}`,
      type: ChannelType.GuildText,
      parent: categoryId,
      permissionOverwrites
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Nouveau Ticket Support')
      .setDescription(`Bonjour ${member}, bienvenue dans votre ticket.\nExpliquez votre demande ici et un membre de l'équipe vous répondra sous peu.`)
      .setFooter({ text: 'Seul le staff peut fermer ce ticket.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await ticketChannel.send({ embeds: [embed], components: [row] });
    
    await interaction.editReply({ content: `✅ Ticket créé ! Rendez-vous ici : ${ticketChannel}` });
  } catch (err) {
    console.error('[TICKETS] Erreur création:', err.message);
    await interaction.editReply({ content: '❌ Erreur lors de la création du ticket.' });
  }
}

/**
 * Logique de fermeture de ticket
 */
async function handleCloseTicket(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;
  const config = storageService.get(guild.id);
  const staffRoleIds = config?.tickets?.staffRoleIds || [];

  // Vérification des permissions (Admins ou Rôles Staff)
  const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || 
                  member.roles.cache.some(r => staffRoleIds.includes(r.id));

  if (!isStaff) {
    return interaction.reply({ content: '❌ Seul le staff peut fermer ce ticket.', ephemeral: true });
  }

  await interaction.reply({ content: '🔒 Fermeture du ticket dans 5 secondes...' });

  setTimeout(async () => {
    try {
      await interaction.channel.delete();
    } catch (err) {
      // Déjà supprimé
    }
  }, 5000);
}
