import { v4 as uuidv4 } from 'uuid';
import {Types} from 'job-schedule-utils-akashmishrax1';
import {unixTimestamp} from 'job-schedule-utils-akashmishrax1';
import PrismaClientSingleton from '../util/prismaClient.js';


export async function addJob(data) {
    try {
        if(!data) {
            throw new Error('Invalid data');
        }

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




async function addJobTrigger(jobs) {
    try {
        return await PrismaClientSingleton.getInstance().$transaction(async (tx) => {
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
    
            const schedule = await tx.jobSchedule.create({
                data: {
                    job_id: jobs.job_id,
                    next_execution_time: unixTimestamp.convertToUnixTimestamp(jobs.interval)
                }
            });

            return { job, schedule };
        });
    } catch (error) {
        console.error('Error in adding job trigger:', error);
        throw error;
    }
}


// Clean up function for production environments
process.on('beforeExit', async () => {
    await PrismaClientSingleton.getInstance().$disconnect();
});
