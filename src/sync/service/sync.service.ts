import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/infrastructure/database/prisma/prisma.service";
import { OpenSearchEngineService } from "src/modules/search/engines/opensearch-engine.service";
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface MovieSyncEvent {
  movieId: string;
  action: 'create' | 'update' | 'rating_update';
  data?: any;
}

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);
    private ratingUpdateQueue = new Map<string, NodeJS.Timeout>();
    private isInitialized = false;

    constructor(
        private prisma: PrismaService,
        private opensearch: OpenSearchEngineService,
        private eventEmitter: EventEmitter2, 
    ) {}

    async onModuleInit() {
        this.logger.log('Starting automatic OpenSearch initialization...');

        try {
            const isHealthy = await this.opensearch.isHealthy();
            if (!isHealthy) {
                this.logger.warn('OpenSearch not healthy, skipping initialization');
                return;
            }

            const indexStats = await this.getIndexStats()
            const totalMoviesInDB = await this.prisma.movie.count();

            this.logger.log(`Database has ${totalMoviesInDB} movies, OpenSearch has ${indexStats.documentCount} documents`);

            if (indexStats.documentCount < totalMoviesInDB * 0.8) {
                this.logger.log('OpenSearch appears to be missing movies, starting bulk sync...');
                await this.bulkSync(20);
            } else {
                this.logger.log('OpenSearch appears to be up to date');
            }

            this.isInitialized = true;
            this.logger.log('OpenSearch initialization completed');
        } catch(error) {
            this.logger.error('Failed to initialize OpenSearch sync:', error);
        }
    }

    @OnEvent('movie.created')
    async handleMovieCreated(event: MovieSyncEvent) {
        try {
            const movie = await this.getMovieWithDetails(event.movieId);
            await this.opensearch.indexMovie(movie);
            this.logger.log(`Movie ${event.movieId} synced to OpenSearch`);
        } catch (error) {
            this.logger.error(`Failed to sync movie ${event.movieId}:`, error);
            await this.handleSyncFailure(event, error);
        }
    }

    @OnEvent('movie.updated')
    async handleMovieUpdate(event: MovieSyncEvent) {
        try {
            const movie = await this.getMovieWithDetails(event.movieId);
            await this.opensearch.updateMovie(movie);
            this.logger.log(`Movie ${event.movieId} updated in OpenSearch`);
        } catch(error) {
            this.logger.error(`Failed to update movie ${event.movieId}:`, error);
            await this.handleSyncFailure(event, error);
        }
    }

    @OnEvent('rating.created')
    @OnEvent('rating.updated')
    async handleRatingChanged(event: MovieSyncEvent) {
        try {
            await this.scheduleRatingUpdate(event.movieId);
        } catch(error) {
            this.logger.error(`Failed to handle rating change for movie ${event.movieId}:`, error);
        }
    }

    async deleteIndex(): Promise<void> {
        await this.opensearch.deleteIndex();
    }

    private async scheduleRatingUpdate(movieId: string) {
        if (this.ratingUpdateQueue.has(movieId)) {
            clearTimeout(this.ratingUpdateQueue.get(movieId));
        }

        const timeout = setTimeout(async () => {
            try {
                await this.updateMovieRatingInSearch(movieId);
                this.ratingUpdateQueue.delete(movieId);
                this.logger.log(`Rating updated for movie ${movieId}`);
            } catch(error) {
                this.logger.error(`Failed to update rating for movie ${movieId}:`, error);

                setTimeout(() => this.scheduleRatingUpdate(movieId), 10000);
            }
        }, 5000);

        this.ratingUpdateQueue.set(movieId, timeout);
    }

    private async updateMovieRatingInSearch(movieId: string) {
        const movieStats = await this.prisma.movie.findUnique({
            where: { id: movieId },
            select: {
                id: true,
                averageRating: true,
                totalRatings: true,
                statistics: {
                    select: {
                        rating1Count: true,
                        rating2Count: true,
                        rating3Count: true,
                        rating4Count: true,
                        rating5Count: true,
                        trendingScore: true,
                    }
                }
            }
        });

        if (movieStats) {
            await this.opensearch.updateMovieRating(movieId, {
                averageRating: movieStats.averageRating,
                totalRatings: movieStats.totalRatings,
                ratingDistribution: movieStats.statistics,
            });
        }
    }

    private async getMovieWithDetails(movieId: string) {
        return await this.prisma.movie.findUnique({
            where: { id: movieId },
            include: {
                cast: {
                    include: {
                        actor: true
                    }
                },
                statistics: true,
            }
        });
    }

    private async getIndexStats(): Promise<{ documentCount: number }> {
        try {
            const stats = await this.opensearch.getIndexStats();
            return { documentCount: stats.documentCount || 0 };
        } catch (error) {
            this.logger.warn('Could not get index stats, assuming empty index');
            return { documentCount: 0 };
        }
    }

    private async handleSyncFailure(event: MovieSyncEvent, error: any) {
        this.logger.error(`Sync failed for event:`, { event, error: error.message });

        setTimeout(async () => {
            try {
                this.eventEmitter.emit(`${event.action === 'rating_update' ? 'rating' : 'movie'}.${event.action}`, event); // ISPRAVKA: typo
            } catch (retryError) {
                this.logger.error(`Retry also failed for event:`, event);
            }
        }, 30000);
    }

    async bulkSync(batchSize = 10) {
        const numericBatchSize = typeof batchSize === 'string' ? parseInt(batchSize, 10) : batchSize;

        this.logger.log('Starting bulk sync with batch size: ', numericBatchSize);
        
        const totalMovies = await this.prisma.movie.count();
        const batches = Math.ceil(totalMovies / numericBatchSize);
        let totalIndexed = 0;
        let totalFailed = 0;

        for (let i = 0; i < batches; i++) {
            const movies = await this.prisma.movie.findMany({
                skip: i * numericBatchSize,
                take: numericBatchSize,
                include: {
                    cast: {
                        include: {
                            actor: true,
                        }
                    },
                    statistics: true,
                }
            });

            const { indexed, failed } = await this.opensearch.bulkIndexMovies(movies);
            totalIndexed += indexed;
            totalFailed += failed;

            this.logger.log(`Synced batch ${i + 1}/${batches}. Indexed: ${indexed}, Failed: ${failed}`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.logger.log(`Bulk sync completed. Total indexed: ${totalIndexed}, Total failed: ${totalFailed}`);
    }

    async triggerRatingSync(movieId: string): Promise<void> {
        await this.scheduleRatingUpdate(movieId);
    }

    onModuleDestroy() {
        for (const timeout of this.ratingUpdateQueue.values()) {
            clearTimeout(timeout);
        }
        this.ratingUpdateQueue.clear();
    }
}