import { 
  Controller, 
  Get, 
  Query, 
  HttpException, 
  HttpStatus,
  UseGuards,
  Logger 
} from '@nestjs/common';
import { OpenSearchEngineService } from '../engines/opensearch-engine.service';
import { SearchFilters } from '../interfaces/search.interface';
import { ContentType } from 'src/modules/movies/enums/content-type.enum';

@Controller('api/v1/search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchEngine: OpenSearchEngineService,
  ) {}

  @Get('movies')
  async searchMovies(
    @Query('query') query?: string,
    @Query('type') type?: ContentType,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    this.logger.log(`Search request received - Query: "${query}", Type: ${type}, Page: ${page}, Limit: ${limit}`);

    const filters = this.validateAndBuildFilters(page, limit, type);

    try {
      this.logger.debug('Executing movie search with validated filters', { filters, query });
      
      const result = await this.searchEngine.searchMovies(
        query,
        type,
        filters.page,
        filters.limit
      );
      
      this.logger.log(`Search completed successfully - Found ${result.movies.length} movies out of ${result.total} total`);

      return this.buildSearchResponse(result, query, type);
      
    } catch (error: any) {
      this.logger.error(`Movie search failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Search failed: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('top-rated')
  async getTopRatedMovies(
    @Query('type') type?: ContentType,
    @Query('page') page: string = '0',
    @Query('limit') limit: string = '10'
  ) {
    this.logger.log(`Top rated request - Type: ${type}, Page: ${page}, Limit: ${limit}`);

    const filters = this.validateAndBuildTopRatedFilters(page, limit, type);

    try {
      this.logger.debug('Fetching top rated movies with filters', { filters });
      
      const result = await this.searchEngine.getTopRatedMovies(
        filters.type, 
        filters.page, 
        filters.limit
      );

      const hasMore = (filters.page + 1) * filters.limit < result.total;

      this.logger.log(`Top rated fetch completed - Returning ${result.movies.length} movies, hasMore: ${hasMore}`);

      return {
        success: true,
        data: {
          movies: result.movies,
          total: result.total,
          page: filters.page,
          totalPages: Math.ceil(result.total / filters.limit),
          hasMore
        },
        message: this.buildTopRatedMessage(result.total, type)
      };

    } catch (error: any) {
      this.logger.error(`Top rated fetch failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get top rated movies: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('advanced')
  async advancedSearch(
    @Query('title') title?: string,
    @Query('description') description?: string,
    @Query('cast') cast?: string,
    @Query('minRating') minRating?: string,
    @Query('maxRating') maxRating?: string,
    @Query('afterYear') afterYear?: string,
    @Query('beforeYear') beforeYear?: string,
    @Query('type') type?: ContentType,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    this.logger.log('Advanced search request received', {
      title, description, cast, minRating, maxRating, afterYear, beforeYear, type
    });

    const filters = this.validateAndBuildFilters(page, limit, type);
    
    try {
      const queryParts: string[] = [];
      
      if (title) queryParts.push(title);
      if (description) queryParts.push(description);
      if (cast) queryParts.push(cast);
      if (minRating) queryParts.push(`at least ${minRating} stars`);
      if (maxRating) queryParts.push(`at most ${maxRating} stars`);
      if (afterYear) queryParts.push(`after ${afterYear}`);
      if (beforeYear) queryParts.push(`before ${beforeYear}`);
      
      const combinedQuery = queryParts.join(' ');
      this.logger.debug(`Advanced search combined query: "${combinedQuery}"`);

      const result = await this.searchEngine.searchMovies(
        combinedQuery,
        type,
        filters.page,
        filters.limit
      );

      this.logger.log(`Advanced search completed - Found ${result.total} results`);

      return {
        success: true,
        data: result,
        message: `Advanced search found ${result.total} results`,
        searchCriteria: {
          title, description, cast, minRating, maxRating, afterYear, beforeYear, type
        }
      };

    } catch (error: any) {
      this.logger.error(`Advanced search failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Advanced search failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('suggestions')
  async getSearchSuggestions(
    @Query('query') query: string,
    @Query('type') type?: ContentType
  ) {
    this.logger.log(`Search suggestions requested for: "${query}"`);

    if (!query || query.trim().length < 2) {
      throw new HttpException(
        'Query must be at least 2 characters long',
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const result = await this.searchEngine.searchMovies(
        query.trim(),
        type,
        1,
        5
      );

      const suggestions = result.movies.map(movie => ({
        id: movie.id,
        title: movie.title,
        type: movie.type,
        year: movie.releaseDate.getFullYear(),
        rating: movie.avgRating
      }));

      this.logger.debug(`Returning ${suggestions.length} suggestions`);

      return {
        success: true,
        data: suggestions,
        message: `Found ${suggestions.length} suggestions for "${query}"`
      };

    } catch (error: any) {
      this.logger.error(`Suggestions failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to get suggestions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private validateAndBuildFilters(page: string, limit: string, type?: ContentType): SearchFilters {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    this.logger.debug('Validating search filters', { pageNum, limitNum, type });

    if (pageNum < 1) {
      this.logger.warn(`Invalid page number: ${pageNum}`);
      throw new HttpException('Page must be greater than 0', HttpStatus.BAD_REQUEST);
    }

    if (limitNum < 1 || limitNum > 50) {
      this.logger.warn(`Invalid limit: ${limitNum}`);
      throw new HttpException('Limit must be between 1 and 50', HttpStatus.BAD_REQUEST);
    }

    if (type && !Object.values(ContentType).includes(type)) {
      this.logger.warn(`Invalid content type: ${type}`);
      throw new HttpException('Invalid type. Must be MOVIE or TV_SHOW', HttpStatus.BAD_REQUEST);
    }

    return { type, page: pageNum, limit: limitNum };
  }

  private validateAndBuildTopRatedFilters(page: string, limit: string, type?: ContentType): SearchFilters & { page: number } {
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
    const clientPage = parseInt(page, 10);
    
    this.logger.debug('Validating top rated filters', { clientPage, limitNum, type });
    
    if (Number.isNaN(clientPage) || clientPage < 0) {
      this.logger.warn(`Invalid page for top rated: ${clientPage}`);
      throw new HttpException('Page must be a non-negative integer', HttpStatus.BAD_REQUEST);
    }

    if (type && !Object.values(ContentType).includes(type)) {
      this.logger.warn(`Invalid content type for top rated: ${type}`);
      throw new HttpException('Invalid type. Must be MOVIE or TV_SHOW', HttpStatus.BAD_REQUEST);
    }

    const servicePage = Math.max(0, clientPage);
    return { type, page: servicePage, limit: limitNum };
  }

  private buildSearchResponse(result: any, query?: string, type?: ContentType) {
    const response = {
      success: true,
      data: result,
      message: query 
        ? `Found ${result.total} results for "${query}"` 
        : `Found ${result.total} ${type || 'movies and TV shows'}`
    };

    this.logger.debug('Built search response', { 
      totalResults: result.total, 
      returnedMovies: result.movies.length 
    });

    return response;
  }

  private buildTopRatedMessage(total: number, type?: ContentType): string {
    const contentType = type ? type.toLowerCase().replace('_', ' ') + 's' : 'movies and TV shows';
    return `Found ${total} top ${contentType}`;
  }
}