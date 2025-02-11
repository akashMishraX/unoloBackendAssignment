import ExecutorService from "./executor.js";
import configuration from "./config.js";
import os from "os";
(async ()=>{
    console.log('Hostname:', os.hostname());
    const config = configuration();

    const executor = new ExecutorService(config);


    await executor.start();


    process.on('SIGTERM', async () => {
        await executor.shutdown();
    });
})()

