import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter  } from '@bull-board/express';
import BullMqClient from '../util/bullMqClient.js';

const mainQueue = await  BullMqClient.getQueueInstance();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(mainQueue)],
  serverAdapter: serverAdapter,
});

export { addQueue, removeQueue, setQueues, replaceQueues , serverAdapter};