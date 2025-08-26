import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QueueService } from './queue.repository';

@Injectable()
export class BullQueueService implements QueueService {
  private readonly logger = new Logger(BullQueueService.name);

  constructor(
    @InjectQueue('rating-writes') private readonly writeQueue: Queue,
    @InjectQueue('rating-stats') private readonly statsQueue: Queue,
  ) {}

  async addJobWithOptions<T>(
    queueName: string, 
    jobName: string, 
    jobData: T, 
    options?: {
      delay?: number;
      attempts?: number;
      priority?: number;
      removeOnComplete?: number;
      removeOnFail?: number;
    }
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    
    await queue.add(jobName, jobData, {
      delay: options?.delay,
      attempts: options?.attempts || 3,
      priority: options?.priority || 0,
      removeOnComplete: options?.removeOnComplete || 100,
      removeOnFail: options?.removeOnFail || 50,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  private getQueue(queueName: string): Queue {
    switch (queueName) {
      case 'rating-writes':
        return this.writeQueue;
      case 'rating-stats':
        return this.statsQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
}