import { v4 as uuidv4 } from 'uuid';
import zookeeper from 'node-zookeeper-client';
import {unixTimestamp} from 'job-schedule-utils-akashmishrax1';
import PrismaClientSingleton from './util/prismaClient.js';
import BullMqClient from './util/bullMqClient.js';
import { clearInterval } from 'timers';
import os from 'os';

const hostname = os.hostname();

export default class DistributedScheduler {
    constructor(config) {
        this.nodeId = uuidv4();
        this.isLeader = false;
        this.isSingleInstance = false;
        this.config = config;
        this.zkPath = '/scheduler';
        this.leaderPath = this.zkPath + '/leader';
        this.workerPath = this.zkPath + '/workers';

        this.zk = zookeeper.createClient(config.zookeeper.host, {
            sessionTimeout: 30000,
            spinDelay: 1000,
            retries: 10
        });

        this.db = PrismaClientSingleton.getInstance();
        this.intiilizeBullMq();
    }

    async intiilizeBullMq(){
        this.mq =await   BullMqClient.getQueueInstance();
        this.mq.on('error', (error) => {
            console.error('BullMQ error:', error);
        });
    }
    // Add this to your DistributedScheduler class
    async start() {
        try {
            console.log('Starting scheduler...');
            await this.initializeZookeeper();
            console.log(`Node ${this.nodeId} connected to Zookeeper`);
            
            // Add connection state logging
            this.zk.on('state', (state) => {
                console.log('Current Zookeeper state:', state);
            });
            
            // Add watch for disconnection
            this.zk.on('disconnected', () => {
                console.log('Disconnected from Zookeeper');
            });
            console.log('Scheduler started.');
        } catch (error) {
            console.error('Failed to start scheduler:', error);
        }
    }
    async initializeZookeeper() {
        return new Promise((resolve, reject) => {
            console.log('Connecting to Zookeeper...');
            
            // Set a connection timeout
            const connectionTimeout = setInterval(() => {
                console.warn('[WARN]:Zookeeper taking longer to connect...');
            }, 10000);
            
    
            this.zk.once('connected', async () => {
                try {
                    clearTimeout(connectionTimeout); // Clear the timeout
                    console.log('Connected to Zookeeper');
                    
                    // Ensure base paths exist
                    await this.createZkPath(this.zkPath);
                    await this.createZkPath(this.workerPath);
                    console.log('Zookeeper paths created');
                    
                    // Register this node
                    await this.registerNode();
                    console.log('Node registered');
                    
                    // Start leader election
                    await this.particpateInLeaderElection();
                    console.log('Leader election started');
                    
                    console.log('Zookeeper initialization completed');
                    resolve();
                } catch (error) {
                    console.error('Error during Zookeeper initialization:', error);
                    reject(error);
                }
            });
    
            this.zk.once('connected', () => {
                console.log('✅ Successfully connected to Zookeeper!');
            });
            
            this.zk.on('error', (err) => {
                console.error('❌ Zookeeper connection error:', err);
            });
            
            console.log('🔄 Connecting to Zookeeper...');
            this.zk.connect();
        });
    }
    async createZkPath(path){
        return new Promise((resolve, reject) => {
            console.log('Creating Zookeeper path:', path);
            this.zk.mkdirp(path,(error)=>{
                if(error && error.code !== zookeeper.Exception.NODE_EXISTS){
                    reject(error)
                }else{
                    resolve()
                }
            })
        })
    }

