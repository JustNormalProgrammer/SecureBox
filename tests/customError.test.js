const CustomError = require('../utils/customError');

describe('CustomError', () => {
  beforeEach(() => {
    jest.spyOn(Error, 'captureStackTrace').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('powinien utworzyć błąd z domyślnym komunikatem i kodem statusu', () => {
    const error = new CustomError();
    expect(error.message).toBe('Something went wrong');
    expect(error.statusCode).toBe(500);
    expect(error).toBeInstanceOf(CustomError);
    expect(error).toBeInstanceOf(Error);
    expect(Error.captureStackTrace).toHaveBeenCalledWith(error, CustomError);
  });

  it('powinien utworzyć błąd z niestandardowym komunikatem i domyślnym kodem statusu', () => {
    const error = new CustomError('Błąd niestandardowy');
    expect(error.message).toBe('Błąd niestandardowy');
    expect(error.statusCode).toBe(500);
    expect(error).toBeInstanceOf(CustomError);
    expect(error).toBeInstanceOf(Error);
    expect(Error.captureStackTrace).toHaveBeenCalledWith(error, CustomError);
  });

  it('powinien utworzyć błąd z niestandardowym komunikatem i kodem statusu', () => {
    const error = new CustomError('Błąd niestandardowy', 400);
    expect(error.message).toBe('Błąd niestandardowy');
    expect(error.statusCode).toBe(400);
    expect(error).toBeInstanceOf(CustomError);
    expect(error).toBeInstanceOf(Error);
    expect(Error.captureStackTrace).toHaveBeenCalledWith(error, CustomError);
  });

  it('powinien mieć poprawną nazwę błędu', () => {
    const error = new CustomError('Błąd niestandardowy', 400);
    expect(error.name).toBe('Error');
  });
});