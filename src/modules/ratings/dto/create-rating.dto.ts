import { IsNotEmpty, IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateRatingDto {
  @IsNotEmpty()
  @IsString()
  movieId: string;
  
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
  
  @IsOptional()
  @IsString()
  sessionId?: string;
  
  @IsOptional()
  @IsString()
  userId?: string;
  
  @IsOptional()
  @IsString()
  ipAddress?: string;
  
  @IsOptional()
  @IsString()
  userAgent?: string;
}