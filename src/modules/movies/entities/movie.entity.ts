import { BaseEntity } from "src/shared/entities/base.entity";
import { ContentType } from "../enums/content-type.enum";
import { CastMember } from "./cast-member.value-object";

export interface Movie extends BaseEntity {
  title: string;
  description?: string;
  releaseDate: Date;
  coverImage?: string;
  type: ContentType;
  averageRating?: number;
  totalRatings: number;
  cast: CastMember[];
}