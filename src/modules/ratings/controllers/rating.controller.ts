import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { HighPerformanceRatingService } from "../services/high-performance-rating.service";
import { CreateRatingDto } from "../dto/create-rating.dto";
import { ThrottlerGuard } from "@nestjs/throttler";

@ApiTags('ratings')
@Controller('api/v1/ratings')
@UseGuards(ThrottlerGuard)
export class RatingController {
    constructor(private readonly ratingService: HighPerformanceRatingService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a movie rating',
        description: 'Creates a new rating for a movie. Supports thousands of concurrent requests.' 
    })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 409, description: 'Rating already exists' })
    @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
    async createRating(@Body() dto: CreateRatingDto, @Req() req: any) {
        dto.sessionId = dto.sessionId || req.sessionId || `sess-${Date.now()}`;
        dto.ipAddress = dto.ipAddress || req.ip || 'unknown';
        dto.userAgent = dto.userAgent || req.get('User-Agent') || 'unknown';
        dto.userId = dto.userId || req.user?.id;

        return this.ratingService.createRating(dto);
    }
}