import { Rating } from "../entites/rating.entity";
import { RatingValue } from "../value-objects/rating.value-object";
import { SessionIdentifier } from "../value-objects/session-identifier.value-object";


export interface RatingRepository {
  findByMovieId(movieId: string, limit?: number, offset?: number): Promise<Rating[]>;
  findDuplicate(movieId: string, identifier: SessionIdentifier): Promise<Rating | null>;
  countByMovieId(movieId: string): Promise<number>;
  getAverageRating(movieId: string): Promise<number>;
  batchCreate(ratings: Rating[]): Promise<Rating[]>;
}