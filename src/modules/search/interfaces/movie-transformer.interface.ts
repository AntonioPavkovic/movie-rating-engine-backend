import { CleanMovie } from "src/shared/interfaces/clean-movie.interface";

export interface MovieTransformer {
  transform(hit: any): CleanMovie;
}