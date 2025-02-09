import dotenv from "dotenv";

dotenv.config();
export default function configuration() {
    return {
        zookeeper:{
            host: process.env.ZOOKEEPER_HOST,

        },
        redis: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
        }
    }
}

    