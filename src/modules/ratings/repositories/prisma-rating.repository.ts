import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { RatingRepository } from './rating.repository';
import { Rating } from '../entites/rating.entity';
import { SessionIdentifier } from '../value-objects/session-identifier.value-object';
import { RatingValue } from '../value-objects/rating.value-object';

@Injectable()
export class PrismaRatingRepository implements RatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByMovieId(movieId: string, limit = 50, offset = 0): Promise<Rating[]> {
    const results = await this.prisma.rating.findMany({
      where: { movieId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    });

    return results.map(this.toDomain);
  }

  async findDuplicate(movieId: string, identifier: SessionIdentifier): Promise<Rating | null> {
      const where: {
        movieId: string;
        OR?: Array<{ userId: string } | { sessionId: string }>;
      } = { movieId };

      const orConditions: Array<{ userId: string } | { sessionId: string }> = [];

      const userId = identifier.getUserId();

      if (userId) {
        orConditions.push({ userId: identifier.getUserId()! });
      }
      
      if (identifier.getSessionId) {
        orConditions.push({ sessionId: identifier.getSessionId()! });
      }

      if (orConditions.length === 0) {
        return null;
      }

      where.OR = orConditions;

      const result = await this.prisma.rating.findFirst({ where });
      return result ? this.toDomain(result) : null;
  }

  async countByMovieId(movieId: string): Promise<number> {
    return this.prisma.rating.count({ where: { movieId } });
  }

  async getAverageRating(movieId: string): Promise<number> {
    const result = await this.prisma.rating.aggregate({
      where: { movieId },
      _avg: { rating: true }
    });

    return result._avg.rating || 0;
  }

  async batchCreate(ratings: Rating[]): Promise<Rating[]> {
    const data = ratings.map(rating => ({
      id: rating.id,
      movieId: rating.movieId,
      rating: rating.rating,
      sessionId: rating.sessionId,
      userId: rating.userId,
      ipAddress: rating.ipAddress,
      userAgent: rating.userAgent,
    }));

    await this.prisma.rating.createMany({
      data,
      skipDuplicates: true
    });

    const ids = ratings.map(r => r.id);
    const results = await this.prisma.rating.findMany({
      where: { id: { in: ids } }
    });

    return results.map(this.toDomain);
  }

  private toDomain(prismaRating: any): Rating {
    return {
      id: prismaRating.id,
      movieId: prismaRating.movieId,
      rating: prismaRating.rating,
      sessionId: prismaRating.sessionId,
      userId: prismaRating.userId,
      ipAddress: prismaRating.ipAddress,
      userAgent: prismaRating.userAgent,
      createdAt: prismaRating.createdAt,
      updatedAt: prismaRating.updatedAt
    };
  }
}