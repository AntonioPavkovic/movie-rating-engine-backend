import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import type { QueryParser } from '../interfaces/query-parser.interface';
import type { MovieTransformer } from '../interfaces/movie-transformer.interface';
import type { QueryBuilder } from '../interfaces/query-builder.interface';
import { SearchEngine, SearchResult, SearchCriteria, SearchFilters } from '../interfaces/search.interface';
import { PaginationCalculator } from '../utils/pagination.calculator';
import { ContentType } from '@prisma/client';

@Injectable()
export class OpenSearchEngineService implements SearchEngine {
  private readonly client: Client;
  private readonly logger = new Logger(OpenSearchEngineService.name);
  private readonly indexName = 'movies';

  constructor(
    private configService: ConfigService,
    @Inject('QueryParser') private queryParser: QueryParser,
    @Inject('MovieTransformer') private movieTransformer: MovieTransformer,
    @Inject('QueryBuilder') private queryBuilder: QueryBuilder,
  ) {
    this.client = this.createClient();
  }

  async search(criteria: SearchCriteria, filters: SearchFilters): Promise<SearchResult> {
    PaginationCalculator.validatePagination(filters.page, filters.limit);
    
    try {
      const offset = PaginationCalculator.calculateOffset(filters.page, filters.limit);
      const searchBody = this.queryBuilder.buildSearchQuery(criteria, filters.type);
      
      const response = await this.executeSearch(searchBody, offset, filters.limit);
      return this.processSearchResponse(response, filters.page, filters.limit);
      
    } catch (error) {
      this.logger.error('Search failed:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async searchMovies(query?: string, type?: ContentType, page = 1, limit = 10): Promise<SearchResult> {
    // Convert Prisma ContentType to internal type if needed
    const internalType = this.mapContentTypeToInternalType(type);
    const filters: SearchFilters = { type: internalType, page, limit };
    
    if (query?.trim() && query.trim().length >= 2) {
      const criteria = this.queryParser.parse(query.trim());
      return this.search(criteria, filters);
    }
    
    return this.getTopRated(filters);
  }

  async getTopRated(filters: SearchFilters): Promise<SearchResult> {
    try {
      const offset = Math.max(0, filters.page) * filters.limit;
      const searchBody = this.queryBuilder.buildTopRatedQuery(filters.type);
      
      const response = await this.executeSearch(searchBody, offset, filters.limit);
      return this.processSearchResponse(response, filters.page, filters.limit);
      
    } catch (error) {
      this.logger.error('Get top rated failed:', error);
      throw new Error(`Failed to get top rated movies: ${error.message}`);
    }
  }

  async getTopRatedMovies(type?: ContentType, page = 0, limit = 10): Promise<SearchResult> {
    // Convert Prisma ContentType to internal type
    const internalType = this.mapContentTypeToInternalType(type);
    const filters: SearchFilters = { type: internalType, page, limit };
    return this.getTopRated(filters);
  }

  // Helper method to map between Prisma ContentType and internal type
  private mapContentTypeToInternalType(prismaType?: ContentType): any {
    if (!prismaType) return undefined;
    
    // Map Prisma enum values to your internal enum values
    // Adjust this mapping based on your actual enum values
    switch (prismaType) {
      case 'MOVIE':
        return 'MOVIE';
      case 'TV_SHOW':
        return 'TV_SHOW';
      default:
        return prismaType;
    }
  }

  private createClient(): Client {
    return new Client({
      node: this.configService.get('OPENSEARCH_URL', 'http://localhost:9200'),
      auth: {
        username: this.configService.get('OPENSEARCH_USERNAME', 'admin'),
        password: this.configService.get('OPENSEARCH_PASSWORD', 'admin'),
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  private async executeSearch(searchBody: any, offset: number, limit: number): Promise<any> {
    return this.client.search({
      index: this.indexName,
      body: {
        ...searchBody,
        from: offset,
        size: limit,
      },
    });
  }

  private processSearchResponse(response: any, page: number, limit: number): SearchResult {
    const hits = response.body.hits.hits;
    const total = typeof response.body.hits.total === 'number'
      ? response.body.hits.total
      : response.body.hits.total?.value || 0;

    const movies = hits.map((hit: any) => this.movieTransformer.transform(hit));

    return {
      movies,
      total,
      page,
      totalPages: PaginationCalculator.calculateTotalPages(total, limit),
    };
  }

  async createIndex() {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (exists.body) {
        this.logger.log('Index already exists');
        return;
      }

      await this.client.indices.create({
        index: this.indexName,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { 
                type: 'text',
                analyzer: 'standard',
                fields: { keyword: { type: 'keyword' } }
              },
              description: { type: 'text', analyzer: 'standard' },
              cast: { type: 'text', analyzer: 'standard' },
              type: { type: 'keyword' },
              releaseDate: { type: 'date' },
              averageRating: { type: 'float' },
              ratingCount: { type: 'integer' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
      
      this.logger.log('Movies index created successfully');
    } catch (error) {
      this.logger.error('Error creating index:', error);
      throw error;
    }
  }
}