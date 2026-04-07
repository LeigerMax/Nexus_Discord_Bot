/**
 * @file Tests unitaires pour la commande showdeleted
 */

const showdeletedCommand = require('../../../../commands/admin/showdeleted');
const { createMockContext } = require('../../../testUtils');

describe('ShowDeleted Command', () => {
  let mockMessage;
  let mockClient;
  let mockEventHandler;
  let mockContext;

  beforeEach(() => {
    mockEventHandler = {
      getDeletedMessages: jest.fn(() => []),
    };

    mockClient = {
      eventHandlers: new Map([
        ['messageDelete', mockEventHandler],
      ]),
    };

    mockMessage = {
      author: { id: '123456789', username: 'AdminUser' },
      member: {
        permissions: {
          has: jest.fn(() => true),
        },
      },
      mentions: {
        users: new Map(),
      },
      client: mockClient,
      reply: jest.fn().mockResolvedValue(undefined),
    };

    mockContext = createMockContext({
      t: (key) => key
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('devrait refuser si l\'utilisateur n\'a pas la permission ManageMessages', async () => {
    mockMessage.member.permissions.has = jest.fn(() => false);

    await showdeletedCommand.execute(mockMessage, [], mockContext);

    expect(mockMessage.reply).toHaveBeenCalledWith('showdeleted.no_permission');
  });

  test('devrait refuser si le système de tracking n\'est pas disponible', async () => {
    mockClient.eventHandlers = undefined;

    await showdeletedCommand.execute(mockMessage, [], mockContext);

    expect(mockMessage.reply).toHaveBeenCalledWith('showdeleted.unavailable');
  });

  test('devrait afficher un message si aucun message supprimé', async () => {
    mockEventHandler.getDeletedMessages.mockReturnValue([]);

    await showdeletedCommand.execute(mockMessage, [], mockContext);

    expect(mockMessage.reply).toHaveBeenCalledWith('showdeleted.none_found');
  });

  test('devrait appeler getDeletedMessages si tout est valide', async () => {
    mockEventHandler.getDeletedMessages.mockReturnValue([{
        author: { username: 'User1' },
        content: 'Test',
        channel: { name: 'gen' },
        deletedAt: new Date(),
        attachments: []
    }]);

    await showdeletedCommand.execute(mockMessage, ['5'], mockContext);

    expect(mockEventHandler.getDeletedMessages).toHaveBeenCalledWith(5, undefined);
    expect(mockMessage.reply).toHaveBeenCalled();
  });
});
