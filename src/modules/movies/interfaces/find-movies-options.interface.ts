import { ContentType } from "../enums/content-type.enum";

export interface FindMoviesOptions {
  type?: ContentType;
  page: number;
  limit: number;
  sortBy?: 'rating' | 'title' | 'releaseDate';
  sortOrder?: 'asc' | 'desc';
  minRating?: number;
  maxRating?: number;
  genre?: string;
  releaseYear?: number;
  searchQuery?: string;
}