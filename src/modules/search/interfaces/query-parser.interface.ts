import { SearchCriteria } from "./search.interface";

export interface QueryParser {
  parse(query: string): SearchCriteria;
}