import configuration from "./config.js";
import { Queue, Worker } from 'bullmq';

const config = configuration();

export default class BullMqClient {
    static queueInstance = null;
    static workerInstance = null;

    static async getQueueInstance() {
        if (!BullMqClient.queueInstance) {
            BullMqClient.queueInstance = new Queue('job-queue', {
                connection: {
                    host: config.redis.host,
                    port: config.redis.port,
                },
                defaultJobOptions: {
                    removeOnComplete: true,
                    backoff: { type: 'exponential', delay: 1000 },
                    removeOnFail: { count: 5 },
                    attempts: 5
                },
            });

            console.log("BullMQ Queue initialized");
        }
        return BullMqClient.queueInstance;
    }

    static async getWorkerInstance(jobProcessor) {
        if (!BullMqClient.workerInstance) {
            if (typeof jobProcessor !== "function") {
                throw new Error("jobProcessor must be a function");
            }

            BullMqClient.workerInstance = new Worker('job-queue', async (job) => {
                try {
                    await jobProcessor(job); // Call the provided function
                } catch (error) {
                    console.error('Error processing job:', error);
                }
            }, {
                connection: {
                    host: config.redis.host,
                    port: config.redis.port,
                },
            });

            console.log("BullMQ Worker initialized");
        }
        return BullMqClient.workerInstance;
    }
}
