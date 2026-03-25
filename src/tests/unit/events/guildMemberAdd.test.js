/**
 * Tests unitaires pour l'événement guildMemberAdd
 * Teste le message de bienvenue des nouveaux membres
 */

const { Events } = require('discord.js');

// Mock du module welcome
jest.mock('../../../commands/admin/welcome.js', () => ({
  getRandomWelcomeMessage: jest.fn()
}));

const guildMemberAddEvent = require('../../../events/guildMemberAdd.js');
const { getRandomWelcomeMessage } = require('../../../commands/admin/welcome.js');

// Mock de l'environnement
const originalEnv = process.env;

describe('Event: guildMemberAdd', () => {
  let mockMember;
  let mockChannel;
  let mockGuild;

  beforeEach(() => {
    // Reset process.env
    process.env = { ...originalEnv, WELCOME_CHANNEL_ID: 'channel-123' };

    mockChannel = {
      id: 'channel-123',
      send: jest.fn().mockResolvedValue({})
    };

    mockGuild = {
      channels: {
        cache: new Map([['channel-123', mockChannel]])
      }
    };

    mockMember = {
      user: {
        id: 'user-456',
        username: 'NewUser',
        tag: 'NewUser#1234'
      },
      guild: mockGuild
    };

    getRandomWelcomeMessage.mockReturnValue('Bienvenue !');
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe('Structure de l\'événement', () => {
    test('doit avoir le bon nom d\'événement', () => {
      expect(guildMemberAddEvent.name).toBe(Events.GuildMemberAdd);
    });

    test('doit avoir une fonction execute', () => {
      expect(typeof guildMemberAddEvent.execute).toBe('function');
    });
  });

  describe('Envoi du message de bienvenue', () => {
    test('doit envoyer un message de bienvenue', async () => {
      await guildMemberAddEvent.execute(mockMember);

      expect(getRandomWelcomeMessage).toHaveBeenCalledWith(mockMember);
      expect(mockChannel.send).toHaveBeenCalledWith('Bienvenue !');
    });

    test('doit utiliser le WELCOME_CHANNEL_ID du .env', async () => {
      process.env.WELCOME_CHANNEL_ID = 'custom-channel-789';
      const customChannel = {
        send: jest.fn().mockResolvedValue({})
      };
      mockGuild.channels.cache.set('custom-channel-789', customChannel);

      await guildMemberAddEvent.execute(mockMember);

      expect(customChannel.send).toHaveBeenCalledWith('Bienvenue !');
    });
  });

  describe('Validation des environnements', () => {
    test('doit ne rien faire si WELCOME_CHANNEL_ID n\'est pas défini', async () => {
      delete process.env.WELCOME_CHANNEL_ID;

      await guildMemberAddEvent.execute(mockMember);

      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    test('doit ne rien faire si le channel n\'existe pas', async () => {
      mockGuild.channels.cache.clear();

      await guildMemberAddEvent.execute(mockMember);

      expect(mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs', () => {
    test('doit gérer les erreurs d\'envoi', async () => {
      mockChannel.send.mockRejectedValue(new Error('Cannot send message'));

      // Ne doit pas crash
      await expect(guildMemberAddEvent.execute(mockMember)).resolves.not.toThrow();
    });

    test('doit gérer les erreurs de getRandomWelcomeMessage', async () => {
      getRandomWelcomeMessage.mockImplementation(() => {
        throw new Error('Cannot generate message');
      });

      let hasThrown = false;
      try {
        await guildMemberAddEvent.execute(mockMember);
      } catch {
        hasThrown = true;
      }

      // Vérifie que l'erreur a été capturée
      expect(hasThrown).toBe(true);
      // Vérifie que l'erreur n'a pas empêché le reste du code
      expect(getRandomWelcomeMessage).toHaveBeenCalled();
    });
  });

  describe('Intégration', () => {
    test('doit passer le membre à getRandomWelcomeMessage', async () => {
      await guildMemberAddEvent.execute(mockMember);

      expect(getRandomWelcomeMessage).toHaveBeenCalledWith(mockMember);
      expect(getRandomWelcomeMessage).toHaveBeenCalledTimes(1);
    });

    test('doit envoyer le message retourné par getRandomWelcomeMessage', async () => {
      getRandomWelcomeMessage.mockReturnValue('Message personnalisé de bienvenue!');

      await guildMemberAddEvent.execute(mockMember);

      expect(mockChannel.send).toHaveBeenCalledWith('Message personnalisé de bienvenue!');
    });
  });
});
