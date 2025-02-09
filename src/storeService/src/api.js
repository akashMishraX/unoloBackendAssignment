import express from "express";
import ApiResponse from "./util/apiResponse.js";
import { addJob, workerfunc } from "./db/dbFuctions.js";
import { serverAdapter } from './bullmq/bullMqDashboard.js';
     

export default function apis(app) {

    //Middleware
    app.use('/admin/queues', serverAdapter.getRouter());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));


    // Health check
    app.get("/", (req, res) => {
        const response = ApiResponse.success();
        res.send(response);
    })

    // Get all job
    app.get("/jobs",  (req, res) => {
        const jobs = {
            "jobs":[
                {"jobId": "1","status": "PENDING"},
                {"jobId": "2","status": "COMPLETED"},
                {"jobId": "3","status": "PENDING"}
            ]
        }
        const response = ApiResponse
        .success(jobs)
        .setStatusCode(ApiResponse.STATUS_SUCCESS);

        res.send(response);
    })

    // submit jobs 
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
    // Get jobs status
    app.get("/job/:jobId",async (req, res) => {
        try {
            const jobId = req.params.jobId;


            const jobData = await Promise.resolve({
                "jobId": jobId,
                "status": "COMPLETED"
            });


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

    // cancel jobs
    app.delete("/job/:jobId", (req, res) => {
        try {
            const jobId = req.params.jobId;

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

    // list pending jobs
    app.get("/jobs/pending", async (req, res) => {
        try {
            const jobsPending = await Promise.resolve([
                {
                    "jobId": "1",
                    "job_name":"Send an email to admin",
                    "is_recurring": false,
                    "job_frequency":"PT12H",
                    "status": "PENDING"
                },
                {
                    "jobId": "2",
                    "job_name":"Send an email to user",
                    "is_recurring": true,
                    "job_frequency":"PT24H",
                    "status": "PENDING"
                }
            ])

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobsPending);
            res.send(response);
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });

    //Get all running jobs on workers
    app.get("/jobs/executing", async  (req, res) => {    
        try {
            const jobsExecuting = await Promise.resolve([
                {
                    "jobId": "3",
                    "job_name":"Send an email to CEO",
                    "is_recurring": true,
                    "job_frequency":"PT24H",
                    "status": "EXECUTING"
                },
                {
                    "jobId": "4",
                    "job_name":"Send an email to developers",
                    "is_recurring": true,
                    "job_frequency":"PT24H",
                    "status": "EXECUTING"
                }
            ])

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobsExecuting);
            res.send(response);
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });

    app.get("/jobs/failed", async (req, res) => {
        try {
            const jobsFailed = await Promise.resolve([
                {
                    "jobId": "10",
                    "job_name":"Send an email to STACKHOLDERS",
                    "is_recurring": true,
                    "job_frequency":"PT24H",
                    "status": "FAILED"
                },
            ])

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobsFailed);
            res.send(response);
        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });
    
   app.get("/job/:jobId/logs", async (req, res) => {
        try {
            const jobId = req.params.jobId;
            const jobsLogs = await Promise.resolve([
                {
                    "jobId": jobId,
                    "logs": "Job logs"
                }
            ])

            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData(jobsLogs);
            res.send(response);

        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });
    app.post("/job/retry/:jobId", async (req, res) => {
        try {
            const jobId = req.params.jobId;
            
            
            const response = ApiResponse
            .success()
            .setStatusCode(ApiResponse.STATUS_SUCCESS)
            .setData('Job retried successfully');

            setTimeout(() => {
                res.send(response);
            },3*1000);

        } catch (error) {
            const response = ApiResponse
            .serverError()
            .setError(error);
            res.send(response);
        }
    });
    
}