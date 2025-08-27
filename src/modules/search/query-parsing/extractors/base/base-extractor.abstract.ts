import { SearchCriteria } from "src/modules/search/interfaces/search.interface";

export abstract class QueryExtractor {
  protected abstract getPattern(): RegExp;
  protected abstract extractValue(match: RegExpMatchArray): any;
  protected abstract getCriteriaKey(): keyof SearchCriteria;

  extract(query: string, criteria: SearchCriteria): string {
    const match = query.match(this.getPattern());
    if (!match) return query;

    const value = this.extractValue(match);
    if (this.isValidValue(value)) {
      criteria[this.getCriteriaKey()] = value;
      return query.replace(this.getPattern(), '').trim();
    }
    
    return query;
  }

  protected abstract isValidValue(value: any): boolean;
}