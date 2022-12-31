import { redisClient } from "starless-redis";

export default async function connectRedis() {
  await redisClient.connect({
    url: process.env.redis_url,
  });
}
