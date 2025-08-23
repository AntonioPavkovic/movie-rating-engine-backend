import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ContentType } from "../enums/content-type.enum";

export class MovieResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Inception' })
  title: string;

  @ApiPropertyOptional({ example: 'A thief who steals corporate secrets through dream-sharing technology...' })
  description?: string;

  @ApiProperty({ example: '2010-07-16T00:00:00.000Z' })
  releaseDate: Date;

  @ApiPropertyOptional({ example: 'https://example.com/inception-poster.jpg' })
  coverImage?: string;

  @ApiProperty({ enum: ContentType, example: ContentType.MOVIE })
  type: ContentType;

  @ApiPropertyOptional({ example: 4.8, minimum: 0, maximum: 5 })
  averageRating?: number;

  @ApiProperty({ example: 150, minimum: 0 })
  totalRatings: number;

  @ApiProperty({ 
    example: ['Leonardo DiCaprio', 'Marion Cotillard', 'Tom Hardy'],
    description: 'Array of cast member names',
    type: [String]
  })
  cast: string[];

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;
}