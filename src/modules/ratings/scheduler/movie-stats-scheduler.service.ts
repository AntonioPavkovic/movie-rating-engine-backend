import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import type { CacheRepository } from '../repositories/cache.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class MovieStatsSchedulerService {
  private readonly logger = new Logger(MovieStatsSchedulerService.name);

  constructor(
    @InjectQueue('rating-stats') private readonly statsQueue: Queue,
    @Inject('CacheRepository') private readonly cache: CacheRepository
  ) {}

  // Run every 5 minutes to sync active movies
  @Cron('*/5 * * * *')
  async syncActiveMovieStats() {
    try {
      const activeMovieIds = await this.getActiveMovieIds();
      
      if (activeMovieIds.length > 0) {
        await this.statsQueue.add('batch-update-stats', {
          movieIds: activeMovieIds
        }, {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        });
        
        this.logger.debug(`Queued stats sync for ${activeMovieIds.length} active movies`);
      }
    } catch (error) {
      this.logger.error('Failed to queue active movie stats sync:', error);
    }
  }

  @Cron('*/2 * * * * *')
  async syncAllMovieStats() {
    try {
      const allMovieIds = await this.getAllMoviesWithRatings();
      
      const batchSize = 50;
      const batches = this.chunkArray(allMovieIds, batchSize);
      
      for (const batch of batches) {
        await this.statsQueue.add('batch-update-stats', {
          movieIds: batch
        }, {
          attempts: 2,
          delay: Math.random() * 10000, // Add jitter
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        });
      }
      
      this.logger.log(`Queued stats sync for ${allMovieIds.length} movies in ${batches.length} batches`);
    } catch (error) {
      this.logger.error('Failed to queue movie stats sync:', error);
    }
  }

  private async getActiveMovieIds(): Promise<string[]> {
    try {
      // Use a more reliable method to get movies with ratings
      // Since keys() method doesn't exist, we'll need an alternative approach
      
      // Option 1: Get from a known set (if you maintain one)
      const movieSet = await this.cache.get<string[]>('active_movies');
      if (movieSet && movieSet.length > 0) {
        return movieSet;
      }
      
      // Option 2: Fallback to empty array (scheduler will just skip)
      this.logger.warn('No active movies found in cache');
      return [];
      
    } catch (error) {
      this.logger.error('Error getting active movie IDs:', error);
      return [];
    }
  }

  private async getAllMoviesWithRatings(): Promise<string[]> {
    try {
      const moviesWithRatings = await this.cache.get<string[]>('movies_with_ratings');
      if (moviesWithRatings && moviesWithRatings.length > 0) {
        return moviesWithRatings;
      }
      
      this.logger.warn('Using database fallback for movies with ratings');
      return await this.getMoviesFromDatabase();
      
    } catch (error) {
      this.logger.error('Error getting all movie IDs:', error);
      return [];
    }
  }

  private async getMoviesFromDatabase(): Promise<string[]> {
    return [];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}