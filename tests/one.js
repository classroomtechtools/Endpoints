import {EndpointsLib} from '../src/modules/Endpoints.js';
console.log(Object.keys(EndpointsLib));
const batch = new EndpointsLib.Batch();  // no new
console.log(Object.keys(batch));
console.log(batch.queue);
