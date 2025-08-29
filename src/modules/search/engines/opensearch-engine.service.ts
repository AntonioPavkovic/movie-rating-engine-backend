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
      const offset = PaginationCalculator.calculateOffset(filters.page, filters.limit);
      const searchBody = this.queryBuilder.buildTopRatedQuery(filters.type);
      
      const response = await this.executeSearch(searchBody, offset, filters.limit);
      return this.processSearchResponse(response, filters.page, filters.limit);
      
    } catch (error) {
      this.logger.error('Get top rated failed:', error);
      throw new Error(`Failed to get top rated movies: ${error.message}`);
    }
  }

  async getTopRatedMovies(type?: ContentType, page = 0, limit = 10): Promise<SearchResult> {
    const internalType = this.mapContentTypeToInternalType(type);
    const filters: SearchFilters = { type: internalType, page, limit };
    return this.getTopRated(filters);
  }

  async indexMovie(movie: any): Promise<void> {
    try {
      const document = this.transformMovieForIndex(movie);
      
      const response = await this.client.index({
        index: this.indexName,
        id: movie.id,
        body: document,
        refresh: 'wait_for'
      });

      this.logger.debug(`Movie indexed successfully: ${movie.id}`, response.body);
    } catch (error) {
      this.logger.error(`Failed to index movie ${movie.id}:`, error);
      throw new Error(`Failed to index movie: ${error.message}`);
    }
  }

  async updateMovie(movie: any): Promise<void> {
    try {
      const document = this.transformMovieForIndex(movie);
      
      const response = await this.client.update({
        index: this.indexName,
        id: movie.id,
        body: {
          doc: document,
          doc_as_upsert: true
        },
        refresh: 'wait_for'
      });

      this.logger.debug(`Movie updated successfully: ${movie.id}`, response.body);
    } catch (error) {
      this.logger.error(`Failed to update movie ${movie.id}:`, error);
      throw new Error(`Failed to update movie: ${error.message}`);
    }
  }


  async updateMovieRating(movieId: string, ratingData: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution?: any;
  }): Promise<void> {
    try {
      const response = await this.client.update({
        index: this.indexName,
        id: movieId,
        body: {
          doc: {
            averageRating: ratingData.averageRating,
            ratingCount: ratingData.totalRatings, 
            trendingScore: ratingData.ratingDistribution?.trendingScore || 0,
            updatedAt: new Date().toISOString()
          }
        },
        refresh: false 
      });

      this.logger.debug(`Movie rating updated: ${movieId}`, response.body);
    } catch (error) {
      this.logger.error(`Failed to update movie rating ${movieId}:`, error);
      throw new Error(`Failed to update movie rating: ${error.message}`);
    }
  }

  async bulkIndexMovies(movies: any[]): Promise<{ indexed: number; failed: number }> {
    const bulkBody: any[] = [];
    const idMap: string[] = [];

  movies.forEach((movie) => {
    bulkBody.push({
      index: {
        _index: this.indexName,
        _id: movie.id,
      },
    });
    bulkBody.push(this.transformMovieForIndex(movie));
    idMap.push(movie.id);
  });

  const response = await this.client.bulk({
    refresh: false,
    body: bulkBody,
  });

  let indexed = 0;
  let failed = 0;

  response.body.items.forEach((item: any, i: number) => {
    const result = item.index;
    const movieId = idMap[i]; // direktna veza na movie.id

    if (result?.error) {
      failed++;
      this.logger.error(`Failed to index movie ${movieId}: ${JSON.stringify(result.error)}`);
    } else {
      indexed++;
      this.logger.debug(`Indexed movie ${movieId}`);
    }
  });

  return { indexed, failed }; 
  }

  async movieExists(movieId: string): Promise<boolean> {
    try {
      const response = await this.client.exists({
        index: this.indexName,
        id: movieId
      });
      
      return response.body;
    } catch (error) {
      this.logger.error(`Failed to check movie existence ${movieId}:`, error);
      return false;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.statusCode === 200;
    } catch(error) {
      this.logger.error('OpenSearch health check failed:', error);
      return false;
    }
  }

  async getIndexStats(): Promise<{ indexName: string, documentCount: number, indexSize: number, health: string, error?: string }> {
    try {
      const response = await this.client.indices.stats({
        index: this.indexName
      });

      return {
        indexName: this.indexName,
        documentCount: response.body.indices?.[this.indexName]?.total?.docs?.count || 0,
        indexSize: response.body.indices?.[this.indexName]?.total?.store?.size_in_bytes || 0,
        health: 'green'
      };
    } catch(error) {
      this.logger.error('Failed to get index stats:', error);
      return {
        indexName: this.indexName,
        documentCount: 0,
        indexSize: 0,
        health: 'red',
        error: error.message
      };
    }
  }

  private transformMovieForIndex(movie: any): any {
    const cast = movie.cast?.map((mc: any) => ({
      actorId: mc.actor?.id,
      actorName: mc.actor?.name,
      role: mc.role
    })) || [];

    const allText = [
      movie.title,
      movie.description,
      ...cast.map((c: any) => c.actorName),
      ...cast.map((c: any) => c.role)
    ].filter(Boolean).join(' ');

    return {
      id: movie.id,
      title: movie.title,
      description: movie.description,
      cast: cast,
      searchText: allText,
      type: movie.type,
      releaseDate: movie.releaseDate,
      averageRating: movie.averageRating || 0,
      ratingCount: movie.totalRatings || 0,
      trendingScore: movie.statistics?.trendingScore || 0,
      coverImage: movie.coverImage,
      createdAt: movie.createdAt,
      updatedAt: new Date().toISOString()
    };
  }

  private mapContentTypeToInternalType(prismaType?: ContentType): any {
    if (!prismaType) return undefined;
    
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
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                movie_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { 
                type: 'text',
                analyzer: 'movie_analyzer',
                fields: { 
                  keyword: { type: 'keyword' },
                  suggest: { type: 'completion' }
                }
              },
              description: { type: 'text', analyzer: 'movie_analyzer' },
              cast: {
                type: 'nested',
                properties: {
                  actorId: { type: 'keyword' },
                  actorName: { 
                    type: 'text', 
                    analyzer: 'movie_analyzer',
                    fields: { keyword: { type: 'keyword' } }
                  },
                  role: { type: 'text' }
                }
              },
              searchText: { type: 'text', analyzer: 'movie_analyzer'  },
              type: { type: 'keyword' },
              releaseDate: { type: 'date' },
              averageRating: { type: 'float' },
              ratingCount: { type: 'integer' },
              trendingScore: { type: 'float' },
              coverImage: { type: 'keyword', index: false },
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

  async deleteIndex(): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index: this.indexName });
      if (exists.body) {
        await this.client.indices.delete({ index: this.indexName });
        this.logger.log(`Index ${this.indexName} deleted`);
      }
    } catch (error) {
      this.logger.error('Error deleting index:', error);
      throw error;
    }
  }
}