import DistributedScheduler from "./scheduler.js";
import configuration from "./config.js";

(async ()=>{
    const config = configuration();

    const scheduler = new DistributedScheduler(config);


    await scheduler.start();


    process.on('SIGTERM', async () => {
        await executor.shutdown();
    });
})()

