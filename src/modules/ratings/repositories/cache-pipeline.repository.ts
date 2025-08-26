export interface CachePipeline {
  hset(key: string, field: string | Record<string, any>, value?: any): void;
  setex(key: string, seconds: number, value: string): void;
  lpush(key: string, value: string): void;
  incrbyfloat(key: string, value: number): void;
  incr(key: string): void;
  lrem(key: string, count: number, value: string): void;
  del(key: string): void;
  exec(): Promise<Array<[Error | null, any]>>;
}
