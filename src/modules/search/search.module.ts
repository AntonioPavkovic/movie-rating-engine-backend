import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenSearchEngineService } from './engines/opensearch-engine.service';
import { QueryParserService } from './query-parsing/query-parser.service';
import { MovieTransformerService } from './transformers/movie-transformer.service';
import { OpenSearchQueryBuilder } from './query-builders/opensearch-query.builder';
import { QueryNormalizerImpl } from './query-parsing/normalizers/query-normalizer.impl';
import { SearchController } from './controllers/opensearch.controller';

@Module({
  imports: [ConfigModule],
  controllers: [SearchController],
  providers: [
    OpenSearchEngineService,
    QueryParserService,
    MovieTransformerService,
    OpenSearchQueryBuilder,
    QueryNormalizerImpl,
    
    {
      provide: 'QueryParser',
      useClass: QueryParserService,
    },
    {
      provide: 'QueryBuilder',
      useClass: OpenSearchQueryBuilder,
    },
    {
      provide: 'MovieTransformer',
      useClass: MovieTransformerService,
    },
    {
      provide: 'QueryNormalizer', 
      useClass: QueryNormalizerImpl,
    }
  ],
  exports: [
    OpenSearchEngineService, 
    QueryParserService,
    'QueryParser',
    'QueryBuilder',
    'MovieTransformer'
  ],
})
export class SearchModule {}