export class RatingResponseDto {
  id: string;
  movieId: string;
  rating: number;
  createdAt: Date;
  averageRating: number;
  totalRatings: number;
}