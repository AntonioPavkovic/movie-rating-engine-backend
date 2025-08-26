export class RatingException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RatingException';
  }
}