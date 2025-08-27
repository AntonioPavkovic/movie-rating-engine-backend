import { Injectable } from "@nestjs/common";
import { QueryParser } from "../interfaces/query-parser.interface";
import { SearchCriteria } from "../interfaces/search.interface";
import { QueryExtractor } from "./extractors/base/base-extractor.abstract";
import { MaxRatingExtractor } from "./extractors/rating/max-rating.extractor";
import { MinRatingExtractor } from "./extractors/rating/min-rating.extractor";
import { YearAfterExtractor } from "./extractors/year/year-after.extractor";
import { YearBeforeExtractor } from "./extractors/year/year-before.extractor";
import { QueryNormalizerImpl } from "./normalizers/query-normalizer.impl";
import { QueryNormalizer } from "./normalizers/query-normalizer.interface";
import { RelativeYearExtractor } from "./extractors/year/relative-year.extractor";

@Injectable()
export class QueryParserService implements QueryParser {
  private readonly normalizer: QueryNormalizer;
  private readonly extractors: QueryExtractor[];

  constructor() {
    this.normalizer = new QueryNormalizerImpl();
    this.extractors = [
      new YearAfterExtractor(),
      new YearBeforeExtractor(),
      new RelativeYearExtractor(true),  
      new RelativeYearExtractor(false),
      new MinRatingExtractor('more_than'),
      new MaxRatingExtractor('less_than'),
      new MinRatingExtractor('at_least'),
      new MaxRatingExtractor('at_most'),
      new MinRatingExtractor('exact'),
      new MaxRatingExtractor('exact'),
    ];
  }

  parse(query: string): SearchCriteria {
    const criteria: SearchCriteria = {};
    const normalizedQuery = this.normalizer.normalize(query);
    
    let cleanedQuery = normalizedQuery;
    
    for (const extractor of this.extractors) {
      cleanedQuery = extractor.extract(cleanedQuery, criteria);
    }

    if (criteria.minRating !== undefined && criteria.maxRating !== undefined && 
        criteria.minRating === criteria.maxRating) {
    }

    cleanedQuery = cleanedQuery.replace(/\s+/g, ' ').trim();
    if (cleanedQuery && cleanedQuery.length >= 2) {
      criteria.textQuery = cleanedQuery;
    }

    return criteria;
  }
}