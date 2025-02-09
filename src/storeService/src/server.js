import express from "express";
import apis from "./api.js";
import configuration from "./config.js";
import BullMqClient from "./util/bullMqClient.js";

export let bullmq = null;
(async () => {
    bullmq = await BullMqClient.getQueueInstance();
   
    const app = express();
    const config = configuration();

    apis(app);
    app.listen(config.port, () => {
        console.log(`Listening on  http://localhost:${config.port}`);
    });
})();