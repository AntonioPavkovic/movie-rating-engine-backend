import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RatingController } from './controllers/rating.controller';
import { HighPerformanceRatingService } from './services/high-performance-rating.service';
import { RatingDomainService } from './services/rating.service';
import { CreateRatingUseCase } from './use-cases/create-rating.use-case';
import { RedisCacheRepository } from './repositories/redis-cache-repository';
import { BatchWriteProcessor } from './processors/batch-write.processor';
import { BullQueueService } from './repositories/bull-queue.service';
import { PrismaRatingRepository } from './repositories/prisma-rating.repository';
import { MovieStatsSyncProcessor } from './processors/movie-stats-sync.processor';
import { MovieStatsSchedulerService } from './scheduler/movie-stats-scheduler.service';
import { SyncService } from 'src/sync/service/sync.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
    }),

    RedisModule.forRoot({
      type: 'single',
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`,
    }),

    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379,
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        }
      }
    }),

    BullModule.registerQueue(
      { name: 'rating-writes' },
      { name: 'rating-stats' }
    ),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      }
    ]),
    SearchModule
  ],

  controllers: [
    RatingController,
  ],

  providers: [
    RatingDomainService,

    HighPerformanceRatingService,
    CreateRatingUseCase,

    {
      provide: 'RatingRepository',
      useClass: PrismaRatingRepository,
    },
    {
      provide: 'CacheRepository',
      useClass: RedisCacheRepository,
    },
    {
      provide: 'QueueService',
      useClass: BullQueueService,
    },

    BatchWriteProcessor,
    MovieStatsSyncProcessor,
    MovieStatsSchedulerService,
    SyncService
  ],

  exports: [
    HighPerformanceRatingService,
    'RatingRepository',
    'CacheRepository',
  ],
})
export class RatingModule {}