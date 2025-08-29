import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

export class BulkSyncQueryDto {
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? undefined : parsed;
        }
        return value;
    })
    @IsInt()
    @Min(1)
    batchSize?: number;
}