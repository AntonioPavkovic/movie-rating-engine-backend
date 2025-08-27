import { SearchCriteria } from "src/modules/search/interfaces/search.interface";
import { RatingExtractor } from "./rating-extractor.abstract";

export class MaxRatingExtractor extends RatingExtractor {
  constructor(private mode: 'less_than' | 'at_most' | 'exact') {
    super();
  }

  protected getPattern(): RegExp {
    switch (this.mode) {
      case 'less_than':
        return /(?:less\s+than|under|below|maximum|max)\s+(\d+(?:\.\d+)?)\s*stars?/i;
      case 'at_most':
        return /(?:at\s+most|maximum\s+of|max\s+of)\s+(\d+(?:\.\d+)?)\s*stars?/i;
      case 'exact':
        return /(?:exactly\s+)?(\d+(?:\.\d+)?)\s*stars?/i;
    }
  }

  protected extractValue(match: RegExpMatchArray): number {
    const stars = parseFloat(match[1]);
    return this.mode === 'less_than' ? stars - 0.01 : stars;
  }

  protected getCriteriaKey(): keyof SearchCriteria {
    return 'maxRating';
  }
}