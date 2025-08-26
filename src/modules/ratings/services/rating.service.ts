import { Injectable } from "@nestjs/common";
import { RatingValue } from "../value-objects/rating.value-object";
import { SessionIdentifier } from "../value-objects/session-identifier.value-object";
import { InvalidRatingException } from "../exception/invalid-rating.exception";

@Injectable()
export class RatingDomainService  {
    validateRatingCreation(ratingValue: RatingValue, identifier: SessionIdentifier) {
        if (!ratingValue) {
        throw new InvalidRatingException(0);
        }
        
        if (!identifier) {
        throw new Error('Session identifier is required');
        }
    }

    calculateTrendingScore(averageRating: number, totalRatings: number, recentCount = 0): number {
        if (totalRatings === 0) return 0;
        
        const confidence = 0.95;
        const z = 1.96; 

        const phat = averageRating / 5.0; 
        const n = totalRatings;
        
        if (n === 0) return 0;
        
        const wilson = (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / (1 + z * z / n);
   
        const recencyBoost = 1 + (recentCount / Math.max(totalRatings, 1)) * 0.2;
        
        return wilson * recencyBoost * 100;
    }
}