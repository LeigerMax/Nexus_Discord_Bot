/**
 * @file Tests unitaires pour la commande mute (admin)
 */

process.env.ACTIVITY_SALON_ID = 'activity-789';
process.env.LOOSER_ID = 'looser-123';

const storageService = require('../../../../services/storageService');
jest.mock('../../../../services/storageService');

const muteCommand = require('../../../../commands/admin/mute');
const { createMockContext } = require('../../../testUtils');

describe('Mute Command', () => {
  let mockMessage;
  let mockMentionedMember;
  let mockGuild;
  let mockChannel;
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storageService.get.mockReturnValue(null); // Default config

    mockChannel = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    mockMentionedMember = {
      id: '987654321',
      user: { username: 'TargetUser' },
      voice: {
        channel: { name: 'Vocal 1' },
        setMute: jest.fn().mockResolvedValue(undefined),
        serverMute: false,
      },
    };

    mockGuild = {
      members: {
        fetch: jest.fn().mockResolvedValue(mockMentionedMember),
      },
      id: 'guild-123'
    };

    mockMessage = {
      author: { 
        username: 'AdminUser',
        id: '123456789'
      },
      mentions: {
        members: {
          first: jest.fn(() => mockMentionedMember),
        },
      },
      guild: mockGuild,
      channel: mockChannel,
      reply: jest.fn().mockResolvedValue(undefined),
    };

    mockContext = createMockContext({
      t: (key) => key
    });

    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('devrait avoir les propriétés requises', () => {
    expect(muteCommand).toHaveProperty('name');
    expect(muteCommand.name).toBe('mute');
  });

  test('devrait refuser si aucune mention', async () => {
    mockMessage.mentions.members.first = jest.fn(() => null);

    await muteCommand.execute(mockMessage, [], mockContext);

    expect(mockMessage.reply).toHaveBeenCalled();
    const replyCall = mockMessage.reply.mock.calls[0][0];
    const content = typeof replyCall === 'string' ? replyCall : replyCall.content;
    expect(content).toContain('mute.no_mention');
  });

  test('devrait refuser si durée invalide', async () => {
    await muteCommand.execute(mockMessage, ['@user', 'invalid'], mockContext);

    expect(mockMessage.reply).toHaveBeenCalled();
    const replyCall = mockMessage.reply.mock.calls[0][0];
    const content = typeof replyCall === 'string' ? replyCall : replyCall.content;
    expect(content).toContain('mute.no_duration');
  });

  test('devrait refuser si utilisateur pas en vocal', async () => {
    mockMentionedMember.voice.channel = null;

    await muteCommand.execute(mockMessage, ['@user', '5'], mockContext);

    expect(mockMessage.reply).toHaveBeenCalled();
    const replyCall = mockMessage.reply.mock.calls[0][0];
    const content = typeof replyCall === 'string' ? replyCall : replyCall.content;
    expect(content).toContain('mute.not_in_voice');
  });

  test('devrait envoyer l\'embed de pré-mute si tout est valide', async () => {
    const executePromise = muteCommand.execute(mockMessage, ['@user', '5'], mockContext);
    
    // Give the async execute function time to reach the setTimeout
    await Promise.resolve(); // Resolves current part of execute
    await Promise.resolve(); // Resolves the fetch
    await Promise.resolve(); // Resolves the setMute
    
    // Advance timers to trigger the setTimeout(..., 1000) inside execute
    jest.advanceTimersByTime(1000);
    
    // Flush microtasks to allow the promise to continue after the timer
    await Promise.resolve();
    
    await executePromise;

    expect(mockMessage.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({
              title: expect.stringContaining('mute.pre_embed_title')
            })
          })
        ])
      })
    );
  });
});
