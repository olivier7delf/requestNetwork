import { expect } from 'chai';
import * as httpStatus from 'http-status-codes';
import * as request from 'supertest';
import requestNode from '../src/requestNode';

const topics = ['ThisIsOneTopic', 'ThisIsOneAnotherTopic'];
const transactionData = { data: 'this is sample data for a transaction' };
const anotherTransactionData = { data: 'you can put any data' };
const badlyFormattedTransactionData = { not: 'a transaction' };

let requestNodeInstance;
let server: any;

describe('persistTransaction', () => {
  before(async () => {
    requestNodeInstance = new requestNode();
    await requestNodeInstance.initialize();

    // Any port number can be used since we use supertest
    server = requestNodeInstance.listen(3000, () => 0);
  });

  after(() => {
    server.close();
  });

  it('responds with status 200 to requests with correct values', async () => {
    let serverResponse = await request(server)
      .post('/persistTransaction')
      .send({
        topics,
        transactionData,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.OK);

    expect(serverResponse.body.result, 'persistTransaction request result should always be empty')
      .to.be.empty;

    // topics parameter should be optional
    serverResponse = await request(server)
      .post('/persistTransaction')
      .send({
        transactionData: anotherTransactionData,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.OK);

    expect(serverResponse.body.result, 'persistTransaction request result should always be empty')
      .to.be.empty;
  });

  it('responds with status 400 to requests with no value', async () => {
    await request(server)
      .post('/persistTransaction')
      .send({})
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });

  it('responds with status 400 to requests with badly formatted value', async () => {
    await request(server)
      .post('/persistTransaction')
      .send({
        transactionData: badlyFormattedTransactionData,
      })
      .set('Accept', 'application/json')
      .expect(httpStatus.BAD_REQUEST);
  });
});