import dotenv from "dotenv";

dotenv.config();

export default function configuration() {
    return {
        redis: {
            host: process.env.REDIS_HOST,  // Change from 127.0.0.1 to "redis"
            port: process.env.REDIS_PORT
        }
    };
}




    