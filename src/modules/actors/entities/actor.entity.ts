import { BaseEntity } from "src/shared/entities/base.entity";

export interface Actor extends BaseEntity {
  name: string;
  bio?: string;
  image?: string;
}