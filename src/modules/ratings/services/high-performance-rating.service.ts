import { Injectable, Logger } from "@nestjs/common";
import { CreateRatingUseCase } from "../use-cases/create-rating.use-case";
import { CreateRatingDto } from "../dto/create-rating.dto";
import { RatingResponseDto } from "../dto/rating-response.dto";

@Injectable()
export class HighPerformanceRatingService {
    private readonly logger = new Logger(HighPerformanceRatingService.name);

    constructor(
        private readonly createRatingUseCase: CreateRatingUseCase
    ) {}

    async createRating(dto: CreateRatingDto): Promise<RatingResponseDto> {
        return this.createRatingUseCase.execute(dto);
    }
}