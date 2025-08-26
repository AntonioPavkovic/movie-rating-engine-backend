import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/database/prisma/prisma.service";
import type { CacheRepository } from "../repositories/cache.repository";
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';

interface RatingToInsert {
  id: string;
  movieId: string;
  rating: number;
  sessionId: string | null;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

@Processor('rating-writes')
@Injectable()
export class BatchWriteProcessor {
  private readonly logger = new Logger(BatchWriteProcessor.name);
  private readonly BATCH_SIZE = 200;
  private processingInterval: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('CacheRepository') private readonly cache: CacheRepository
  ) {
    this.startBatchProcessor();
  }

  @Process('batch-write')
  async processSingleWrite(job: Job<{ ratingId: string }>) {
    const { ratingId } = job.data;
    
    try {
      const ratingData = await this.cache.hgetall(`rating:${ratingId}`);
      
      if (!ratingData.id) {
        throw new Error(`Rating ${ratingId} not found in cache`);
      }

      const validatedRating = this.validateAndTransformRating(ratingData);
      await this.persistToDatabase([validatedRating]);
      
      await this.cache.hset(`rating:${ratingId}`, 'persisted', '1');
      
      this.logger.debug(`Rating ${ratingId} persisted to DB`);

    } catch (error) {
      this.logger.error(`Failed to persist rating ${ratingId}:`, error);
      throw error;
    }
  }

  private startBatchProcessor(): void {
    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingRatings();
      } catch (error) {
        this.logger.error('Batch processing error:', error);
      }
    }, 2000);
  }

  private async processPendingRatings(): Promise<void> {
    const pendingRatings = await this.cache.lrange('pending:ratings', 0, this.BATCH_SIZE - 1);
    
    if (pendingRatings.length === 0) return;

    const ratingsToInsert: RatingToInsert[] = [];
    const keysToRemove: string[] = [];

    for (const ratingJson of pendingRatings) {
      try {
        const rating = JSON.parse(ratingJson);
        
        const isPersisted = await this.cache.hget(`rating:${rating.id}`, 'persisted');
        if (isPersisted === '1') {
          keysToRemove.push(ratingJson);
          continue;
        }

        const validatedRating = this.validateAndTransformRating(rating);
        ratingsToInsert.push(validatedRating);
        keysToRemove.push(ratingJson);

      } catch (error) {
        this.logger.error('Failed to process pending rating:', error);
        keysToRemove.push(ratingJson);
      }
    }

    if (ratingsToInsert.length > 0) {
      try {
        await this.persistToDatabase(ratingsToInsert);
        
        const pipeline = this.cache.pipeline();
        ratingsToInsert.forEach(rating => {
          pipeline.hset(`rating:${rating.id}`, 'persisted', '1');
        });
        await pipeline.exec();

        this.logger.log(`Batch inserted ${ratingsToInsert.length} ratings`);
      } catch (error) {
        this.logger.error('Batch insert failed:', error);
        return;
      }
    }

    if (keysToRemove.length > 0) {
      const pipeline = this.cache.pipeline();
      keysToRemove.forEach(item => {
        pipeline.lrem('pending:ratings', 1, item);
      });
      await pipeline.exec();
    }
  }

  private validateAndTransformRating(rawRating: any): RatingToInsert {
    if (!rawRating.id) {
      throw new Error('Rating ID is required');
    }
    if (!rawRating.movieId) {
      throw new Error('Movie ID is required');
    }
    if (!rawRating.rating) {
      throw new Error('Rating value is required');
    }

    const rating = parseFloat(rawRating.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new Error(`Invalid rating value: ${rawRating.rating}`);
    }

    return {
      id: rawRating.id,
      movieId: rawRating.movieId,
      rating: rating,
      sessionId: rawRating.sessionId || null,
      userId: rawRating.userId || null,
      ipAddress: rawRating.ipAddress || null,
      userAgent: rawRating.userAgent || null,
      createdAt: rawRating.timestamp ? new Date(parseInt(rawRating.timestamp)) : new Date()
    };
  }

  private async persistToDatabase(ratings: RatingToInsert[]): Promise<void> {
    try {
      const result = await this.prisma.rating.createMany({
        data: ratings,
        skipDuplicates: true
      });

      this.logger.debug(`Successfully inserted ${result.count} ratings to database`);
    } catch (error) {
      this.logger.error('Database persistence failed:', error);
      throw error;
    }
  }

  onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }
}
