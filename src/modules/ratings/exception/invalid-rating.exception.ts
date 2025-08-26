import { RatingException } from "./rating.exception";

export class InvalidRatingException extends RatingException {
  constructor(rating: number) {
    super(`Invalid rating value: ${rating}. Must be between 1-5`);
    this.name = 'InvalidRatingException';
  }
}