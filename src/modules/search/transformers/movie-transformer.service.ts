import { Injectable } from "@nestjs/common";
import { MovieTransformer } from "../interfaces/movie-transformer.interface";
import { CleanMovie } from "src/shared/interfaces/clean-movie.interface";
import { ContentType } from "src/modules/movies/enums/content-type.enum";

interface OpenSearchCast {
  actorId: string;
  actorName: string;
  role: string;
}

interface OpenSearchMovie {
  id: string;
  title: string;
  description: string;
  cast: OpenSearchCast[];
  type: ContentType; 
  releaseDate: string;
  averageRating: number;
  ratingCount: number;
  coverImage?: string; 
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
      casts: source.cast?.map((c: any) => ({
        actor: { name: c.actorName },
        role: c.role
      })) || []
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