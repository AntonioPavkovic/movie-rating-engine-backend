import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { IMoviesRepository } from '../interfaces/movies-repository.interface';
import { FindMoviesOptions } from '../interfaces/find-movies-options.interface';
import { FindMoviesResult } from '../interfaces/find-movies-result.interface';
import { Movie } from '../entities/movie.entity';
import { CastMember } from '../entities/cast-member.value-object';
import { Prisma } from '@prisma/client';

@Injectable()
export class MoviesRepository implements IMoviesRepository {
  private readonly logger = new Logger(MoviesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findTopRated(options: FindMoviesOptions): Promise<FindMoviesResult> {
    const { page, limit, type, sortBy = 'rating', sortOrder = 'desc', minRating, searchQuery } = options;
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    if (type) {
      whereClause.type = type;
    }

    if (minRating) {
      whereClause.averageRating = { gte: minRating };
    }

    if (searchQuery) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    try {
      const [movies, total] = await Promise.all([
        this.prisma.movie.findMany({
          where: whereClause,
          include: {
            cast: {
              include: {
                actor: {
                  select: { 
                    id: true, 
                    name: true, 
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: this.buildOrderBy(sortBy, sortOrder),
          skip,
          take: limit,
        }),
        this.prisma.movie.count({ where: whereClause }),
      ]);

      return { 
        movies: movies.map(movie => this.mapPrismaToMovie(movie)), 
        total 
      };
    } catch (error) {
      this.logger.error(`Failed to find top rated movies: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve movies: ${error.message}`);
    }
  }

  async findById(id: string): Promise<Movie | null> {
    try {
      const movie = await this.prisma.movie.findUnique({
        where: { id },
        include: {
          cast: {
            include: {
              actor: {
                select: { 
                  id: true, 
                  name: true, 
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return movie ? this.mapPrismaToMovie(movie) : null;
    } catch (error) {
      this.logger.error(`Failed to find movie ${id}: ${error.message}`, error.stack);
      throw new Error(`Failed to retrieve movie: ${error.message}`);
    }
  }

  async updateRatingStats(movieId: string, averageRating: number, totalRatings: number): Promise<void> {
    try {
      await this.prisma.movie.update({
        where: { id: movieId },
        data: {
          averageRating: Number(averageRating.toFixed(2)),
          totalRatings,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update rating stats: ${error.message}`, error.stack);
      throw new Error(`Failed to update movie rating statistics: ${error.message}`);
    }
  }

  private buildOrderBy(sortBy: string, sortOrder: string): any[] {
    const order = sortOrder as 'asc' | 'desc';
    
    switch (sortBy) {
      case 'title':
        return [{ title: order }];
      case 'releaseDate':
        return [{ releaseDate: order }];
      case 'rating':
      default:
        return [
          { averageRating: order },
          { totalRatings: order },
          { createdAt: 'desc' },
        ];
    }
  }

  private mapPrismaToMovie(movieData: any): Movie {
    return {
      id: movieData.id,
      title: movieData.title,
      description: movieData.description,
      releaseDate: movieData.releaseDate,
      coverImage: movieData.coverImage,
      type: movieData.type,
      averageRating: movieData.averageRating,
      totalRatings: movieData.totalRatings,
      cast: this.mapPrismaCast(movieData.cast || []),
      createdAt: movieData.createdAt,
      updatedAt: movieData.updatedAt,
    };
  }

  private mapPrismaCast(prismacast: any[]): CastMember[] {
    return prismacast.map(castMember => ({
      actorId: castMember.actor.id,
      actorName: castMember.actor.name,
      actorImage: castMember.actor.image,
      role: castMember.role,
    }));
  }
}