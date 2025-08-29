import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/database/prisma/prisma.service";
import type { CacheRepository } from "../repositories/cache.repository";
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { RatingDomainService } from "../services/rating.service";
import { SyncService } from "src/sync/service/sync.service";


interface MovieStatsJob {
  movieId: string;
  rating?: number;
}

@Processor('rating-stats')
@Injectable()
export class MovieStatsSyncProcessor {
  private readonly logger = new Logger(MovieStatsSyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('CacheRepository') private readonly cache: CacheRepository,
    private readonly domainService: RatingDomainService,
    private readonly syncService: SyncService,
  ) {}

  @Process('update-stats')
  async updateMovieStats(job: Job<MovieStatsJob>) {
    const { movieId } = job.data;
    
    try {
      await this.syncMovieStatsToDatabase(movieId);

      await this.syncService.triggerRatingSync(movieId);
      this.logger.debug(`Movie stats updated for ${movieId}`);
    } catch (error) {
      this.logger.error(`Failed to update movie stats for ${movieId}:`, error);
      throw error;
    }
  }

  @Process('batch-update-stats')
  async batchUpdateMovieStats(job: Job<{ movieIds: string[] }>) {
    const { movieIds } = job.data;
    
    try {
      await Promise.all(
        movieIds.map(movieId => this.syncMovieStatsToDatabase(movieId))
      );

      await Promise.all(
        movieIds.map(movieId => this.syncService.triggerRatingSync(movieId))
      );

      this.logger.log(`Batch updated stats for ${movieIds.length} movies`);
    } catch (error) {
      this.logger.error('Batch stats update failed:', error);
      throw error;
    }
  }

  private async syncMovieStatsToDatabase(movieId: string): Promise<void> {
    // Get stats from Redis cache
    const cacheStats = await this.getStatsFromCache(movieId);
    
    if (cacheStats.totalRatings === 0) {
      // No ratings in cache, skip update
      return;
    }

    // Calculate trending score
    const trendingScore = this.domainService.calculateTrendingScore(
      cacheStats.averageRating,
      cacheStats.totalRatings,
      cacheStats.recentRatingsCount
    );

    // Update movies table
    await this.updateMovieTable(movieId, {
      averageRating: cacheStats.averageRating,
      totalRatings: cacheStats.totalRatings
    });

    // Update movie_statistics table
    await this.updateMovieStatisticsTable(movieId, {
      ...cacheStats,
      trendingScore
    });
  }

  private async getStatsFromCache(movieId: string): Promise<{
    averageRating: number;
    totalRatings: number;
    rating1Count: number;
    rating2Count: number;
    rating3Count: number;
    rating4Count: number;
    rating5Count: number;
    recentRatingsCount: number;
  }> {
    const [
      sumStr, 
      countStr, 
      rating1Str, 
      rating2Str, 
      rating3Str, 
      rating4Str, 
      rating5Str,
      recentStr
    ] = await Promise.all([
      this.cache.get<string>(`movie:${movieId}:rating_sum`),
      this.cache.get<string>(`movie:${movieId}:rating_count`),
      this.cache.get<string>(`movie:${movieId}:rating_1`),
      this.cache.get<string>(`movie:${movieId}:rating_2`),
      this.cache.get<string>(`movie:${movieId}:rating_3`),
      this.cache.get<string>(`movie:${movieId}:rating_4`),
      this.cache.get<string>(`movie:${movieId}:rating_5`),
      this.cache.get<string>(`movie:${movieId}:recent_count`)
    ]);

    const totalSum = parseFloat(sumStr || '0') || 0;
    const totalRatings = parseInt(countStr || '0') || 0;
    const averageRating = totalRatings > 0 ? totalSum / totalRatings : 0;

    return {
      averageRating,
      totalRatings,
      rating1Count: parseInt(rating1Str || '0') || 0,
      rating2Count: parseInt(rating2Str || '0') || 0,
      rating3Count: parseInt(rating3Str || '0') || 0,
      rating4Count: parseInt(rating4Str || '0') || 0,
      rating5Count: parseInt(rating5Str || '0') || 0,
      recentRatingsCount: parseInt(recentStr || '0') || 0
    };
  }

  private async updateMovieTable(movieId: string, stats: {
    averageRating: number;
    totalRatings: number;
  }): Promise<void> {
    await this.prisma.movie.update({
      where: { id: movieId },
      data: {
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
        updatedAt: new Date()
      }
    });
  }

  private async updateMovieStatisticsTable(movieId: string, stats: {
    averageRating: number;
    totalRatings: number;
    rating1Count: number;
    rating2Count: number;
    rating3Count: number;
    rating4Count: number;
    rating5Count: number;
    recentRatingsCount: number;
    trendingScore: number;
  }): Promise<void> {
    await this.prisma.movieStatistics.upsert({
      where: { movieId },
      create: {
        movieId,
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
        rating1Count: stats.rating1Count,
        rating2Count: stats.rating2Count,
        rating3Count: stats.rating3Count,
        rating4Count: stats.rating4Count,
        rating5Count: stats.rating5Count,
        recentRatingsCount: stats.recentRatingsCount,
        trendingScore: stats.trendingScore,
        lastCalculatedAt: new Date()
      },
      update: {
        averageRating: stats.averageRating,
        totalRatings: stats.totalRatings,
        rating1Count: stats.rating1Count,
        rating2Count: stats.rating2Count,
        rating3Count: stats.rating3Count,
        rating4Count: stats.rating4Count,
        rating5Count: stats.rating5Count,
        recentRatingsCount: stats.recentRatingsCount,
        trendingScore: stats.trendingScore,
        lastCalculatedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}