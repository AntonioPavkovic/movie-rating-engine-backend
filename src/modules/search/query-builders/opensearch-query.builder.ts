import { Injectable } from "@nestjs/common";
import { QueryBuilder } from "../interfaces/query-builder.interface";
import { SearchCriteria } from "../interfaces/search.interface";
import { ContentType } from "@prisma/client";

@Injectable()
export class OpenSearchQueryBuilder implements QueryBuilder {
  buildSearchQuery(criteria: SearchCriteria, type?: ContentType): any {
    const mustClauses = this.buildMustClauses(criteria, type);
    
    return {
      query: {
        bool: mustClauses.length > 0 
          ? { must: mustClauses }
          : { must_not: [{ match_all: {} }] }
      },
      sort: this.getSearchSort()
    };
  }

  buildTopRatedQuery(type?: ContentType): any {
    const mustClauses: any[] = [];
    
    if (type) {
      mustClauses.push({ term: { type } });
    }

    return {
      query: {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }]
        }
      },
      sort: this.getTopRatedSort()
    };
  }

  private buildMustClauses(criteria: SearchCriteria, type?: ContentType): any[] {
    const clauses: any[] = [];

    if (type) {
      clauses.push({ term: { type } });
    }

    this.addRatingFilters(clauses, criteria);
    this.addDateFilters(clauses, criteria);
    this.addTextQuery(clauses, criteria);
    this.addCastFilters(clauses, criteria);

    return clauses;
  }

  private addRatingFilters(clauses: any[], criteria: SearchCriteria): void {
    if (criteria.minRating !== undefined) {
      clauses.push({
        range: { averageRating: { gte: criteria.minRating } }
      });
    }

    if (criteria.maxRating !== undefined) {
      clauses.push({
        range: { averageRating: { lte: criteria.maxRating } }
      });
    }
  }

  private addDateFilters(clauses: any[], criteria: SearchCriteria): void {
    const currentYear = new Date().getFullYear();

    if (criteria.afterYear) {
      clauses.push({
        range: { releaseDate: { gte: `${criteria.afterYear}-01-01` } }
      });
    }

    if (criteria.beforeYear) {
      clauses.push({
        range: { releaseDate: { lt: `${criteria.beforeYear + 1}-01-01` } }
      });
    }

    if (criteria.olderThanYears) {
      const cutoffYear = currentYear - criteria.olderThanYears;
      clauses.push({
        range: { releaseDate: { lt: `${cutoffYear}-01-01` } }
      });
    }

    if (criteria.newerThanYears) {
      const cutoffYear = currentYear - criteria.newerThanYears;
      clauses.push({
        range: { releaseDate: { gte: `${cutoffYear}-01-01` } }
      });
    }
  }

  private addTextQuery(clauses: any[], criteria: SearchCriteria): void {
    if (!criteria.textQuery?.trim()) return;

    const textQuery = criteria.textQuery.toLowerCase().trim();
    
    clauses.push({
      bool: {
        should: [
          { match_phrase: { title: { query: textQuery, boost: 10 } } },
          { prefix: { title: { value: textQuery, boost: 8 } } },
          { match_phrase: { description: { query: textQuery, boost: 7 } } },
          { prefix: { description: { value: textQuery, boost: 5 } } },
          { match_phrase: { cast: { query: textQuery, boost: 3 } } },
          { prefix: { cast: { value: textQuery, boost: 2 } } }
        ],
        minimum_should_match: 1
      }
    });
  }

  private addCastFilters(clauses: any[], criteria: SearchCriteria): void {
    if (!criteria.castNames?.length) return;

    criteria.castNames.forEach(name => {
      clauses.push({
        match: {
          cast: {
            query: name,
            boost: 2,
            fuzziness: 'AUTO'
          }
        }
      });
    });
  }

  private getSearchSort(): any[] {
    return [
      { _score: { order: 'desc' } },
      { averageRating: { order: 'desc' } },
      { ratingCount: { order: 'desc' } }
    ];
  }

  private getTopRatedSort(): any[] {
    return [
      { averageRating: { order: 'desc' } },
      { ratingCount: { order: 'desc' } }
    ];
  }
}
