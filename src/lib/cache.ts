// lib/cache.ts
import { Redis } from "ioredis";

// Create Redis client with fallback for development
const getRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          console.log("Redis connection failed, using in-memory cache");
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    client.on("error", (err) => {
      console.error("Redis error:", err);
    });

    return client;
  } catch (error) {
    console.log("Redis not available, using in-memory cache");
    return null;
  }
};

// In-memory cache fallback for development without Redis
class InMemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return JSON.stringify(item.value);
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<"OK"> {
    const expiry = duration ? Date.now() + (duration * 1000) : Date.now() + 3600000;
    this.cache.set(key, { value: JSON.parse(value), expiry });
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.cache.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  async flushdb(): Promise<"OK"> {
    this.cache.clear();
    return "OK";
  }
}

// Cache wrapper that handles both Redis and in-memory
class CacheService {
  private client: Redis | null;
  private memCache: InMemoryCache;
  private isRedisAvailable: boolean = false;

  constructor() {
    this.client = getRedisClient();
    this.memCache = new InMemoryCache();
    
    // Test Redis connection
    if (this.client) {
      this.client.ping().then(() => {
        this.isRedisAvailable = true;
        console.log("✅ Redis cache connected");
      }).catch(() => {
        this.isRedisAvailable = false;
        console.log("⚠️ Using in-memory cache (Redis unavailable)");
      });
    }
  }

  private getActiveClient() {
    return this.isRedisAvailable && this.client ? this.client : this.memCache;
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const client = this.getActiveClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(
    key: string,
    value: any,
    ttlSeconds: number = 300 // 5 minutes default
  ): Promise<boolean> {
    try {
      const client = this.getActiveClient();
      const serialized = JSON.stringify(value);
      
      if (client instanceof Redis) {
        await client.set(key, serialized, "EX", ttlSeconds);
      } else {
        await client.set(key, serialized, "EX", ttlSeconds);
      }
      
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      const client = this.getActiveClient();
      const keys = Array.isArray(key) ? key : [key];
      
      if (client instanceof Redis) {
        return await client.del(...keys);
      } else {
        let deleted = 0;
        for (const k of keys) {
          deleted += await client.del(k);
        }
        return deleted;
      }
    } catch (error) {
      console.error(`Cache delete error:`, error);
      return 0;
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = this.getActiveClient();
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      return await this.del(keys);
    } catch (error) {
      console.error(`Cache invalidate pattern error:`, error);
      return 0;
    }
  }

  async flush(): Promise<void> {
    try {
      const client = this.getActiveClient();
      await client.flushdb();
    } catch (error) {
      console.error(`Cache flush error:`, error);
    }
  }

  // Generate cache key with namespace
  key(namespace: string, ...parts: (string | number)[]): string {
    return `${namespace}:${parts.join(":")}`;
  }

  // Cache wrapper for functions
  async remember<T>(
    key: string,
    ttlSeconds: number,
    callback: () => Promise<T>
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      console.log(`Cache hit: ${key}`);
      return cached;
    }

    // If not in cache, execute callback
    console.log(`Cache miss: ${key}`);
    const result = await callback();
    
    // Store in cache
    await this.set(key, result, ttlSeconds);
    
    return result;
  }

  // Invalidate related caches
  async invalidateUserCaches(userId: string, organizationId: string): Promise<void> {
    const patterns = [
      `tasks:${organizationId}:${userId}:*`,
      `stats:${organizationId}:${userId}:*`,
      `boards:${organizationId}:${userId}:*`,
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  // Get cache status
  getStatus(): { type: string; available: boolean } {
    return {
      type: this.isRedisAvailable ? "redis" : "memory",
      available: true,
    };
  }
}

// Export singleton instance
export const cache = new CacheService();

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  VERY_SHORT: 30,     // 30 seconds
  SHORT: 60,          // 1 minute
  MEDIUM: 300,        // 5 minutes
  LONG: 900,          // 15 minutes
  VERY_LONG: 3600,    // 1 hour
  DAY: 86400,         // 1 day
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  DAILY_TASKS: "tasks",
  USER_STATS: "stats",
  BOARDS: "boards",
  TIME_ENTRIES: "time",
  COMPANIES: "companies",
} as const;