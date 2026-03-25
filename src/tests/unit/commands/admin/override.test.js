/**
 * Tests unitaires pour la commande override (KING)
 */

const overrideCommand = require('../../../../commands/admin/override');

describe('Override Command (KING)', () => {
  let mockMessage;
  let mockClient;
  let mockCurseCommand;
  let mockMuteCommand;
  let mockRouletteMuteCommand;
  let cursedPlayers;
  let mutedMembers;
  let originalKingId;

  beforeEach(() => {
    // Sauvegarde et définit KING_ID
    
    originalKingId = process.env.KING_ID;
    process.env.KING_ID = '198594808430723072';
    
    // Crée les timers avant de les stocker pour pouvoir les nettoyer
    const timeout1 = setTimeout(() => {}, 30000);
    const timeout2 = setTimeout(() => {}, 60000);
    const interval1 = setInterval(() => {}, 1000);
    
    // Mock des Maps
    cursedPlayers = new Map([
      ['user1', { timeout: timeout1, curseType: 'RANDOM' }],
      ['user2', { timeout: timeout2, curseType: 'IGNORED' }],
    ]);

    mutedMembers = new Map([
      ['user3', { interval: interval1, duration: 5 }],
    ]);

    // Mock des commandes
    mockCurseCommand = {
      name: 'curse',
      cursedPlayers: cursedPlayers,
    };

    mockMuteCommand = {
      name: 'mute',
      mutedMembers: new Map(mutedMembers),
    };

    mockRouletteMuteCommand = {
      name: 'roulettemute',
      mutedMembers: new Map(),
    };

    mockClient = {
      commandHandler: {
        commands: new Map([
          ['curse', mockCurseCommand],
          ['mute', mockMuteCommand],
          ['roulettemute', mockRouletteMuteCommand],
        ])
      }
    };

    mockMessage = {
      author: {
        id: '198594808430723072', // Utilise directement l'ID du KING depuis .env
        username: 'TheKing',
      },
      guild: {
        members: {
          fetch: jest.fn().mockResolvedValue({
            voice: {
              channel: { name: 'Vocal' },
              setMute: jest.fn().mockResolvedValue(undefined),
            },
          }),
        },
      },
      mentions: {
        users: new Map(),
      },
      client: mockClient,
      reply: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(global, 'clearTimeout');
    jest.spyOn(global, 'clearInterval');
  });

  afterEach(() => {
    jest.clearAllMocks();
    
    // Nettoie tous les timers
    for (const data of cursedPlayers.values()) {
      if (data.timeout) clearTimeout(data.timeout);
    }
    for (const data of mutedMembers.values()) {
      if (data.interval) clearInterval(data.interval);
    }
    
    cursedPlayers.clear();
    mutedMembers.clear();
    // Restaure KING_ID
    process.env.KING_ID = originalKingId;
  });

  // ========================================
  // TESTS STRUCTURELS
  // ========================================

  describe('Structure de la commande', () => {
    test('devrait avoir un nom', () => {
      expect(overrideCommand.name).toBe('override');
    });

    test('devrait avoir une description', () => {
      expect(overrideCommand.description).toBeDefined();
      expect(typeof overrideCommand.description).toBe('string');
      expect(overrideCommand.description).toContain('KING');
    });

    test('devrait avoir un usage', () => {
      expect(overrideCommand.usage).toBeDefined();
      expect(typeof overrideCommand.usage).toBe('string');
    });

    test('devrait avoir une fonction execute', () => {
      expect(overrideCommand.execute).toBeDefined();
      expect(typeof overrideCommand.execute).toBe('function');
    });
  });

  // ========================================
  // TESTS DE VALIDATION
  // ========================================

  describe('Validation des permissions KING', () => {
    test('devrait refuser si l\'utilisateur n\'est pas le KING', async () => {
      mockMessage.author.id = 'not-the-king';

      await overrideCommand.execute(mockMessage, ['all', 'all']);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('ROI')
      );
    });

    test('devrait accepter si l\'utilisateur est le KING', async () => {
      await overrideCommand.execute(mockMessage, ['curse', 'all']);

      expect(mockMessage.reply).not.toHaveBeenCalledWith(
        expect.stringContaining('ROI')
      );
    });
  });

  describe('Validation des arguments', () => {
    test('devrait afficher l\'aide si aucun argument', async () => {
      await overrideCommand.execute(mockMessage, []);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('OVERRIDE')
        })
      );
    });
  });

  // ========================================
  // TESTS FONCTIONNELS - CURSE
  // ========================================

  describe('Override Curse', () => {
    test('devrait lever toutes les malédictions', async () => {
      expect(cursedPlayers.size).toBe(2);

      await overrideCommand.execute(mockMessage, ['curse', 'all']);

      expect(mockCurseCommand.cursedPlayers.size).toBe(0);
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                description: expect.stringContaining('2'),
              }),
            }),
          ]),
        })
      );
    });

    test('devrait lever la malédiction d\'un utilisateur spécifique', async () => {
      const targetUser = { id: 'user1', username: 'User1' };
      mockMessage.mentions.users = new Map([['user1', targetUser]]);

      await overrideCommand.execute(mockMessage, ['curse', '@user1']);

      expect(clearTimeout).toHaveBeenCalled();
      expect(cursedPlayers.has('user1')).toBe(false);
      expect(cursedPlayers.has('user2')).toBe(true);
    });
  });

  // ========================================
  // TESTS FONCTIONNELS - MUTE
  // ========================================

  describe('Override Mute', () => {
    test('devrait démuter tous les utilisateurs', async () => {
      await overrideCommand.execute(mockMessage, ['mute', 'all']);

      expect(clearInterval).toHaveBeenCalled();
      expect(mockMessage.guild.members.fetch).toHaveBeenCalledWith('user3');
      expect(mockMuteCommand.mutedMembers.size).toBe(0);
    });

    test('devrait démuter un utilisateur spécifique', async () => {
      const targetUser = { id: 'user3', username: 'User3' };
      mockMessage.mentions.users = new Map([['user3', targetUser]]);

      await overrideCommand.execute(mockMessage, ['mute', '@user3']);

      expect(clearInterval).toHaveBeenCalled();
      expect(mockMuteCommand.mutedMembers.has('user3')).toBe(false);
    });

    test('devrait gérer les erreurs de démute', async () => {
      mockMessage.guild.members.fetch.mockRejectedValue(new Error('Member not found'));

      await overrideCommand.execute(mockMessage, ['mute', 'all']);

      // Ne devrait pas crash
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  // ========================================
  // TESTS FONCTIONNELS - ALL
  // ========================================

  describe('Override All', () => {
    test('devrait tout annuler pour tous les utilisateurs', async () => {
      await overrideCommand.execute(mockMessage, ['all', 'all']);

      expect(clearTimeout).toHaveBeenCalled(); // Pour curse
      expect(clearInterval).toHaveBeenCalled(); // Pour mute
      expect(mockCurseCommand.cursedPlayers.size).toBe(0);
      expect(mockMuteCommand.mutedMembers.size).toBe(0);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('OVERRIDE KING'),
              }),
            }),
          ]),
        })
      );
    });

    test('devrait afficher les résultats corrects', async () => {
      await overrideCommand.execute(mockMessage, ['all', 'all']);

      const embedCall = mockMessage.reply.mock.calls[0][0];
      const description = embedCall.embeds[0].data.description;

      expect(description).toContain('Malédictions levées: **2**');
      expect(description).toContain('Mutes arrêtés: **1**');
    });
  });

  // ========================================
  // TESTS DE GESTION D'ERREURS
  // ========================================

  describe('Gestion des erreurs', () => {
    test('devrait gérer les erreurs générales', async () => {
      // Force une erreur en faisant échouer la récupération d'un membre
      mockMessage.guild.members.fetch.mockRejectedValue(new Error('Database error'));
      
      // Ajoute un utilisateur dans mutedMembers pour déclencher le fetch
      mockMuteCommand.mutedMembers.set('user3', { 
        interval: setInterval(() => {}, 1000), 
        duration: 5 
      });

      await overrideCommand.execute(mockMessage, ['mute', 'all']);

      // La commande devrait quand même répondre (pas de crash)
      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test('devrait continuer même si une commande n\'est pas disponible', async () => {
      mockClient.commands = new Map([
        ['curse', mockCurseCommand],
      ]);

      await overrideCommand.execute(mockMessage, ['all', 'all']);

      // Ne devrait pas crash
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });
});
