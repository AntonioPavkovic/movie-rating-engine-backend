export interface QueueService {
  addJobWithOptions<T>(queueName: string, jobName: string, jobData: T, options?: {
    delay?: number;
    attempts?: number;
    priority?: number;
    removeOnComplete?: number;
    removeOnFail?: number;
  }): Promise<void>;
}