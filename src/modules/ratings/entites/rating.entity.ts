import { BaseEntity } from "src/shared/entities/base.entity";

export interface Rating extends BaseEntity {
  movieId: string;
  rating: number;
  sessionId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}