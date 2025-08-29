import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { IMoviesRepository } from "../interfaces/movies-repository.interface";
import { ContentType } from "../enums/content-type.enum";
import { PaginationOptions } from "src/shared/dto/paginatied-option.dto";
import { PaginatedResult } from "src/shared/dto/paginater-result.dto";
import { MovieResponseDto } from "../dto/movie-response.dto";
import type { Cache } from "cache-manager";
import { Movie } from "../entities/movie.entity";
import { SearchOptions } from "src/shared/dto/search-options.dto";


@Injectable()
export class MovieService {
    private readonly logger = new Logger(MovieService.name);
    private readonly CACHE_TTL = 300; // 5 minutes
    private readonly MAX_LIMIT = 50;


    constructor(
        @Inject('IMoviesRepository')
        private readonly moviesRepository: IMoviesRepository,
        @Inject(CACHE_MANAGER)
        private readonly cacheManager: Cache,
    ) {}

    async getTopRated(
        type?: ContentType,
        pagination: PaginationOptions = { page: 1, limit: 10 },
        searchOptions?: SearchOptions
    ) : Promise<PaginatedResult<MovieResponseDto>> {
        
        this.validatePagination(pagination);

        const cacheKey = this.buildCacheKey('top-movies', {
            type,
            ...pagination,
            ...searchOptions 
        });

        const cached = await this.getCachedResult<PaginatedResult<MovieResponseDto>>(cacheKey);

        if (cached) {
            this.logger.debug(`Cache hit for key: ${cacheKey}`);
            return cached;
        }

        const { movies, total } = await this.moviesRepository.findTopRated({
            type,
            page: pagination.page,
            limit: pagination.limit,
            minRating: searchOptions?.minRating,
            searchQuery: searchOptions?.query,
        });

        const result = this.buildPaginatedResult(
            movies.map(movie => this.mapToResponseDto(movie)),
            total,
            pagination
        );

        await this.setCachedResult(cacheKey, result, this.CACHE_TTL/2);
        
        return result;
    }

    async getMovieById(id: string) {
        this.validateId(id);

        const cacheKey = this.buildCacheKey('movie', { id })

        const cached = await this.getCachedResult<MovieResponseDto>(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for movie: ${id}`);
            return cached;
        }

        this.logger.log(`Fetching movie by ID: ${id}`);

        const movie = await this.moviesRepository.findById(id);
        if (!movie) {
            throw new NotFoundException(`Movie with ID ${id} not found`);
        }

        const result = this.mapToResponseDto(movie);
        
        await this.setCachedResult(cacheKey, result, this.CACHE_TTL * 2);
        
        return result;
    }
    
    private validateId(id: string): void {
        if(!id?.trim()) {
            throw new BadRequestException('Movie ID cannot be empty');
        }
    }

    private mapToResponseDto(movie: Movie): MovieResponseDto {
        return {
            id: movie.id,
            title: movie.title,
            description: movie.description,
            releaseDate: movie.releaseDate,
            coverImage: movie.coverImage,
            type: movie.type,
            averageRating: movie.averageRating,
            totalRatings: movie.totalRatings,
            cast: movie.cast.map(castMember => castMember.actorName),
            createdAt: movie.createdAt,
            updatedAt: movie.updatedAt,
        };
    }

    private validatePagination(pagination: PaginationOptions): void {
        if (pagination.page < 1) {
        throw new BadRequestException('Page must be greater than 0');
        }
        
        if (pagination.limit < 1 || pagination.limit > this.MAX_LIMIT) {
        throw new BadRequestException(`Limit must be between 1 and ${this.MAX_LIMIT}`);
        }
    }

    private async invalidateMovieCaches(): Promise<void> {
        try {

            const store = (this.cacheManager as any).store;
             

        } catch (error) {
            this.logger.warn(`Failed to invalidate caches: ${error.message}`);
        }
    }

    private buildCacheKey(prefix: string, params: Record<string, any>) : string {
        const paramString = Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}:${value}`)
        .join(':');
        
        return paramString ? `${prefix}:${paramString}` : prefix;
    }

    private async getCachedResult<T>(key: string): Promise<T | null> {
        try {
            const result = await this.cacheManager.get<T>(key);
            return result ?? null;
        } catch (error) {
            this.logger.warn(`Cache get failed for key ${key}: ${error.message}`);
            return null;
        }
    }

    private async setCachedResult<T>(key: string, value: T, ttl: number): Promise<void> {
        try {
            await this.cacheManager.set(key, value, ttl);
        } catch(error) {
            this.logger.warn(`Cache set failed for key ${key}: ${error.message}`);
        }
    }

    private buildPaginatedResult<T>(
        data: T[],
        total: number,
        pagination: PaginationOptions
    ): PaginatedResult<T> {
        const totalPages = Math.ceil(total/pagination.limit);

        return {
            data,
            total,
            page:pagination.page,
            totalPages,
            hasNext:pagination.page < totalPages,
            hasPrevious:pagination.page > 1
        };
    }
}