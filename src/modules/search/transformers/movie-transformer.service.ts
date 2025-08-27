import { Injectable } from "@nestjs/common";
import { MovieTransformer } from "../interfaces/movie-transformer.interface";
import { CleanMovie } from "src/shared/interfaces/clean-movie.interface";

interface OpenSearchMovie {
  id: number;
  title: string;
  description: string;
  cast: string;
  type: any;
  releaseDate: string;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MovieTransformerService implements MovieTransformer {
  transform(hit: any): CleanMovie {
    const source = hit._source as OpenSearchMovie;
    
    return {
      id: source.id,
      title: source.title,
      description: source.description,
      coverUrl: undefined,
      releaseDate: new Date(source.releaseDate),
      type: source.type,
      avgRating: source.averageRating || 0,
      ratingsCount: source.ratingCount || 0,
      casts: this.transformCast(source.cast),
    };
  }

  private transformCast(cast: string): any[] {
    if (!cast) return [];
    
    return cast
      .split(' ')
      .filter(name => name.trim())
      .map(name => ({
        actor: { name: name.trim() },
        role: 'Actor'
      }));
  }
}