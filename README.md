# Job Scheduling System Documentation

## Overview

This system is a distributed job scheduling and execution system designed to handle tasks efficiently. It uses **PostgreSQL** for persistent storage, **Redis** for job queue management, and **ZooKeeper** for leader election and coordination among services. The architecture includes the following key components:

- **Store Service**: Handles job creation and updates job statuses.
- **Scheduler Service**: Schedules jobs and pushes them to the queue.
- **Executor Service**: Fetches jobs from the queue and executes them.
- **ZooKeeper**: Manages leader election and ephemeral sequential nodes.
- **Redis**: Acts as a message queue for job management.
- **PostgreSQL**: Stores job metadata persistently.

---

## Architecture
![system_deisgn](https://pplx-res.cloudinary.com/image/upload/v1739254528/user_uploads/TCnQqHevDZIZXzN/image.jpg)
### Design Choices
1. **Scalability**: The system is designed to scale horizontally with multiple workers for each service.
2. **Fault Tolerance**: ZooKeeper ensures leader election and avoids single points of failure.
3. **Separation of Concerns**: Each service has a distinct responsibility (e.g., scheduling, execution).
4. **Queue Management**: Redis is used for its high-speed in-memory data structure store.

### Trade-offs
- **Simplicity vs. Scalability**
  1. *Choice*: Modular design separates Store, Scheduler, and Executor services for scalability.
  2. *Trade-off*: Increased complexity in managing inter-service communication.

- **Latency vs. Consistency**
  1. *Choice*: Strong consistency across services for job states.
  2. *Trade-off*: If not Managed properly may cause higher latency due to synchronization overhead.

- **Operational Overhead vs. Reliability**
  1. *Choice*: Multiple tools (Redis, PostgreSQL, ZooKeeper) enhance reliability.
  2. *Trade-off*: Increased operational complexity for deployment and maintenance.

---

## API Documentation

Postman Collection:-[link](https://documenter.getpostman.com/view/29155906/2sAYX9nfwU). 
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

## Development Setup

### Prerequisites
1. Install Docker and Docker Compose on your machine.
2. Ensure all required ports (e.g., 5432, 6379, 2181, etc.) are free to use.

### Configuration Instructions
1. Update the `POSTGRES_USER` environment variable in the `docker-compose.yaml` file to your username (e.g., `akash`).
2. Update the `DATABASE_URL` environment variable with your username in this format:
```postgresql://<username>:<password>@localhost:5432/myPostgres?schema=public```
Example:
```postgresql://akash:1234@localhost:5432/myPostgres?schema=public```


### Docker Compose File
```docker-compose
version: '3.8'

services:
  # PostgreSQL Service
  postgres:
    image: postgres:latest
    container_name: Postgres
    restart: always
    network_mode: "host"
    environment:
      POSTGRES_USER: <your_username>
      POSTGRES_PASSWORD: 1234
      POSTGRES_DB: myPostgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Redis Service
  redis:
    image: redis:latest
    container_name: Redis
    restart: always
    network_mode: "host"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  # Zookeeper Service
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    container_name: Zookeeper
    restart: always
    network_mode: "host"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  # Store Service
  store-service:
    image: akashmishrax/storeservice:latest
    container_name: StoreService
    restart: always
    network_mode: "host"
    environment:
      STORE_SERVICE_PORT: 3000
      REDIS_HOST: localhost
      REDIS_PORT: 6379
      DATABASE_URL: "postgresql://<your_username>:1234@localhost:5432/myPostgres?schema=public"
      NODE_ENV: development
      LOG_LEVEL: info
      STORE_SERVICE_URL: http://localhost:3000

  # Executor Service
  executor-service:
    image: akashmishrax/executorservice:latest
    container_name: ExecutorService
    restart: always
    network_mode: "host"
    environment:
      ZOOKEEPER_HOST: localhost:2181
      REDIS_HOST: localhost
      REDIS_PORT: 6379
      DATABASE_URL: "postgresql://<your_username>:1234@localhost:5432/myPostgres?schema=public"
      NODE_ENV: development

  # Scheduler Service
  scheduler-service:
    image: akashmishrax/schedulerservice:latest
    container_name: SchedulerService
    restart: always
    network_mode: "host"
    environment:
      ZOOKEEPER_HOST: localhost:2181
      REDIS_HOST: localhost
      REDIS_PORT: 6379
      DATABASE_URL: "postgresql://<your_username>:1234@localhost:5432/myPostgres?schema=public"
      NODE_ENV: development

volumes:
  postgres_data:
  redis_data:
```

Replace `<your_username>` with your actual username.

### Steps to Run the System Locally

1. Clone the repository containing the `docker-compose.yaml` file.
2. Navigate to the directory containing the file.
3. Run the following command to start all services: `docker-compose up --build -d`

4. Verify that all containers are running using:`docker ps`

5. Access individual services via their respective ports (e.g., Store Service at port `3000`).

---

## Monitoring and Logs

- Use `docker logs <container_name>` to view logs for any service.
- Monitor Redis queues using tools like `redis-cli`.
- Use ZooKeeper CLI or tools like `zkCli.sh` for leader election monitoring.

---

## Notes

- This setup is for development purposes only.
- Ensure that sensitive credentials are not hardcoded in production environments.
