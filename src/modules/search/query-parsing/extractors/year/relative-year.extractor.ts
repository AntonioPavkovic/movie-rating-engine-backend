import { SearchCriteria } from "src/modules/search/interfaces/search.interface";
import { QueryExtractor } from "../base/base-extractor.abstract";

export class RelativeYearExtractor extends QueryExtractor {
  constructor(private isOlder: boolean) {
    super();
  }

  protected getPattern(): RegExp {
    return this.isOlder 
      ? /older\s+than\s+(\d+)\s*years?/i
      : /(?:newer\s+than|within\s+(?:the\s+)?last|in\s+the\s+past)\s+(\d+)\s*years?/i;
  }

  protected extractValue(match: RegExpMatchArray): number {
    return parseInt(match[1]);
  }

  protected getCriteriaKey(): keyof SearchCriteria {
    return this.isOlder ? 'olderThanYears' : 'newerThanYears';
  }

  protected isValidValue(value: number): boolean {
    return value > 0 && value <= 100;
  }
}