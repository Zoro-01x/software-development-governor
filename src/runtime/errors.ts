export class RuntimeIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeIntegrityError';
  }
}
