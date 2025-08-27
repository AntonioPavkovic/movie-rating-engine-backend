import { SearchCriteria } from "src/modules/search/interfaces/search.interface";
import { QueryExtractor } from "../base/base-extractor.abstract";

export class YearAfterExtractor extends QueryExtractor {
  protected getPattern(): RegExp {
    return /(?:after|since|from)\s+(\d{4})/i;
  }

  protected extractValue(match: RegExpMatchArray): number {
    return parseInt(match[1]);
  }

  protected getCriteriaKey(): keyof SearchCriteria {
    return 'afterYear';
  }

  protected isValidValue(value: number): boolean {
    return value >= 1900 && value <= new Date().getFullYear();
  }
}