import { v4 as uuidv4 } from 'uuid';
import {Types} from 'job-schedule-utils-akashmishrax1';
import {unixTimestamp} from 'job-schedule-utils-akashmishrax1';
import PrismaClientSingleton from '../util/prismaClient.js';
import { logger, logToDatabase } from '../util/log.js';

export async function addJob(data) {
    try {
        if(!data) {
            throw new Error('Invalid data');
        }
        console.log(data)
        if(!Types.getJobTypes()[data.jobType]) {
            throw new Error('Invalid job type');
        }
        
        const jobs = {
            "job_id" : uuidv4(),
            "job_type": data.jobType,
            "user_id": data.userId,
            "job_name": data.jobName,
            "payload": data.payload,
            "interval": data.interval,
            "is_recurring": data.isRecurring,
            "created_time": new Date().toISOString(),
        }
        console.log(jobs)

        await addJobTrigger(jobs)

        return {
            success: true,
            message: 'Job added successfully'
        }
        
    } catch (error) {
        return {
            success: false,
            message: error.message
        }
    }
}

async function addJobTrigger(jobs) {
    try {
        await PrismaClientSingleton.getInstance().$transaction(async (tx) => {
            await logToDatabase(jobs.job_id, 'INFO', 'Job started to be added');
            const job = await tx.job.create({
                data: {
                    job_id: jobs.job_id,
                    job_type: jobs.job_type,
                    user_id: jobs.user_id,
                    job_name: jobs.job_name,
                    payload: jobs.payload,
                    interval: jobs.interval,
                    is_recurring: jobs.is_recurring,
                    created_time: jobs.created_time
                }
            });
            await logToDatabase(jobs.job_id, 'INFO', 'Job added');
            await logToDatabase(jobs.job_id, 'INFO', 'Job Schedule started to be added');
            const schedule = await tx.jobSchedule.create({
                data: {
                    job_id: jobs.job_id,
                    next_execution_time: unixTimestamp.convertToUnixTimestamp(jobs.interval)
                }
            });
            await logToDatabase(jobs.job_id, 'INFO', 'Job Schedule added');

            return { job, schedule };
        });
    } catch (error) {
        console.error('Error in adding job trigger:', error);
    }
}

export async function getAllJobs() {
    try {
        return await PrismaClientSingleton.getInstance().job.findMany();
    } catch (error) {
        console.error('Error in getting all jobs:', error);
    }
}

export async function getJob(userId) {
    try {
        return await PrismaClientSingleton.getInstance().job.findMany({
            where: {
                user_id: userId
            }
        });
    } catch (error) {
        console.error('Error in getting job:', error);
    }
}

export async function listJobByStatus(Status) {
    try {
        const allJobs = await PrismaClientSingleton.getInstance().jobExecutionHistory.findMany({
            where: {
                status: Status
            }
        });
        const jobDetails = await PrismaClientSingleton.getInstance().job.findMany({
            where: {
                job_id: {
                    in: allJobs.map(job => job.job_id)
                }
            }
        })
        const list = []
        allJobs.map(job => {
            jobDetails.map(jobDetail => {
                if(job.job_id == jobDetail.job_id) {
                    list.push({
                        'about': jobDetail,
                        'history': job
                    });
                }
            })
        })
        return list;
       
    } catch (error) {
        console.error('Error in getting job by status:', error);
    }
}

export async function retryAJob(jobId) {
    try {
        await PrismaClientSingleton.getInstance().jobSchedule.update({
            where: {
                job_id: jobId
            },
            data: {
                next_execution_time: unixTimestamp.convertToUnixTimestamp('PT5M')
            }
        });
        return {
            success: true,
            message: "Job will succeed in 5 minutes"
        }
    }
    catch (error) {
        console.error('Error in retrying a job:', error);
        return {
            success: false,
            message: error.message
        }
    }
}

