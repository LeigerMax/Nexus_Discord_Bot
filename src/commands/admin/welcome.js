/**
 * @file Welcome Command
 * @description Gère le système de bienvenue avec messages aléatoires pour les nouveaux membres
 * @module commands/admin/welcome
 * @category Admin
 * @requires discord.js
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const i18n = require('../../services/i18nService');

module.exports = {
    name: 'welcome',
    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Gérer le système de bienvenue')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Tester un message de bienvenue')
        ),
    
    async execute(messageOrInteraction, args, context) {
        const { t } = context;
        // Détecte s'il s'agit d'une interaction ou d'un message (v1.1.0)
        const isInteraction = typeof messageOrInteraction.reply !== 'function' ? false : (messageOrInteraction.isChatInputCommand ? messageOrInteraction.isChatInputCommand() : false);
        const user = isInteraction ? messageOrInteraction.user : messageOrInteraction.author;

        if (isInteraction) {
            if (messageOrInteraction.options.getSubcommand() === 'test') {
                const welcomeMessage = getRandomWelcomeMessage(user, t);
                await messageOrInteraction.reply({ content: welcomeMessage, ephemeral: true });
            }
        } else {
            // Commande préfixée
            const welcomeMessage = getRandomWelcomeMessage(user, t);
            await messageOrInteraction.reply(welcomeMessage);
        }
    },
};

/**
 * Fonction pour obtenir un message de bienvenue aléatoire
 * @param {*} member 
 * @param {Function} t - Fonction de traduction
 * @returns {string}
 */
function getRandomWelcomeMessage(member, t) {
    // Si t n'est pas fourni (cas de l'event guildMemberAdd), on le crée
    if (!t) {
        const locale = i18n.getGuildLocale(member.guild?.id);
        t = (key, params) => i18n.t(key, locale, params);
    }

    const messages = t('welcome.messages');
    const randomTemplate = messages[Math.floor(Math.random() * messages.length)];
    
    return randomTemplate.replace('{user}', member.toString());
}

exports.getRandomWelcomeMessage = getRandomWelcomeMessage;
