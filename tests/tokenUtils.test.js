const crypto = require('crypto');
const { generateResetToken } = require('../utils/tokenUtils');

describe('generateResetToken', () => {
  beforeEach(() => {
    jest.spyOn(crypto, 'randomBytes').mockImplementation(() => Buffer.from('a'.repeat(32)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('powinien zwrócić ciąg znaków', () => {
    const token = generateResetToken();
    expect(typeof token).toBe('string');
  });

  it('powinien zwrócić token o długości 64 znaków', () => {
    const token = generateResetToken();
    expect(token.length).toBe(64);
  });

  it('powinien zwrócić token zawierający tylko znaki heksadecymalne', () => {
    const token = generateResetToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/i);
  });

  it('powinien generować unikalne tokeny przy wielokrotnych wywołaniach', () => {
    crypto.randomBytes
      .mockImplementationOnce(() => Buffer.from('a'.repeat(32)))
      .mockImplementationOnce(() => Buffer.from('b'.repeat(32)));
    const token1 = generateResetToken();
    const token2 = generateResetToken();
    expect(token1).not.toBe(token2);
  });

  it('powinien użyć crypto.randomBytes z poprawnym rozmiarem', () => {
    generateResetToken();
    expect(crypto.randomBytes).toHaveBeenCalledWith(32);
  });
});