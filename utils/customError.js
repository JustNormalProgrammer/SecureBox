/**
 * Niestandardowa klasa błędu do obsługi wyjątków w spójny sposób.
 *
 * @class CustomError
 * @author Jakub Załuska
 * @extends Error
 */
class CustomError extends Error {
    /**
   * Tworzy nowy obiekt błędu.
   * @param {string} [message="Something went wrong"] - Komunikat błędu.
   * @param {number} [statusCode=500] - Kod statusu HTTP.
   */
  constructor(message = "Something went wrong", statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = CustomError;
