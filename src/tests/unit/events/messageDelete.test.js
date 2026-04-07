/**
 * @file Tests unitaires pour l'event messageDelete
 */

const messageDeleteModule = require('../../../events/messageDelete');

describe('MessageDelete Event', () => {
  let mockClient;
  let messageDeleteHandler;
  let mockMessage;

  beforeEach(() => {
    jest.resetModules();
    
    mockClient = {
      eventHandlers: new Map(),
      on: jest.fn((event, handler) => {
          if (event === 'messageDelete') messageDeleteHandler = handler;
      }),
    };

    messageDeleteModule(mockClient);

    mockMessage = {
      id: 'msg123',
      author: {
        id: 'user123',
        username: 'TestUser',
        bot: false,
        displayAvatarURL: jest.fn(() => 'url')
      },
      content: 'Test content',
      attachments: new Map(),
      channel: { id: 'ch1', name: 'gen' },
      guild: { id: 'guild1', name: 'Server' },
      createdAt: new Date(),
    };

    // Clean history between tests
    const handler = mockClient.eventHandlers.get('messageDelete');
    if (handler) handler.clearHistory();
  });

  test('devrait stocker un message supprimé dans eventHandlers', async () => {
    await messageDeleteHandler(mockMessage);

    const handler = mockClient.eventHandlers.get('messageDelete');
    const messages = handler.getDeletedMessages(1);
    
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('Test content');
  });

  test('devrait ignorer les messages des bots', async () => {
    mockMessage.author.bot = true;
    await messageDeleteHandler(mockMessage);

    const handler = mockClient.eventHandlers.get('messageDelete');
    expect(handler.getDeletedMessages(1)).toHaveLength(0);
  });
});
