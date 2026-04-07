/**
 * @file Tests pour cursedMessages.js
 * @description Tests unitaires pour le système de messages maudits
 */
const { mockI18n } = require('../../testUtils');
jest.mock('../../../services/i18nService', () => mockI18n);

describe('Event: cursedMessages', () => {
  let mockClient, mockMessage, mockChannel, mockCommandHandler, mockCurseCommand, mockGuild;
  let messageCreateHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    mockChannel = {
      send: jest.fn().mockResolvedValue({ id: 'sent-123' }),
      id: 'channel-123'
    };

    mockCurseCommand = {
      isCursed: jest.fn().mockReturnValue(false),
      getCurseType: jest.fn().mockReturnValue(null),
      cursedPlayers: new Map()
    };

    mockCommandHandler = {
      commands: new Map([
        ['curse', mockCurseCommand]
      ])
    };

    mockGuild = {
      id: 'guild-123',
      name: 'Test Guild',
      members: {
        fetch: jest.fn().mockResolvedValue({
          id: 'user-123',
          voice: { channel: { name: 'Vocal' }, setMute: jest.fn().mockResolvedValue(true) }
        })
      }
    };

    mockMessage = {
      author: {
        id: 'user-123',
        username: 'TestUser',
        bot: false
      },
      content: 'test message',
      channel: mockChannel,
      guild: mockGuild,
      delete: jest.fn().mockResolvedValue({})
    };

    mockClient = {
      on: jest.fn((event, handler) => {
        if (event === 'messageCreate') {
          messageCreateHandler = handler;
        }
      }),
      commandHandler: mockCommandHandler
    };

    const cursedMessagesModule = require('../../../events/cursedMessages.js');
    cursedMessagesModule(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MESSAGE_SCRAMBLER', () => {
    beforeEach(() => {
      mockCurseCommand.isCursed.mockReturnValue(true);
      mockCurseCommand.getCurseType.mockReturnValue('MESSAGE_SCRAMBLER');
      mockMessage.content = 'hello world test';
    });

    test('doit mélanger l\'ordre des mots', async () => {
      await messageCreateHandler(mockMessage);

      expect(mockMessage.delete).toHaveBeenCalled();
      expect(mockChannel.send).toHaveBeenCalled();
      
      const sentMessage = mockChannel.send.mock.calls[0][0];
      expect(sentMessage).toContain('events.cursed_messages.said');
      expect(sentMessage).toContain('TestUser');
    });
  });

  describe('CHALLENGE', () => {
    beforeEach(() => {
      mockCurseCommand.isCursed.mockReturnValue(true);
      mockCurseCommand.getCurseType.mockReturnValue('CHALLENGE');
      mockCurseCommand.cursedPlayers.set('user-123', {
        challengePhrase: 'ma phrase de test',
        startTime: Date.now() - 5000, 
        endTime: Date.now() + 60000,
        expiresAt: Date.now() + 60000
      });
    });

    test('doit valider le challenge', async () => {
       mockMessage.content = 'ma phrase de test';

       await messageCreateHandler(mockMessage);

       expect(mockChannel.send).toHaveBeenCalled();
    });
  });

  describe('MESSAGE_OPPOSER', () => {
    beforeEach(() => {
      mockCurseCommand.isCursed.mockReturnValue(true);
      mockCurseCommand.getCurseType.mockReturnValue('MESSAGE_OPPOSER');
    });

    test('doit altérer le message', async () => {
      mockMessage.content = 'je vais bien';

      await messageCreateHandler(mockMessage);

      expect(mockMessage.delete).toHaveBeenCalled();
      const sentMessage = mockChannel.send.mock.calls[0][0];
      expect(sentMessage).toContain('events.cursed_messages.said');
      expect(sentMessage).toContain('mal');
    });
  });
});