    async registerNode() {
        console.log('Registering node:', this.nodeId);
        const nodePath = this.workerPath + '/' + this.nodeId;
        const nodeData = JSON.stringify({
            startTime: new Date().toISOString(),
            host: hostname,
        });

        return new Promise((resolve, reject) => {
            this.zk.create(
                nodePath,
                Buffer.from(nodeData),
                zookeeper.CreateMode.EPHEMERAL,
                async (error) => {
                    if (error) reject(error);
                    else {
                        // Check if this is the only instance
                        await this.checkInstanceCount();
                        resolve();
                    }
                }
            );
        });
    }
    async checkInstanceCount() {
        return new Promise((resolve, reject) => {
            this.zk.getChildren(this.workerPath, null, (error, children) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                this.isSingleInstance = children.length === 1;
                console.log(`Instance count: ${children.length}, isSingleInstance: ${this.isSingleInstance}`);
                
                if (this.isSingleInstance) {
                    // If single instance, automatically become leader
                    this.becomeLeader();
                }
                resolve();
            });
        });
    }
    async particpateInLeaderElection() {
        if (this.isSingleInstance) {
            // If single instance, skip leader election
            return;
        }

        this.leaderData = JSON.stringify({
            nodeId: this.nodeId,
            timestamp: new Date().toISOString()
        });

        try {
            await new Promise((resolve, reject) => {
                this.zk.create(
                    this.leaderPath,
                    Buffer.from(this.leaderData),
                    zookeeper.CreateMode.EPHEMERAL,
                    (error) => {
                        if (error) {
                            if (error.code === zookeeper.Exception.NODE_EXISTS) {
                                this.watchLeader();
                                resolve();
                            } else {
                                reject(error);
                            }
                        } else {
                            this.becomeLeader();
                            resolve();
                        }
                    }
                );
            });
        } catch (error) {
            console.log('Error in leader election', error);
        }
    }


    async becomeLeader(){
        this.isLeader = true;
        console.log(`Node ${this.nodeId} became leader`);
        await this.startLeaderDuties();
    }

    watchLeader() {
        this.zk.getData(this.leaderPath, 
            (event) => { 
                if (event.type === zookeeper.Event.NODE_DELETED) {
                    this.particpateInLeaderElection();
                }
            },
            (error, data) => {
                if (error) {
                    console.error('Error watching leader:', error);
                }
            }
        );
    }
    
    
    async startLeaderDuties(){
        if(!this.isLeader)return;

        //Start job polling
        this.pollingInterval = setInterval(async ()=>{
            await this.checkAndQueueJobs();
        },60 * 1000);

        //Start worker monitoring
        await this.monitorWorkers();
    }

    async monitorWorkers() {
        const watcherWorker = async () => {
            this.zk.getChildren(
                this.workerPath,
                async (event) => {
                    if (event) {
                        // Update single instance status when worker count changes
                        await this.checkInstanceCount();
                        watcherWorker();
                    }
                },
                async (error, children) => {
                    if (error) {
                        console.log('Error in watching workers', error);
                        return;
                    } else {
                        await this.handleWorkerChanges(children);
                    }
                }
            );
        };
        watcherWorker();
    }

    // Handle job Scheduling to Queues
    async checkAndQueueJobs() {
        await this.db.$connect();
        try { 
            console.log('Checking and queueing jobs');
            const execution_time = unixTimestamp.getCurrentUnixTimestamp();
            
            const scheduledJobs = await this.db.jobSchedule.findMany({
                where: {
                    next_execution_time: {
                        lte: execution_time,
                        gte: execution_time - 60
                    }
                },
                include: {
                    job: true
                }
            });
    
            console.log('Jobs to be scheduled:', scheduledJobs);
    
            for (const scheduledJob of scheduledJobs) {
                try {
                    // First check if job is already scheduled or in progress
                    const existingExecution = await this.db.jobExecutionHistory.findFirst({
                        where: {
                            job_id: scheduledJob.job_id,
                            status: {
                                in: ['SCHEDULED','RUNNING','COMPLETED','FAILED','CANCELLED','PENDING']
                            }
                        }
                    });
    
                    if (existingExecution) {
                        console.log(`Job ${scheduledJob.job_id} is already ${existingExecution.status}. Skipping.`);
                        continue;
                    }
    
                    const workers = await this.db.worker.findMany({
                        where: {
                            type: 'SCHEDULER',
                            status: 'IDLE'
                        }
                    });
    
                    if (!workers.length) {
                        console.error('No active workers available');
                        continue;
                    }
    
                    const executionDateTime = new Date(execution_time * 1000);
                    const currentDateTime = new Date();
    
                    // Add job to queue first
                    await this.mq.add('job', {
                        jobId: scheduledJob.job_id,
                        jobType: scheduledJob.job.job_type,
                        payload: scheduledJob.job.payload,
                        interval: scheduledJob.job.interval,
                        isRecurring: scheduledJob.job.is_recurring
                    });
    
                    // Create execution record after successful queue addition
                    await this.db.jobExecutionHistory.upsert({
                        where: {
                            job_id_worker_id: {
                                job_id: scheduledJob.job_id,
                                worker_id: workers[0].worker_id
                            }
                        },
                        update: {
                            execution_time: executionDateTime,
                            last_update_time: currentDateTime,
                            status: 'SCHEDULED',
                            retry_count: 0
                        },
                        create: {
                            job_id: scheduledJob.job_id,
                            worker_id: workers[0].worker_id,
                            execution_time: executionDateTime,
                            last_update_time: currentDateTime,
                            status: 'SCHEDULED',
                            retry_count: 0
                        }
                    });
    
                    // Update next execution time for recurring jobs
                    if (scheduledJob.job.is_recurring) {
                        await this.db.jobSchedule.update({
                            where: {
                                job_id: scheduledJob.job_id
                            },
                            data: {
                                next_execution_time: unixTimestamp.convertToUnixTimestamp(scheduledJob.job.interval)
                            }
                        });
                    }
    
                } catch (jobError) {
                    console.error(`Error processing job ${scheduledJob.job_id}:`, jobError);
                    
                    const executionDateTime = new Date(execution_time * 1000);
                    const currentDateTime = new Date();
    
                    try {
                        await this.db.jobExecutionHistory.upsert({
                            where: {
                                job_id_worker_id: {
                                    job_id: scheduledJob.job_id,
                                    worker_id: this.nodeId
                                }
                            },
                            update: {
                                execution_time: executionDateTime,
                                last_update_time: currentDateTime,
                                status: 'FAILED',
                                retry_count: {
                                    increment: 1
                                }
                            },
                            create: {
                                job_id: scheduledJob.job_id,
                                worker_id: this.nodeId,
                                execution_time: executionDateTime,
                                last_update_time: currentDateTime,
                                status: 'FAILED',
                                retry_count: 0
                            }
                        });
                    } catch (recordError) {
                        console.error('Failed to update/create error record:', recordError);
                    }
                }
            }
        } catch (error) {
            console.error('Error in checkAndQueueJobs:', error);
            throw error;
        } finally {
            await this.db.$disconnect();
        }
    }

    // Handle worker changes
    async handleWorkerChanges(activeWorkers){
        if(!this.isLeader)return;

        await this.db.$connect();
        try {
            // Find and reassign jobs from failed workers
            const result = await this.db.jobExecutionHistory.findMany({
                where: {
                    worker_id: {
                        notIn: activeWorkers
                    },
                    status: 'DOWN'
                }
            })
            // update job execution history
            for (const job of result) {
                // get max retries
                const max_retries = await this.db.job.findUnique({
                    where: {
                        job_id: job.job_id
                    },
                    select: {
                        max_retries: true
                    }
                })
                // update job based on max retries
                if(job.retry_count >= max_retries.max_retries){
                    await this.db.jobExecutionHistory.update({
                        where: {
                            id: job.id
                        },
                        data: {
                            status: 'FAILED',
                            last_update_time: new Date().toISOString()
                        }
                    })
                    continue;
                }
                // update job if retries are less than max retries
                await this.db.jobExecutionHistory.update({
                    where: {
                        id: job.id
                    },
                    data: {
                        status: 'SCHEDULED',
                        last_update_time: new Date().toISOString(),
                        retry_count: job.retry_count + 1
                    }
                })
               
            }   
    
        } catch (error) {
            
        }
        finally{
            await this.db.$disconnect();
        }

    }
    // async updateConnectionString() {
    //     await this.db.$connect();
    //     try {
    //         const result = await this.db.worker.findMany({
    //             where: { type: 'SCHEDULER' }
    //         });
    //         console.log('Updating Zookeeper connectionString:', result);
    //         // Construct connection string dynamically
    //         this.config.zookeeper.connectionString = result
    //             .map(worker => `${worker.instanceId}`)
    //             .join(',');
    
    //         console.log('Updated Zookeeper connectionString:', this.config.zookeeper.connectionString);
    //     } catch (error) {
    //         console.error('Error updating Zookeeper connectionString:', error);
    //     } finally {
    //         await this.db.$disconnect();
    //     }
    // }
    // async setUpdatedConnectionStringInterval() {
    //     this.connectionStringInterval = setInterval(async () => {
    //         await this.updateConnectionString();
    //     }, 60 * 1000);
    // }
    async shutdown() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
      
        if (this.isLeader) {
            this.isLeader = false;
        }
    
        await this.mq.close();
        await this.db.$disconnect();
    
        return new Promise((resolve, reject) => {
            this.zk.close();
            resolve();
        });
    }
    

}
