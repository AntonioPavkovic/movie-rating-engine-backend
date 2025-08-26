import { CachePipeline } from "./cache-pipeline.repository";

export interface CacheRepository {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  increment(key: string, value?: number): Promise<number>;
  exists(key: string): Promise<boolean>;
  incrbyfloat(key: string, value: number): Promise<number>;
  pipeline(): CachePipeline;
  hset(key: string, field: string, value: any): Promise<void>;
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, string>>;
  llen(key: string): Promise<number>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  lpush(key: string, value: string): Promise<number>;
  lrem(key: string, count: number, value: string): Promise<number>;
}