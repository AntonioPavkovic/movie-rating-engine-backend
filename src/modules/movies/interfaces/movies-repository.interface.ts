import { Movie } from "../entities/movie.entity";
import { FindMoviesOptions } from "./find-movies-options.interface";
import { FindMoviesResult } from "./find-movies-result.interface";

export interface IMoviesRepository {
  findTopRated(options: FindMoviesOptions): Promise<FindMoviesResult>;
  findById(id: string): Promise<Movie | null>;
}