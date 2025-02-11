import express from "express";
import ApiResponse from "./util/apiResponse.js";
import { addJob, workerfunc ,getAllJobs, getJob, listJobByStatus,retryAJob ,getWorkers,deleteJob, getlog ,getlogs, deleteWorker} from "./db/dbFuctions.js";
import { serverAdapter } from './bullmq/bullMqDashboard.js';
import swagger from "./swagger.js";
import swaggerUi from "swagger-ui-express";


const swaggerDocument = swagger();
export default function apis(app) {

    //Middleware
    app.use('/admin/queues', serverAdapter.getRouter());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));


    // Serve Swagger UI at `/docs`
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));


    // Health check [YES]
    app.get("/", (req, res) => {
        res.json({
            success: true,
            message: "API is running",
        })
    });
    //JOBS [YES]
    // Get all job
    app.get("/jobs",async  (req, res) => {
        const jobs = await getAllJobs();
        const response = ApiResponse
        .success(jobs)
        .setStatusCode(ApiResponse.STATUS_SUCCESS);

        res.send(response);
    })

    // submit jobs  [YES]
    app.post("/job",async (req, res) => {
        try {
            const { userId, jobName,jobType , payload, interval, isRecurring } = req.body;
            if(!payload || !jobName || !jobType || !userId || !interval) {
                const response = ApiResponse
                .validationError().
                setError('Missing required fields');

                return res.send(response);
            }
            console.log(jobType)
            switch (jobType) {
                case 'EMAIL':
                    if(
                        !payload['data']['sender'] ||
                        !payload['data']['password'] ||
                        !payload['data']['recipient'] ||
                        !payload['data']['subject'] ||
                        !payload['data']['message']
                    ){
                        const response = ApiResponse
                        .validationError().
                        setError('Invalid email payload');
                        return res.send(response);
                    }
                    break;
                case 'NOTIFICATION':
                    break;
                case 'CODE':
                    if(
                        !payload['data']['codefile'] ||
                        !payload['data']['yamlfile']
                    ){
                        const response = ApiResponse
                        .validationError().
                        setError('Invalid code payload');
                        return res.send(response);
                    }
                    break;
                default:
                    
            }
            const jobData = {
                userId: userId,
                jobName: jobName,
                payload: payload['data'],
                interval: interval,
                isRecurring: isRecurring,
                jobType: jobType
            };
            const job = await addJob(jobData);
            if(!job.success) throw new Error(job.message);



            const response = ApiResponse
            .success()
            .setData('Job added successfully')
            res.send(response);
            
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error.message)

            res.send(response);
        }
        
    });

    // delete jobs [YES]
    app.delete("/job/:jobId",async (req, res) => {
        try {
            const jobId = req.params.jobId;
            await deleteJob(jobId);

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData('Job cancelled successfully');
            res.send(response);


        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });

    // Get jobs by userId [YES]
    app.get("/job/:userId",async (req, res) => {
        try {
            const userId = req.params.userId;
            const jobData = await getJob(userId);
            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobData);
            res.send(response);
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });


    // list jobs by status [YES]
    app.get("/status/jobs", async (req, res) => {
        try {
            let status = req.query.status;
            status = status.toUpperCase().trim();
            const jobs = await listJobByStatus(status);

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobs);
            res.send(response);
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error.message);
            res.send(response);
        }
    });
    
    // Get job logs [YES]
    app.get("/logs/jobs", async (req, res) => {
        try {
            let jobsLogs =await  getlogs()
            if(!jobsLogs.success) throw new Error(jobsLogs.message);

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobsLogs.message);
            res.send(response);

        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error.message);
            res.send(response);
        }
    });


    // Get job log by jobId [YES]
    app.get("/logs/job", async (req, res) => {
        try {
            const jobId = req.body.jobId;
            if(!jobId) {
                throw new Error('Missing required fields');
            }
            let jobsLogs = await getlog(jobId);
            if(!jobsLogs.success) throw new Error(jobsLogs.message);
            

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobsLogs.message);
            res.send(response);

        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error.message);
            res.send(response);
        }
    });

    // // Retry a job
    // app.post("/job/retry/:jobId", async (req, res) => {
    //     try {
    //         const jobId = req.params.jobId;
            
    //         const result = await retryAJob(jobId);
    //         if(result.success === false) throw new Error(result.message);
            
    //         const response = ApiResponse
    //         .success()
    //         .setStatusCode(ApiResponse.STATUS_SUCCESS)
    //         .setData(result.message);

    //         setTimeout(() => {
    //             res.send(response);
    //         },3*1000);

    //     } catch (error) {
    //         const response = ApiResponse
    //         .serverError()
    //         .setError(error);
    //         res.send(response);
    //     }
    // });
    

    // WORKERS
    app.get("/workers",async (req, res) => {
        try {
            const workers = await getWorkers();
            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(workers);
            res.send(response);
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });

    app.post("/worker",async (req, res) => {
        try {
            const { instanceId ,region, status , type , capacity } = req.body;

            if(!instanceId || !region || !status || !type || !capacity) {
                const response = ApiResponse
                .validationError().
                setError('Missing required fields');

                return res.send(response);
            }

            const result = await workerfunc(
                instanceId,
                region,
                status,
                type,
                capacity
            )

            if(result.success === false) throw new Error(result.message);

            const response = ApiResponse
            .success()
            .setData('Worker added successfully')
            res.send(response);
            
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error.message)

            res.send(response);
        }
        
    });

    app.put("/worker",async (req, res) => {
        try {
            const { instanceId ,status } = req.body;

            if(!instanceId || !status) {
                const response = ApiResponse
                .validationError().
                setError('Missing required fields');                
                return res.send(response);            
            }
            console.log(instanceId,status)
            
            const result = await workerfunc(
                instanceId,
                '',
                status,
                '',
                ''
            )

            if(result.success === false) throw new Error(result.message);

            const response = ApiResponse
            .success()
            .setData('Worker updated successfully')
            res.send(response);
            
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error.message)

            res.send(response);
        }
    });   
    
    app.delete("/worker/:instanceId",async (req, res) => {
        try {
            const instanceId = req.params.instanceId;
            if(instanceId == null) {
                throw new Error('instanceId is required');
            }
            const result = await deleteWorker(instanceId);
            if(result.success === false) throw new Error(result.message);

            const response = ApiResponse
            .success()
            .setData('Worker deleted successfully')
            res.send(response);
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error.message)
            res.send(response);
        }
    })

    // Zookeeper
    app.get("/zookeeper",async (req, res) => {})
    app.post("/zookeeper",async (req, res) => {})
    app.put("/zookeeper",async (req, res) => {})
    app.delete("/zookeeper",async (req, res) => {})
}