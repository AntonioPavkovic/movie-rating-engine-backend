import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MovieModule } from './modules/movies/movies.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RatingModule } from './modules/ratings/ratings.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    RedisModule.forRoot({
      type: 'single', 
      url: 'redis://localhost:6379', 
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    PrismaModule, 
    MovieModule,
    RatingModule,
    SearchModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}