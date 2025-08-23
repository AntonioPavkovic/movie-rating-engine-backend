import { Movie } from "../entities/movie.entity";

export interface FindMoviesResult {
  movies: Movie[];
  total: number;
}