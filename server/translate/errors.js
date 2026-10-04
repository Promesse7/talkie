export class TranslateError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'TranslateError';
    this.status = status;
  }
}
