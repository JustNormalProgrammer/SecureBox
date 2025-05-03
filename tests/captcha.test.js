const { validateRecaptcha } = require('../utils/captcha');

global.fetch = jest.fn();

const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('validateRecaptcha', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CAPTCHA_SECRET = 'test-secret-key';
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it('powinien zwrócić true gdy walidacja reCAPTCHA zakończy się sukcesem z wynikiem > 0.5', async () => {
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        score: 0.9,
      }),
    });

    const result = await validateRecaptcha('valid-token');

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify?secret=test-secret-key&response=valid-token',
      { method: 'POST' }
    );
  });

  it('powinien zwrócić false gdy wynik reCAPTCHA jest <= 0.5', async () => {
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        score: 0.3,
      }),
    });

    const result = await validateRecaptcha('valid-token');

    expect(result).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify?secret=test-secret-key&response=valid-token',
      { method: 'POST' }
    );
  });

  it('powinien zwrócić false gdy walidacja reCAPTCHA nie powiedzie się', async () => {
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: false,
        score: 0.9,
      }),
    });

    const result = await validateRecaptcha('invalid-token');

    expect(result).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify?secret=test-secret-key&response=invalid-token',
      { method: 'POST' }
    );
  });

  it('powinien zwrócić false i zalogować błąd gdy fetch zgłosi błąd', async () => {
    const error = new Error('Network error');
    fetch.mockRejectedValue(error);

    const result = await validateRecaptcha('valid-token');

    expect(result).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      'https://www.google.com/recaptcha/api/siteverify?secret=test-secret-key&response=valid-token',
      { method: 'POST' }
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith('Błąd walidacji reCAPTCHA:', error);
  });

  it('powinien obsłużyć brak CAPTCHA_SECRET i zwrócić false', async () => {
    delete process.env.CAPTCHA_SECRET;

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        success: true,
        score: 0.9,
      }),
    });

    const result = await validateRecaptcha('valid-token');

    expect(result).toBe(false);
    
  });
});