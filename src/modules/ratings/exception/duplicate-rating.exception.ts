import { RatingException } from "./rating.exception";

export class DuplicateRatingException extends RatingException {
  constructor(movieId: string) {
    super(`Rating already exists for movie ${movieId}`);
    this.name = 'DuplicateRatingException';
  }
}