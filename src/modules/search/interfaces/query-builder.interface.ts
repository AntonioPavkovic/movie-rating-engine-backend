import { ContentType } from "src/modules/movies/enums/content-type.enum";
import { SearchCriteria } from "./search.interface";

export interface QueryBuilder {
  buildSearchQuery(criteria: SearchCriteria, type?: ContentType): any;
  buildTopRatedQuery(type?: ContentType): any;
}