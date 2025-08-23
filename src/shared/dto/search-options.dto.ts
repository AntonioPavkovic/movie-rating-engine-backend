import { ContentType } from "src/modules/movies/enums/content-type.enum";

export interface SearchOptions {
  query?: string;
  type?: ContentType;
  minRating?: number;
}
