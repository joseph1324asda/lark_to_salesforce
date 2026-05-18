import { Router } from 'express';
import { SyncController } from '../controllers/SyncController.js';
import { OrderController } from '../controllers/OrderController.js';
import { ConfigController } from '../controllers/ConfigController.js';
import { MappingController } from '../controllers/MappingController.js';
import { TestController } from '../controllers/TestController.js';

export const apiRouter = Router();
const sync = new SyncController();
const orders = new OrderController();
const config = new ConfigController();
const mapping = new MappingController();
const test = new TestController();

apiRouter.get('/status', orders.status);
apiRouter.post('/test/salesforce', test.salesforce);
apiRouter.post('/test/feishu', test.feishu);
apiRouter.post('/sync/full', sync.full);
apiRouter.post('/sync/incremental', sync.incremental);
apiRouter.post('/sync/retry', sync.retry);
apiRouter.post('/sync/order/:salesforceOrderId', sync.one);
apiRouter.get('/orders', orders.list);
apiRouter.get('/sync/logs', test.logs);
apiRouter.get('/mapping', mapping.get);
apiRouter.put('/mapping', mapping.put);
apiRouter.get('/config', config.get);
apiRouter.put('/config', config.put);
