import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreateRatingDto } from "../dto/create-rating.dto";
import { RatingResponseDto } from "../dto/rating-response.dto";
import { Rating } from "../entites/rating.entity";
import { DuplicateRatingException } from "../exception/duplicate-rating.exception";
import type { RatingRepository } from "../repositories/rating.repository";
import { RatingDomainService } from "../services/rating.service";
import { RatingValue } from "../value-objects/rating.value-object";
import { SessionIdentifier } from "../value-objects/session-identifier.value-object";
import type { CacheRepository } from "../repositories/cache.repository";
import type { QueueService } from "../repositories/queue.repository";

@Injectable()
export class CreateRatingUseCase {
  private readonly logger = new Logger(CreateRatingUseCase.name);

  constructor(
    @Inject('RatingRepository') private readonly ratingRepository: RatingRepository,
    @Inject('CacheRepository') private readonly cacheRepository: CacheRepository,
    @Inject('QueueService') private readonly queueService: QueueService,
    private readonly domainService: RatingDomainService
  ) {}

  async execute(dto: CreateRatingDto): Promise<RatingResponseDto> {
    const startTime = performance.now();
    
    try {
      const ratingValue = new RatingValue(dto.rating);
      const identifier = new SessionIdentifier(dto.sessionId, dto.userId, dto.ipAddress);

      this.domainService.validateRatingCreation(ratingValue, identifier);

      await this.checkDuplicateRating(dto.movieId, identifier);

      const rating = this.createRatingEntity(dto, ratingValue);

      await this.fastWriteToCache(rating, dto.movieId, identifier);

      await this.queueBackgroundJobs(rating);

      const estimatedStats = await this.getEstimatedStats(dto.movieId);

      const duration = performance.now() - startTime;
      this.logger.debug(`Rating created in ${duration.toFixed(2)}ms`);

      return this.buildResponse(rating, estimatedStats);

    } catch (error) {
      this.logger.error(`Failed to create rating: ${error.message}`, { 
        movieId: dto.movieId, 
        error: error.stack 
      });
      throw error;
    }
  }

  private async checkDuplicateRating(movieId: string, identifier: SessionIdentifier): Promise<void> {
    const duplicateKey = this.buildDuplicateKey(movieId, identifier);
    const isDuplicate = await this.cacheRepository.exists(duplicateKey);
    
    if (isDuplicate) {
      throw new DuplicateRatingException(movieId);
    }

    const existingRating = await this.ratingRepository.findDuplicate(movieId, identifier);
    if (existingRating) {
      await this.cacheRepository.set(duplicateKey, 'exists', 3600);
      throw new DuplicateRatingException(movieId);
    }
  }

  private createRatingEntity(dto: CreateRatingDto, ratingValue: RatingValue): Rating {
    return {
      id: crypto.randomUUID(),
      movieId: dto.movieId,
      rating: ratingValue.getValue(),
      sessionId: dto.sessionId,
      userId: dto.userId,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async fastWriteToCache(rating: Rating, movieId: string, identifier: SessionIdentifier): Promise<void> {
    try {
      const pipeline = this.cacheRepository.pipeline();
      const duplicateKey = this.buildDuplicateKey(movieId, identifier);

      pipeline.hset(`rating:${rating.id}`, {
        id: rating.id,
        movieId: rating.movieId,
        rating: rating.rating.toString(),
        sessionId: rating.sessionId || '',
        userId: rating.userId || '',
        ipAddress: rating.ipAddress || '',
        userAgent: rating.userAgent || '',
        timestamp: Date.now().toString()
      });

      pipeline.setex(duplicateKey, 3600, 'exists');

      pipeline.lpush('pending:ratings', JSON.stringify({
        id: rating.id,
        movieId: rating.movieId,
        rating: rating.rating,
        sessionId: rating.sessionId,
        userId: rating.userId,
        ipAddress: rating.ipAddress,
        userAgent: rating.userAgent,
        timestamp: Date.now()
      }));

      pipeline.incrbyfloat(`movie:${movieId}:rating_sum`, rating.rating);
      pipeline.incr(`movie:${movieId}:rating_count`);
      pipeline.incr(`movie:${movieId}:rating_${rating.rating}`);

      const results = await pipeline.exec();
      
      const hasErrors = results?.some(([error]) => error !== null);
      if (hasErrors) {
        this.logger.error('Pipeline execution had errors:', results);
        throw new Error('Cache pipeline execution failed');
      }
      
    } catch (error) {
      this.logger.error('Failed to write to cache:', error);
    }
  }

  private async queueBackgroundJobs(rating: Rating): Promise<void> {

    const delay = Math.floor(Math.random() * 2000);
    
    await this.queueService.addJobWithOptions(
      'rating-writes',
      'batch-write',
      { ratingId: rating.id },
      {
        delay,
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 50,
        priority: 5
      }
    );

    await this.queueService.addJobWithOptions(
      'rating-stats',
      'update-stats',
      { movieId: rating.movieId, rating: rating.rating },
      { delay: 3000, attempts: 2 }
    );
  }

  private async getEstimatedStats(movieId: string): Promise<{ averageRating: number; totalRatings: number }> {
    const [sumStr, countStr] = await Promise.all([
      this.cacheRepository.get<string>(`movie:${movieId}:rating_sum`),
      this.cacheRepository.get<string>(`movie:${movieId}:rating_count`)
    ]);

    const parsedSum = parseFloat(sumStr || '0') || 0;
    const parsedCount = parseInt(countStr || '0') || 0;

    return {
      averageRating: parsedCount > 0 ? parsedSum / parsedCount : 0,
      totalRatings: parsedCount
    };
  }

  private buildResponse(rating: Rating, stats: { averageRating: number; totalRatings: number }): RatingResponseDto {
    return {
      id: rating.id,
      movieId: rating.movieId,
      rating: rating.rating,
      createdAt: rating.createdAt,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings
    };
  }

  private buildDuplicateKey(movieId: string, identifier: SessionIdentifier): string {
    const sessionId = identifier.getSessionId();
    const userId = identifier.getUserId();
    return `dup:${movieId}:${sessionId || userId}`;
  }
}
