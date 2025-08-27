import { SearchCriteria } from "src/modules/search/interfaces/search.interface";
import { RatingExtractor } from "./rating-extractor.abstract";

export class MinRatingExtractor extends RatingExtractor {
  constructor(private mode: 'more_than' | 'at_least' | 'exact') {
    super();
  }

  protected getPattern(): RegExp {
    switch (this.mode) {
      case 'more_than':
        return /(?:more\s+than|above|over)\s+(\d+(?:\.\d+)?)\s*stars?/i;
      case 'at_least':
        return /(?:at\s+least|minimum|min)\s+(\d+(?:\.\d+)?)\s*stars?/i;
      case 'exact':
        return /(?:exactly\s+)?(\d+(?:\.\d+)?)\s*stars?/i;
    }
  }

  protected extractValue(match: RegExpMatchArray): number {
    const stars = parseFloat(match[1]);
    return this.mode === 'more_than' ? stars + 0.01 : stars;
  }

  protected getCriteriaKey(): keyof SearchCriteria {
    return 'minRating';
  }
}