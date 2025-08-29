import { Injectable, Logger } from "@nestjs/common";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { CachePipeline } from "./cache-pipeline.repository";
import { CacheRepository } from "./cache.repository";

@Injectable()
export class RedisCacheRepository implements CacheRepository {
  private readonly logger = new Logger(RedisCacheRepository.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, serializedValue);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      this.logger.error(`Cache EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error);
    }
  }

  async increment(key: string, value = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, value);
    } catch (error) {
      this.logger.error(`Cache INCREMENT error for key ${key}:`, error);
      return 0;
    }
  }

  async incrbyfloat(key: string, value: number): Promise<number> {
    try {
      const result = await this.redis.incrbyfloat(key, value);
      return parseFloat(result);
    } catch (error) {
      this.logger.error(`Cache INCRBYFLOAT error for key ${key}:`, error);
      return 0;
    }
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.hset(key, field, stringValue);
    } catch (error) {
      this.logger.error(`Cache HSET error for key ${key}:`, error);
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.redis.hget(key, field);
    } catch (error) {
      this.logger.error(`Cache HGET error for key ${key}:`, error);
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(key);
    } catch (error) {
      this.logger.error(`Cache HGETALL error for key ${key}:`, error);
      return {};
    }
  }

  async llen(key: string): Promise<number> {
    try {
      return await this.redis.llen(key);
    } catch (error) {
      this.logger.error(`Cache LLEN error for key ${key}:`, error);
      return 0;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.lrange(key, start, stop);
    } catch (error) {
      this.logger.error(`Cache LRANGE error for key ${key}:`, error);
      return [];
    }
  }

  async lpush(key: string, value: string): Promise<number> {
    try {
      return await this.redis.lpush(key, value);
    } catch (error) {
      this.logger.error(`Cache LPUSH error for key ${key}:`, error);
      return 0;
    }
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    try {
      return await this.redis.lrem(key, count, value);
    } catch (error) {
      this.logger.error(`Cache LREM error for key ${key}:`, error);
      return 0;
    }
  }

  pipeline(): CachePipeline {
    const redisPipeline = this.redis.pipeline();
    
    return {
      hset: (key: string, field: string | Record<string, any>, value?: any) => {
        if (typeof field === 'string') {

          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          redisPipeline.hset(key, field, stringValue);
        } else {
          const stringFields: Record<string, string> = {};
          Object.entries(field).forEach(([k, v]) => {
            stringFields[k] = typeof v === 'string' ? v : JSON.stringify(v);
          });
          redisPipeline.hset(key, stringFields);
        }
      },
      setex: (key: string, seconds: number, value: string) => {
        redisPipeline.setex(key, seconds, value);
      },
      lpush: (key: string, value: string) => {
        redisPipeline.lpush(key, value);
      },
      incrbyfloat: (key: string, value: number) => {
        redisPipeline.incrbyfloat(key, value);
      },
      incr: (key: string) => {
        redisPipeline.incr(key);
      },
      lrem: (key: string, count: number, value: string) => {
        redisPipeline.lrem(key, count, value);
      },
      del: (key: string) => {
        redisPipeline.del(key);
      },
      exec: async () => {
        const result = await redisPipeline.exec();
        return result || [];
      }
    };
  }
}
