import { QueryExtractor } from "../base/base-extractor.abstract";

export abstract class RatingExtractor extends QueryExtractor {
  protected extractValue(match: RegExpMatchArray): number {
    return parseFloat(match[1]);
  }

  protected isValidValue(value: number): boolean {
    return value >= 1 && value <= 5;
  }
}