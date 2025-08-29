import { Module } from '@nestjs/common';
import { SyncService } from './service/sync.service';
import { AdminSyncController } from './controller/admin-sync.controller';
import { SearchModule } from 'src/modules/search/search.module';

@Module({
  imports: [SearchModule],
  controllers: [AdminSyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}