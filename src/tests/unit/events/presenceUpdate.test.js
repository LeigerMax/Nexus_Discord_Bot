/**
 * Tests unitaires pour l'événement presenceUpdate
 * Teste les notifications de changement de statut
 */

// Mock de l'environnement
process.env.LOOSER_ID = 'looser-123';
process.env.ACTIVITY_SALON_ID = 'activity-456';

const storageService = require('../../../services/storageService');
jest.mock('../../../services/storageService');

describe('Event: presenceUpdate', () => {
  let mockClient;
  let presenceUpdateHandler;
  let mockOldPresence;
  let mockNewPresence;
  let mockChannel;
  let mockMember;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storageService.get.mockReturnValue(null); // Default config
    mockMember = {
      user: {
        id: 'looser-123',
        username: 'Miguel',
        displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png')
      }
    };

    mockChannel = {
      send: jest.fn().mockResolvedValue({})
    };

    mockNewPresence = {
      userId: 'looser-123',
      status: 'online',
      guild: {
        channels: {
          cache: new Map([['activity-456', mockChannel]])
        },
        members: {
          fetch: jest.fn().mockResolvedValue(mockMember)
        }
      }
    };

    mockOldPresence = {
      status: 'offline'
    };

    mockClient = {
      on: jest.fn((event, handler) => {
        if (event === 'presenceUpdate') {
          presenceUpdateHandler = handler;
        }
      })
    };

    // Require du module
    const presenceUpdateModule = require('../../../events/presenceUpdate.js');
    presenceUpdateModule(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Structure de l\'événement', () => {
    test('doit enregistrer un listener sur presenceUpdate', () => {
      expect(mockClient.on).toHaveBeenCalledWith('presenceUpdate', expect.any(Function));
    });
  });

  describe('Filtrage des utilisateurs', () => {
    test('doit ignorer les utilisateurs autres que LOOSER_ID', async () => {
      mockNewPresence.userId = 'other-user';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    test('doit traiter l\'utilisateur LOOSER_ID', async () => {
      mockNewPresence.userId = 'looser-123';
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'online';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockNewPresence.guild.members.fetch).toHaveBeenCalledWith('looser-123');
    });

    test('doit ne rien faire si channel introuvable', async () => {
      mockNewPresence.guild.channels.cache.clear();

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockNewPresence.guild.members.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Connexion (offline → online)', () => {
    test('doit envoyer un message quand l\'utilisateur se connecte', async () => {
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'online';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).toHaveBeenCalled();
      const sendCall = mockChannel.send.mock.calls[0][0];
      expect(sendCall).toHaveProperty('embeds');
      expect(sendCall.embeds[0].data.title).toContain('en ligne');
    });

    test('doit détecter offline → idle comme connexion', async () => {
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'idle';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).toHaveBeenCalled();
    });

    test('doit détecter offline → dnd comme connexion', async () => {
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'dnd';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).toHaveBeenCalled();
    });

    test('doit inclure le nom d\'utilisateur dans l\'embed', async () => {
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'online';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      const sendCall = mockChannel.send.mock.calls[0][0];
      expect(sendCall.embeds[0].data.description).toContain('Miguel');
    });
  });

  describe('Déconnexion (online → offline)', () => {
    test('doit envoyer un message quand l\'utilisateur se déconnecte', async () => {
      mockOldPresence.status = 'online';
      mockNewPresence.status = 'offline';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).toHaveBeenCalled();
      const sendCall = mockChannel.send.mock.calls[0][0];
      expect(sendCall.embeds[0].data.title).toContain('déconnecté');
    });

    test('doit détecter idle → offline comme déconnexion', async () => {
      mockOldPresence.status = 'idle';
      mockNewPresence.status = 'offline';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).toHaveBeenCalled();
    });

    test('doit détecter dnd → offline comme déconnexion', async () => {
      mockOldPresence.status = 'dnd';
      mockNewPresence.status = 'offline';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).toHaveBeenCalled();
    });
  });

  describe('Changements de statut non pertinents', () => {
    test('ne doit pas envoyer pour offline → offline', async () => {
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'offline';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).not.toHaveBeenCalled();
    });
  });

  describe('Gestion oldPresence null', () => {
    test('doit traiter oldPresence null comme offline', async () => {
      mockOldPresence = null;
      mockNewPresence.status = 'online';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockChannel.send).toHaveBeenCalled();
    });
  });

  describe('Gestion des erreurs', () => {
    test('doit gérer les erreurs de fetch member', async () => {
      mockNewPresence.guild.members.fetch.mockRejectedValue(new Error('Member not found'));
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'online';

      // Ne doit pas crash
      await expect(presenceUpdateHandler(mockOldPresence, mockNewPresence)).resolves.not.toThrow();
      
      expect(mockChannel.send).not.toHaveBeenCalled();
    });

    test('doit gérer les erreurs d\'envoi', async () => {
      mockChannel.send.mockRejectedValue(new Error('Cannot send'));
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'online';

      // Ne doit pas crash
      await expect(presenceUpdateHandler(mockOldPresence, mockNewPresence)).resolves.not.toThrow();
    });
  });

  describe('Contenu des embeds', () => {
    test('embed de connexion doit avoir une couleur dorée', async () => {
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'online';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      const sendCall = mockChannel.send.mock.calls[0][0];
      expect(sendCall.embeds[0].data.color).toBe(0xFFD700);
    });

    test('embed de déconnexion doit avoir une couleur sombre', async () => {
      mockOldPresence.status = 'online';
      mockNewPresence.status = 'offline';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      const sendCall = mockChannel.send.mock.calls[0][0];
      expect(sendCall.embeds[0].data.color).toBe(0x000000);
    });

    test('doit inclure un thumbnail avec l\'avatar', async () => {
      mockOldPresence.status = 'offline';
      mockNewPresence.status = 'online';

      await presenceUpdateHandler(mockOldPresence, mockNewPresence);

      expect(mockMember.user.displayAvatarURL).toHaveBeenCalledWith({
        dynamic: true,
        size: 256
      });
    });
  });
});
