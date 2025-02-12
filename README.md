# Job Scheduling System Documentation

## Table of Contents  
1. [Overview](#overview)  
2. [Development Setup](#development-setup)  
   - [Prerequisites](#prerequisites)  
   - [Steps to Run the System Locally](#steps-to-run-the-system-locally)  
3. [Architecture](#architecture)  
   - [Design Choices](#design-choices)  
   - [Trade-offs](#trade-offs)  
4. [API Documentation](#api-documentation)  
5. [Key Notes](#key-notes)  
6. [Monitoring and Logs](#monitoring-and-logs)  
7. [Notes](#notes)  

---
## Overview

This system is a distributed job scheduling and execution system designed to handle tasks efficiently. It uses **PostgreSQL** for persistent storage, **Redis** for job queue management, and **ZooKeeper** for leader election and coordination among services. The architecture includes the following key components:

- **Store Service**: Handles job creation and updates job statuses.
- **Scheduler Service**: Schedules jobs and pushes them to the queue.
- **Executor Service**: Fetches jobs from the queue and executes them.
- **ZooKeeper**: Manages leader election and ephemeral sequential nodes.
- **Redis**: Acts as a message queue for job management.
- **PostgreSQL**: Stores job metadata persistently.

---

## Development Setup

### Prerequisites
1. Install Docker and Docker Compose on your machine.
2. Ensure all required ports (e.g. 6379, 2181, 3000 etc.) are free to use.

### Steps to Run the System Locally

1. Clone the repository containing the `docker-compose.yaml` file.
2. Navigate to the directory containing the file.
3. Run the following command to start all services: `docker-compose up --build -d`

4. Verify that all containers are running using:`docker ps`

5. Access individual services via their respective ports (e.g., Store Service at port `3000`).

For Swagger Documentation : 
```http://localhost:3000/docs```

---

## Architecture
![system_deisgn](https://pplx-res.cloudinary.com/image/upload/v1739254528/user_uploads/TCnQqHevDZIZXzN/image.jpg)
### Design Choices
1. **Scalability**: The system is designed to **scale horizontally** with multiple workers for each service.
2. **Fault Tolerance**: ZooKeeper ensures **leader election** and avoids single points of failure.
3. **Separation of Concerns**: Each service has a **distinct responsibility** (e.g., scheduling, execution).
4. **Queue Management**: **Redis** is used for its high-speed in-memory data structure store.

### Trade-offs
- **Simplicity vs. Scalability**
  1. *Choice*: Modular design separates Store, Scheduler, and Executor services for scalability.
  2. *Trade-off*: Increased complexity in managing inter-service communication.

- **Latency vs. Consistency**
  1. *Choice*: Strong consistency across services for job states.
  2. *Trade-off*: If not managed properly may cause higher latency due to synchronization overhead.

- **Operational Overhead vs. Reliability**
  1. *Choice*: Multiple tools (Redis, PostgreSQL, ZooKeeper) enhance reliability.
  2. *Trade-off*: Increased operational complexity for deployment and maintenance.

---


## API Documentation

**Postman Collection**: [LINK](https://documenter.getpostman.com/view/29155906/2sAYX9nfwU). 

It provides detailed information on endpoints for:
1. Job creation
2. Job status updates
3. Monitoring scheduled and executed jobs

---
## Key Notes:
  1. **Redis BullMQ**: Ensures fast in-memory queuing for jobs, enabling low-latency scheduling and execution.
  2. **PostgreSQL**: Provides persistent storage for job metadata and status tracking.
  3. **ZooKeeper (Single Node)**: Used solely for leader election without quorum, which simplifies the setup but introduces a single point of failure.
---


## Monitoring and Logs

- Use `docker logs <container_name>` to view logs for any service.
- Monitor Redis queues using tools like `redis-cli`.
- Use ZooKeeper CLI or tools like `zkCli.sh` for leader election monitoring.

---

## Notes

- This setup is for development purposes only.
- Ensure that sensitive credentials are not hardcoded in production environments.
