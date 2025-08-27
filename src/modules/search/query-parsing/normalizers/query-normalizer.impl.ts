import { Injectable } from "@nestjs/common";
import { QueryNormalizer } from "./query-normalizer.interface";

@Injectable()
export class QueryNormalizerImpl implements QueryNormalizer {
  normalize(query: string): string {
    return query
      .toLowerCase()
      .replace(/\bthen\b/g, 'than')
      .replace(/\bthand\b/g, 'than')
      .replace(/\bthna\b/g, 'than')
      .replace(/\btha\b(?!\w)/g, 'than')
      .replace(/\bs\s+stars?\b/g, 'stars')
      .replace(/\bstars?\s+s\b/g, 'stars')
      .replace(/\bstar\b/g, 'stars')
      .replace(/\bstrs?\b/g, 'stars')
      .replace(/\s+/g, ' ')
      .trim();
  }
}