import { Controller, Get, HttpStatus, ParseEnumPipe, ParseFloatPipe, ParseIntPipe, Query } from "@nestjs/common";
import { ApiBadRequestResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MovieService } from "../services/movies.service";
import { PaginationOptions } from "src/shared/dto/paginatied-option.dto";
import { SearchOptions } from "src/shared/dto/search-options.dto";
import { ContentType } from "../enums/content-type.enum";

@ApiTags('movies')
@Controller('api/v1/movies')
export class MovieController {
    constructor(private readonly movieService: MovieService) {}

    @Get()
      @ApiOperation({ 
    summary: 'Get top rated movies/TV shows',
    description: 'Retrieve a paginated list of top-rated movies or TV shows with optional filtering.'
  })
  @ApiQuery({ name: 'type', enum: ContentType, required: false, description: 'Filter by content type' })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10, description: 'Items per page (1-50)' })
  @ApiQuery({ name: 'search', type: String, required: false, description: 'Search query' })
  @ApiQuery({ name: 'minRating', type: Number, required: false, description: 'Minimum rating filter (1-5)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Movies retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/MovieResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
        hasNext: { type: 'boolean' },
        hasPrevious: { type: 'boolean' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination parameters' })
    async getTopRated(
        @Query('type', new ParseEnumPipe(ContentType, { optional: true })) type?: ContentType,
        @Query('page', new ParseIntPipe({ optional: true })) page = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
        @Query('search') search?: string,
        @Query('minRating', new ParseFloatPipe({ optional: true })) minRating?: number,
    ) {
        const pagination: PaginationOptions = { page, limit };
        const searchOptions: SearchOptions = { query: search, minRating };
    
        return this.movieService.getTopRated(type, pagination, searchOptions);
    }
}