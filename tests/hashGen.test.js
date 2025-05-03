const crypto = require('crypto');
const { getHash } = require('../utils/hashGen');

describe('getHash', () => {
  beforeEach(() => {
    jest.spyOn(crypto, 'createHash').mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('a'.repeat(64)),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('powinien zwrócić ciąg znaków', async () => {
    const result = await getHash('test');
    expect(typeof result).toBe('string');
  });

  it('powinien zwrócić ciąg o długości 12 znaków', async () => {
    const result = await getHash('test');
    expect(result.length).toBe(12);
  });

  it('powinien zwrócić ciąg zawierający tylko znaki heksadecymalne i .txt', async () => {
    const result = await getHash('test');
    expect(result).toMatch(/^[0-9a-f]{8}\.txt$/i);
  });

  it('powinien zwrócić poprawny hash dla znanego wejścia', async () => {
    crypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('1234567890abcdef'.repeat(4)),
    });
    const result = await getHash('password');
    expect(result).toBe('12345678.txt');
  });

  it('powinien użyć crypto.createHash z sha256', async () => {
    await getHash('test');
    expect(crypto.createHash).toHaveBeenCalledWith('sha256');
  });
});