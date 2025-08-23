import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { MovieModule } from './modules/movies/movies.module';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
    }),
    PrismaModule, 
    MovieModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}