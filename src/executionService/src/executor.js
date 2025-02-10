import { v4 as uuidv4 } from 'uuid';
import zookeeper from 'node-zookeeper-client';
import PrismaClientSingleton from './util/prismaClient.js';
import BullMqClient from './util/bullMqClient.js'
import EmailService from './services/email/index.js';
import os from 'os';


const hostname = os.hostname();

export default class ExecutorService {
    constructor(config) {
        this.nodeId = uuidv4();
        this.isLeader = false;
        this.isSingleInstance = false;
        this.config = config;
        this.zkPath = '/executor';
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
        this.mq = await BullMqClient.getWorkerInstance((job) => this.processJob(job));
        this.mq.on('error', (error) => {
            console.error('BullMQ error:', error);
        });
    }
      // Add this to your DistributedScheduler class
    async start() {
        try {
            console.log('Starting executor...');
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
            console.log('Executor started.');
        } catch (error) {
            console.error('Failed to start executor:', error);
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
            await this.processJob();
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




    async processJob(job) {
        if (!job || !job.data) {
            console.warn("⚠️ No job received. The queue might be empty.");
            return; // Just return instead of throwing an error
        }
        const workers = await this.db.worker.findMany({
            where: {
                type: 'EXECUTOR',
                status: 'IDLE'
            }
        });
        
        // if (workers.length === 0) {
        //     console.warn("⚠️ No idle workers available. The queue might be empty.");
        //     return;
        // }
        const { jobId, jobType, payload } = job.data;
    
        await this.updateJobStatus(jobId, 'RUNNING');
    
        try {
            switch (jobType) {
                case 'EMAIL':
                    await this.processEmailJob(payload);
                    break;
                case 'NOTIFICATION':
                    await this.processNotificationJob(payload);
                    break;
                default:
                    throw new Error(`Unknown job type: ${jobType}`);
            }
    
            await this.updateJobStatus(jobId, 'COMPLETED');
            console.log(`✅ Job ${jobId} completed successfully`);
        } catch (error) {
            console.error(`❌ Error processing job ${jobId}:`, error);
            await this.updateJobStatus(jobId, 'FAILED', error.message);
        }
    }
        
        
        

    async updateJobStatus(jobId, status, errorMessage = null) {
        await this.db.$connect();
        try {
            await this.db.jobExecutionHistory.updateMany({
                where: {
                    job_id: jobId,
                    status: {
                        notIn: ['COMPLETED', 'FAILED','CANCELLED','PENDING']
                    }
                },
                data: {
                    status,
                    error_message: errorMessage,
                    last_update_time: new Date()
                }
            });
        } finally {
            await this.db.$disconnect();
        }
    }
    // Example job type handlers
    async processEmailJob(payload) {
        // Implement email sending logic
        console.log('Starting email job processing:');
        const result = await EmailService.processEmail(payload);
        if (!result) {
            throw new Error('Failed to send email');
        }
        console.log('Email job processed.');
        // Add your email sending implementation
    }

    async processNotificationJob(payload) {
        // Implement notification logic
        console.log('Processing notification job:', payload);
        // Add your notification implementation
    }


}