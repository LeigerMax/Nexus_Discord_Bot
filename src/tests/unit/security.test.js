const YoutubeService = require('../../services/youtubeService');
const axios = require('axios');

jest.mock('axios');

describe('Security: YoutubeService SSRF Protection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should allow valid YouTube Channel IDs', async () => {
        const id = 'UC1234567890123456789012';
        const result = await YoutubeService.resolveChannelId(id);
        expect(result).toBe(id);
        expect(axios.get).not.toHaveBeenCalled();
    });

    test('should allow valid YouTube handles', async () => {
        const id = 'UC1234567890123456789012';
        axios.get.mockResolvedValue({ data: `"browse_id":"${id}"` });
        const result = await YoutubeService.resolveChannelId('@handle');
        expect(axios.get).toHaveBeenCalledWith('https://www.youtube.com/@handle', expect.any(Object));
        expect(result).toBe(id);
    });

    test('should allow valid YouTube URLs', async () => {
        axios.get.mockResolvedValue({ data: '"browse_id":"UCvalid_id_here_123456"' });
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        await YoutubeService.resolveChannelId(url);
        expect(axios.get).toHaveBeenCalledWith(url, expect.any(Object));
    });

    test('should block non-YouTube domains (SSRF protection)', async () => {
        const maliciousUrl = 'http://169.254.169.254/latest/meta-data/';
        const result = await YoutubeService.resolveChannelId(maliciousUrl);
        expect(result).toBeNull();
        expect(axios.get).not.toHaveBeenCalled();
    });

    test('should block localhost (SSRF protection)', async () => {
        const maliciousUrl = 'http://localhost:3000/api/config';
        const result = await YoutubeService.resolveChannelId(maliciousUrl);
        expect(result).toBeNull();
        expect(axios.get).not.toHaveBeenCalled();
    });
});