export async function deleteJob(jobId) {
    try {
        if(!jobId) {
            throw new Error('Invalid job id');
        }

        await PrismaClientSingleton.getInstance().$transaction(async (tx) => {
            
            await tx.jobExecutionHistory.deleteMany({
                where: {
                    job_id: jobId
                }
            })
            await tx.jobSchedule.delete({
                where: {
                    job_id: jobId
                }
            })
            await tx.job.delete({
                where: {
                    job_id: jobId
                }
            })
        })
        return {
            success: true,
            message: "Job cancelled successfully"
        }
    }
    catch (error) {
        console.error('Error in canceling a job:', error);
        return {
            success: false,
            message: error.message
        }
    }
}

// Job logs
export async function getlog(jobId) {
    try {
        logger.info('Fetching job execution history...');
        const jobs = await PrismaClientSingleton.getInstance().jobLog.findMany({
            where: {
                jobId
            }
        })

        logger.info(`Retrieved ${jobs.length} jobs`);
        return {
            success: true,
            message: jobs
        };

    } catch (error) {
        console.error('Error in getting job logs:', error);
        return {
            success: false,
            message: error.message
        }
    }
}
export async function getlogs(data) {
    try {
        logger.info('Fetching job execution history...');
        const jobs = await PrismaClientSingleton.getInstance().jobLog.findMany();
        logger.info(`Retrieved ${jobs.length} jobs`);
        return {
            success: true,
            message: jobs
        };
    } catch (error) {
        console.error('Error in getting job logs:', error);
        return {
            success: false,
            message: error.message
        }
    }
}

// Worker
export async function getWorkers() {
    try {
        return await PrismaClientSingleton.getInstance().worker.findMany();
    } catch (error) {
        console.error('Error in getting workers:', error);
    }
}
export async function workerfunc(instanceId, region, status, type, capacity) {
    try {
        if (!instanceId) {
            throw new Error("instanceId is required");
        }

        // Validate status
        const validStatuses = Types.getWorkerStatus();
        if (status && !validStatuses[status]) {
            throw new Error("Invalid worker status");
        }

        // Validate type
        const validTypes = Types.getWorkerTypes();
        if (type && !validTypes[type]) {
            throw new Error("Invalid worker type");
        }
        // Assign default values
        let validRegion = region;
        let validType = type;
        let validCapacity = capacity;
        const worker_info = await PrismaClientSingleton.getInstance().worker.findUnique({
            where: { instanceId }
        })
        if(worker_info != null) {
            validRegion = worker_info.region
            validType = worker_info.type
            validCapacity = worker_info.capacity
        }

        console.log("Worker Info:", instanceId, validRegion, status, validType, validCapacity);
        const oldWorker = await PrismaClientSingleton.getInstance().worker.findUnique({
            where: { instanceId }
        })
        let isUpdate = false
        // I am adding instance id to log but will have replace to worker id
        if(oldWorker){
            await logToDatabase(instanceId, 'INFO', 'Worker is to be updated');
            isUpdate = true
        }else{
            await logToDatabase(instanceId, 'INFO', 'Worker is to be added');
        }
        const worker = await PrismaClientSingleton.getInstance().worker.upsert({
            where: { instanceId },
            update: { 
                status, 
                lastHeartbeat: new Date()
            },
            create: { 
                instanceId, 
                region: validRegion, 
                status, 
                lastHeartbeat: new Date(),
                type: validType,
                capacity: validCapacity 
            },
        });
        if(isUpdate){
            await logToDatabase(instanceId, 'INFO', 'Worker updated');
        }else{
            await logToDatabase(instanceId, 'INFO', 'Worker added');
        }

        return {
            success: true,
            data: worker,
            message: "Worker added successfully"
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}
export async function deleteWorker(instanceId){
    try {
        await PrismaClientSingleton.getInstance().worker.delete({
            where: { instanceId }
        });
        return {
            success: true,
            message: "Worker deleted successfully"
        };
    } catch (error) {
        console.error('Error in deleting workers:', error);
        return {
            success: false,
            message: error.message
        }
    }
}

// Zookeeper
export async function getZookeeper() {}
export async function zookeeperFunc(hostname ,ipAddress, status) {}
export async function deleteZookeeper(hostname,ipAddress){}

// Clean up function for production environments
process.on('beforeExit', async () => {
    await PrismaClientSingleton.getInstance().$disconnect();
});
