import { Controller, Logger, Get, Query, HttpException, HttpStatus } from "@nestjs/common";
import { ContentType } from "src/modules/movies/enums/content-type.enum";
import { OpenSearchEngineService } from "../engines/opensearch-engine.service";
import { SearchFilters } from "../interfaces/search.interface";

@Controller('api/v1/search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchEngine: OpenSearchEngineService,
  ) {}

  @Get()
  async search(
    @Query('query') query?: string,
    @Query('type') type?: ContentType,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    this.logger.log(`Search request - Query: "${query}", Type: ${type}, Page: ${page}, Limit: ${limit}`);

    const filters = this.validateAndBuildFilters(page, limit, type);

    try {
      let result;
      
      if (!query || query.trim().length < 2) {
        this.logger.debug('No query or query too short - returning top rated content');
        result = await this.searchEngine.getTopRatedMovies(
          filters.type, 
          filters.page, 
          filters.limit
        );
        
        return {
          success: true,
          data: {
            movies: result.movies,
            total: result.total,
            page: filters.page,
            totalPages: Math.ceil(result.total / filters.limit),
            hasMore: (filters.page + 1) * filters.limit < result.total
          },
          message: this.buildTopRatedMessage(result.total, type),
          searchType: 'top-rated'
        };
      }

      this.logger.debug('Executing search with query', { query, filters });
      
      result = await this.searchEngine.searchMovies(
        query.trim(),
        type,
        filters.page,
        filters.limit
      );
      
      this.logger.log(`Search completed - Found ${result.total} results for "${query}"`);

      return {
        success: true,
        data: {
          movies: result.movies,
          total: result.total,
          page: filters.page,
          totalPages: Math.ceil(result.total / filters.limit),
          hasMore: (filters.page + 1) * filters.limit < result.total
        },
        message: `Found ${result.total} results for "${query}"${type ? ` in ${type.toLowerCase().replace('_', ' ')}s` : ''}`,
        searchType: 'query',
        query: query.trim()
      };
      
    } catch (error: any) {
      this.logger.error(`Search failed: ${error.message}`, error.stack);
      throw new HttpException(
        `Search failed: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private validateAndBuildFilters(page: string, limit: string, type?: ContentType): SearchFilters & { page: number } {
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);

    this.logger.debug('Validating search filters', { pageNum, limitNum, type });

    if (type && !Object.values(ContentType).includes(type)) {
      this.logger.warn(`Invalid content type: ${type}`);
      throw new HttpException('Invalid type. Must be MOVIE or TV_SHOW', HttpStatus.BAD_REQUEST);
    }

    return { type, page: pageNum, limit: limitNum };
  }

  private buildTopRatedMessage(total: number, type?: ContentType): string {
    const contentType = type ? type.toLowerCase().replace('_', ' ') + 's' : 'movies and TV shows';
    return `Top ${Math.min(total, 10)} ${contentType}`;
  }
}