import { Controller, Post, Get, Query, Param, HttpCode, HttpStatus, Delete } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SyncService } from "../service/sync.service";
import { BulkSyncQueryDto } from "../dto/bulk-sync-query.dto";

@ApiTags('admin/sync')
@Controller('api/v1/admin/sync')
export class AdminSyncController {
    constructor(
        private readonly syncService: SyncService,
    ) {}

    @Post('movies/bulk')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'Bulk sync all movies to OpenSearch',
        description: 'Triggers bulk synchronization of all movies from PostgreSQL to OpenSearch.'
    })
    async bulkSyncMovies(@Query() query: BulkSyncQueryDto) {
        const batchSize = query.batchSize || 10;
        
        this.syncService.bulkSync(batchSize)
            .catch(error => {
                console.error('Bulk sync failed:', error);
            });
    
        return {
            message: 'Bulk sync started',
            batchSize: batchSize,
            timestamp: new Date().toISOString()
        };
    }

    @Post('movie/:id/rating/force')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Force immediate rating sync for movie',
        description: 'Manually trigger rating sync for a specific movie'
    })
    @ApiResponse({ status: 200, description: 'Rating sync triggered successfully' })
    async forceRatingSync(@Param('id') movieId: string) {
        await this.syncService.triggerRatingSync(movieId);
        return { 
            message: `Rating sync triggered for movie ${movieId}`,
            timestamp: new Date().toISOString()
        };
    }

    @Get('health')
    @ApiOperation({
        summary: 'Check sync service health',
        description: 'Returns health status of sync components'
    })
    async getHealthStatus() {
        return {
            status: 'healthy',
            services: {
                syncService: 'active',
                openSearch: 'connected', 
                postgres: 'connected'
            },
            timestamp: new Date().toISOString()
        };
    }

    @Delete('index')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Delete OpenSearch index',
        description: 'Deletes the movies index to recreate with new mapping'
    })
    async deleteIndex() {
        await this.syncService.deleteIndex();
        return {
            message: 'Index deleted successfully',
            timestamp: new Date().toISOString()
        };
    }
}