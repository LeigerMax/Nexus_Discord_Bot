/**
 * Tests unitaires pour la commande clear
 */

const clearCommand = require('../../../../commands/admin/clear');
const { createMockContext } = require('../../../testUtils');

describe('Clear Command', () => {
  let mockMessage;
  let mockChannel;
  let mockMember;
  let mockContext;

  beforeEach(() => {
    mockChannel = {
      name: 'general',
      messages: {
        fetch: jest.fn(),
      },
      bulkDelete: jest.fn(),
      send: jest.fn().mockResolvedValue({
        delete: jest.fn().mockResolvedValue(undefined),
      }),
    };

    mockMember = {
      permissions: {
        has: jest.fn(() => true),
      },
    };

    mockMessage = {
      author: {
        id: '123456789',
        username: 'AdminUser',
      },
      member: mockMember,
      channel: mockChannel,
      mentions: {
        users: new Map(),
      },
      reply: jest.fn().mockResolvedValue(undefined),
    };

    mockContext = createMockContext({
      message: mockMessage,
      member: mockMember,
      channel: mockChannel,
      t: (key) => key // Simplifié pour les assertions existantes
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // ========================================
  // TESTS STRUCTURELS
  // ========================================

  describe('Structure de la commande', () => {
    test('devrait avoir un nom', () => {
      expect(clearCommand.name).toBe('clear');
    });

    test('devrait avoir une description', () => {
      expect(clearCommand.description).toBeDefined();
      expect(typeof clearCommand.description).toBe('string');
    });

    test('devrait avoir un usage', () => {
      expect(clearCommand.usage).toBeDefined();
      expect(typeof clearCommand.usage).toBe('string');
    });

    test('devrait avoir une fonction execute', () => {
      expect(clearCommand.execute).toBeDefined();
      expect(typeof clearCommand.execute).toBe('function');
    });
  });

  // ========================================
  // TESTS DE VALIDATION
  // ========================================

  describe('Validation des permissions', () => {
    test('devrait refuser si l\'utilisateur n\'a pas la permission ManageMessages', async () => {
      mockMember.permissions.has = jest.fn(() => false);

      await clearCommand.execute(mockMessage, ['10'], mockContext);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('clear.no_permission')
      );
    });
  });

  describe('Validation des arguments', () => {
    test('devrait refuser si aucun nombre n\'est fourni', async () => {
      await clearCommand.execute(mockMessage, [], mockContext);
      
      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('clear.invalid_amount')
        })
      );
    });

    test('devrait refuser si le nombre est invalide', async () => {
      await clearCommand.execute(mockMessage, ['abc'], mockContext);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('clear.invalid_amount')
        })
      );
    });

    test('devrait refuser si le nombre est inférieur à 1', async () => {
      await clearCommand.execute(mockMessage, ['0'], mockContext);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('clear.invalid_amount')
        })
      );
    });

    test('devrait refuser si le nombre est supérieur à 100', async () => {
      await clearCommand.execute(mockMessage, ['150'], mockContext);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('clear.limit_error')
      );
    });
  });

  // ========================================
  // TESTS FONCTIONNELS
  // ========================================

  describe('Suppression de messages', () => {
    test('devrait supprimer le nombre correct de messages', async () => {
      const mockMessages = new Map();
      for (let i = 0; i < 11; i++) {
        mockMessages.set(`msg${i}`, {
          id: `msg${i}`,
          author: { id: 'user1' },
        });
      }
      
      // Ajoute la méthode filter pour simuler une Collection Discord
      mockMessages.filter = function(callback) {
        const filtered = new Map();
        for (const [key, value] of this.entries()) {
          if (callback(value)) {
            filtered.set(key, value);
          }
        }
        return filtered;
      };

      mockChannel.messages.fetch.mockResolvedValue(mockMessages);
      mockChannel.bulkDelete.mockResolvedValue(new Map([...mockMessages].slice(0, 10)));

      await clearCommand.execute(mockMessage, ['10'], mockContext);

      expect(mockChannel.messages.fetch).toHaveBeenCalledWith({ limit: 11 });
      expect(mockChannel.bulkDelete).toHaveBeenCalled();
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('clear.success_generic')
      );
    });

    test('devrait filtrer par utilisateur si mentionné', async () => {
      const targetUser = {
        id: 'target123',
        username: 'TargetUser',
      };

      mockMessage.mentions.users = new Map([['target123', targetUser]]);

      // Crée une Collection mockée avec filter
      const mockMessages = new Map();
      mockMessages.set('msg1', { id: 'msg1', author: { id: 'target123' } });
      mockMessages.set('msg2', { id: 'msg2', author: { id: 'other456' } });
      mockMessages.set('msg3', { id: 'msg3', author: { id: 'target123' } });
      
      // Ajoute la méthode filter aux Maps pour simuler une Collection
      mockMessages.filter = function(callback) {
        const filtered = new Map();
        for (const [key, value] of this.entries()) {
          if (callback(value)) {
            filtered.set(key, value);
          }
        }
        filtered.filter = this.filter; // Préserve la méthode pour les appels chaînés
        return filtered;
      };

      mockChannel.messages.fetch.mockResolvedValue(mockMessages);
      
      // Mock bulkDelete pour accepter n'importe quelle collection
      mockChannel.bulkDelete.mockImplementation((messages) => {
        return Promise.resolve(messages);
      });

      await clearCommand.execute(mockMessage, ['10'], mockContext);

      expect(mockChannel.bulkDelete).toHaveBeenCalled();
      expect(mockChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('clear.success_user')
      );
    });

    test('devrait supprimer le message de confirmation après 5 secondes', async () => {
      const mockMessages = new Map([
        ['msg1', { id: 'msg1', author: { id: 'user1' } }],
      ]);
      
      // Ajoute la méthode filter pour simuler une Collection Discord
      mockMessages.filter = function(callback) {
        const filtered = new Map();
        for (const [key, value] of this.entries()) {
          if (callback(value)) {
            filtered.set(key, value);
          }
        }
        return filtered;
      };

      const mockConfirmMessage = {
        delete: jest.fn().mockResolvedValue(undefined),
      };

      mockChannel.messages.fetch.mockResolvedValue(mockMessages);
      mockChannel.bulkDelete.mockResolvedValue(mockMessages);
      mockChannel.send.mockResolvedValue(mockConfirmMessage);

      await clearCommand.execute(mockMessage, ['1'], mockContext);

      expect(mockChannel.send).toHaveBeenCalled();
      
      // Avance le timer de 5 secondes
      jest.advanceTimersByTime(5000);
      await Promise.resolve();

      expect(mockConfirmMessage.delete).toHaveBeenCalled();
    });
  });

  // ========================================
  // TESTS DE GESTION D'ERREURS
  // ========================================

  describe('Gestion des erreurs', () => {
    let consoleSpy;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('devrait gérer l\'erreur des messages trop anciens (50034)', async () => {
      const error = new Error('Cannot delete messages older than 14 days');
      error.code = 50034;

      const mockMessages = new Map([['msg1', {}]]);
      mockMessages.filter = function(callback) {
        const filtered = new Map();
        for (const [key, value] of this.entries()) {
          if (callback(value)) {
            filtered.set(key, value);
          }
        }
        return filtered;
      };
      
      mockChannel.messages.fetch.mockResolvedValue(mockMessages);
      mockChannel.bulkDelete.mockRejectedValue(error);

      await clearCommand.execute(mockMessage, ['5'], mockContext);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('clear.old_messages_error')
      );
    });

    test('devrait gérer les erreurs générales', async () => {
      mockChannel.messages.fetch.mockRejectedValue(new Error('Network error'));

      await clearCommand.execute(mockMessage, ['5'], mockContext);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        expect.stringContaining('common.error')
      );
    });
  });
});
