import { Module } from '@nestjs/common';
import { MovieController } from './controllers/movies.controller';
import { MovieService } from './services/movies.service';
import { MoviesRepository } from './repositories/movies.repository';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300, // 5 minutes default TTL
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [MovieController],
  providers: [
    MovieService,
    {
      provide: 'IMoviesRepository',
      useClass: MoviesRepository,
    },
  ],
  exports: [MovieService],
})
export class MovieModule {}