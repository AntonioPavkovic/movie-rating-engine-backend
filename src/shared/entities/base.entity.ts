export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseEntityWithoutUpdate {
  id: string;
  createdAt: Date;
}