import { ContentType } from "@prisma/client";

export interface CleanMovie {
  id: number;
  title: string;
  description: string;
  coverUrl?: string;
  releaseDate: Date;
  type: ContentType;
  avgRating: number;
  ratingsCount: number;
  casts: MovieCast[];
}

export interface MovieCast {
  actor: {
    name: string;
  };
  role: string;
}

export interface OpenSearchMovie {
  id: number;
  title: string;
  description: string;
  cast: string;
  type: ContentType;
  releaseDate: string;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}