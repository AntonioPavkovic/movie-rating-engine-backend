import { ContentType } from "src/modules/movies/enums/content-type.enum";
import { CleanMovie } from "src/shared/interfaces/clean-movie.interface";

export interface SearchCriteria {
    textQuery?: string;
    minRating?: number;
    maxRating?: number;
    afterYear?: number;
    beforeYear?: number;
    newerThanYears?: number;
    olderThanYears?: number;
    castNames?: string[];
}

export interface SearchFilters {
    type?: ContentType;
    page: number;
    limit: number
}

export interface SearchResult {
  movies: CleanMovie[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchEngine {
  search(criteria: SearchCriteria, filters: SearchFilters): Promise<SearchResult>;
  getTopRated(filters: SearchFilters): Promise<SearchResult>;
  searchMovies(query?: string, type?: ContentType, page?: number, limit?: number): Promise<SearchResult>;
  getTopRatedMovies(type?: ContentType, page?: number, limit?: number): Promise<SearchResult>;
}