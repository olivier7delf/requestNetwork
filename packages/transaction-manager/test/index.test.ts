import 'mocha';

import Utils from '@requestnetwork/utils';

const chai = require('chai');
const spies = require('chai-spies');
const expect = chai.expect;
chai.use(spies);

import { DataAccessTypes } from '@requestnetwork/types';

import { TransactionManager } from '../src/index';
import TransactionCore from '../src/transaction';

import * as TestData from './unit/utils/test-data';

const extraTopics = ['topic1', 'topic2'];
const fakeTxHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const data = '{ "what": "ever", "it": "is,", "this": "must", "work": true }';
const data2 = '{"or": "can", "be":false}';

const tx: DataAccessTypes.IConfirmedTransaction = { transaction: { data }, timestamp: 1 };
const tx2: DataAccessTypes.IConfirmedTransaction = { transaction: { data: data2 }, timestamp: 1 };

const channelId = Utils.crypto.normalizeKeccak256Hash(JSON.parse(tx.transaction.data));

const fakeMetaDataAccessPersistReturn: DataAccessTypes.IReturnPersistTransaction = {
  meta: { transactionStorageLocation: 'fakeDataId', topics: extraTopics },
  result: { topics: [fakeTxHash] },
};

const fakeMetaDataAccessGetReturn: DataAccessTypes.IReturnGetTransactions = {
  meta: { transactionsStorageLocation: ['fakeDataId1', 'fakeDataId2'] },
  result: { transactions: [tx, tx2] },
};

const fakeMetaDataAccessGetChannelsReturn: DataAccessTypes.IReturnGetChannelsByTopic = {
  meta: { transactionsStorageLocation: { [channelId]: ['fakeDataId1', 'fakeDataId2'] } },
  result: { transactions: { [channelId]: [tx, tx2] } },
};
let fakeDataAccess: DataAccessTypes.IDataAccess;

/* tslint:disable:no-unused-expression */
describe('index', () => {
  beforeEach(() => {
    fakeDataAccess = {
      getChannelsByTopic: chai.spy.returns(fakeMetaDataAccessGetChannelsReturn),
      getTransactionsByChannelId: chai.spy.returns(fakeMetaDataAccessGetReturn),
      initialize: chai.spy(),
      persistTransaction: chai.spy.returns(fakeMetaDataAccessPersistReturn),
    };
  });
  describe('persistTransaction', () => {
    it('can persist a transaction', async () => {
      const transactionManager = new TransactionManager(fakeDataAccess);

      const ret = await transactionManager.persistTransaction(data, channelId, extraTopics);

      expect(ret.result, 'ret.result is wrong').to.be.deep.equal({});
      expect(ret.meta, 'ret.meta is wrong').to.be.deep.equal({
        dataAccessMeta: fakeMetaDataAccessPersistReturn.meta,
      });
      expect(fakeDataAccess.persistTransaction).to.have.been.called.with(
        TransactionCore.createTransaction(data),
        extraTopics,
      );
    });
  });

  describe('persistEncryptedTransaction', () => {
    it('can persist an encrypted transaction', async () => {
      const transactionManager = new TransactionManager(fakeDataAccess);

      const ret = await transactionManager.persistEncryptedTransaction(
        data,
        channelId,
        [
          TestData.idRaw1.encryptionParams,
          TestData.idRaw2.encryptionParams,
          TestData.idRaw3.encryptionParams,
        ],
        extraTopics,
      );

      expect(ret.result, 'ret.result is wrong').to.be.deep.equal({});
      expect(ret.meta, 'ret.meta is wrong').to.be.deep.equal({
        dataAccessMeta: fakeMetaDataAccessPersistReturn.meta,
        encryptionMethod: 'ecies-aes256-cbc',
      });
      expect(fakeDataAccess.persistTransaction).to.have.been.called.once();
    });
  });

  describe('getTransactionsByChannelId', () => {
    it('can get transactions by channel id', async () => {
      const transactionManager = new TransactionManager(fakeDataAccess);

      const ret = await transactionManager.getTransactionsByChannelId(channelId);

      expect(ret.result, 'ret.result is wrong').to.be.deep.equal(
        fakeMetaDataAccessGetReturn.result,
      );
      expect(ret.meta, 'ret.meta is wrong').to.be.deep.equal({
        dataAccessMeta: fakeMetaDataAccessGetReturn.meta,
        ignoredTransactions: [null, null],
      });
      expect(fakeDataAccess.getTransactionsByChannelId).to.have.been.called.with(channelId);
    });

    it('can getTransactionsByChannelId() with channelId not matching the first transaction hash', async () => {
      const txWrongHash: DataAccessTypes.IConfirmedTransaction = {
        timestamp: 1,
        transaction: { data: '{"wrong": "hash"}' },
      };

      const fakeMetaDataAccessGetReturnFirstHashWrong: DataAccessTypes.IReturnGetTransactions = {
        meta: { transactionsStorageLocation: ['fakeDataId1', 'fakeDataId1', 'fakeDataId2'] },
        result: { transactions: [txWrongHash, tx, tx2] },
      };

      fakeDataAccess = {
        getChannelsByTopic: chai.spy(),
        getTransactionsByChannelId: chai.spy.returns(fakeMetaDataAccessGetReturnFirstHashWrong),
        initialize: chai.spy(),
        persistTransaction: chai.spy(),
      };

      const transactionManager = new TransactionManager(fakeDataAccess);

      const ret = await transactionManager.getTransactionsByChannelId(channelId);

      expect(ret.meta, 'ret.meta is wrong').to.be.deep.equal({
        dataAccessMeta: fakeMetaDataAccessGetReturnFirstHashWrong.meta,
        ignoredTransactions: [
          {
            reason: 'as first transaction, the hash of the transaction do not match the channelId',
            transaction: txWrongHash,
          },
          null,
          null,
        ],
      });

      expect(ret.result, 'ret.result is wrong').to.be.deep.equal({
        transactions: [null, tx, tx2],
      });
      expect(fakeDataAccess.getTransactionsByChannelId).to.have.been.called.with(channelId);
    });

    it('can getTransactionsByChannelId() the first transaction data not parsable', async () => {
      const txWrongHash: DataAccessTypes.IConfirmedTransaction = {
        timestamp: 1,
        transaction: { data: 'Not parsable' },
      };

      const fakeMetaDataAccessGetReturnFirstHashWrong: DataAccessTypes.IReturnGetTransactions = {
        meta: { transactionsStorageLocation: ['fakeDataId1', 'fakeDataId1', 'fakeDataId2'] },
        result: { transactions: [txWrongHash, tx, tx2] },
      };

      fakeDataAccess = {
        getChannelsByTopic: chai.spy(),
        getTransactionsByChannelId: chai.spy.returns(fakeMetaDataAccessGetReturnFirstHashWrong),
        initialize: chai.spy(),
        persistTransaction: chai.spy(),
      };

      const transactionManager = new TransactionManager(fakeDataAccess);

      const ret = await transactionManager.getTransactionsByChannelId(channelId);

      expect(ret.meta, 'ret.meta is wrong').to.be.deep.equal({
        dataAccessMeta: fakeMetaDataAccessGetReturnFirstHashWrong.meta,
        ignoredTransactions: [
          {
            reason: 'Impossible to JSON parse the transaction',
            transaction: txWrongHash,
          },
          null,
          null,
        ],
      });

      expect(ret.result, 'ret.result is wrong').to.be.deep.equal({
        transactions: [null, tx, tx2],
      });
      expect(fakeDataAccess.getTransactionsByChannelId).to.have.been.called.with(channelId);
    });
  });

  describe('getChannelsByTopic', () => {
    it('can get channels indexed by topics', async () => {
      const transactionManager = new TransactionManager(fakeDataAccess);

      const ret = await transactionManager.getChannelsByTopic(extraTopics[0]);

      expect(ret.result, 'ret.result is wrong').to.be.deep.equal(
        fakeMetaDataAccessGetChannelsReturn.result,
      );
      expect(ret.meta, 'ret.meta is wrong').to.be.deep.equal({
        dataAccessMeta: fakeMetaDataAccessGetChannelsReturn.meta,
        ignoredTransactions: {
          '01a98f126de3fab2b5130af5161998bf6e59b2c380deafeff938ff3f798281bf23': [null, null],
        },
      });
      expect(fakeDataAccess.getChannelsByTopic).to.have.been.called.with(extraTopics[0]);
    });

    it('can get channels indexed by topics with channelId not matching the first transaction hash', async () => {
      const txWrongHash: DataAccessTypes.IConfirmedTransaction = {
        timestamp: 1,
        transaction: { data: '{"wrong": "hash"}' },
      };

      const fakeMetaDataAccessGetReturnFirstHashWrong: DataAccessTypes.IReturnGetChannelsByTopic = {
        meta: {
          transactionsStorageLocation: {
            [channelId]: ['fakeDataId1', 'fakeDataId1', 'fakeDataId2'],
          },
        },
        result: { transactions: { [channelId]: [txWrongHash, tx, tx2] } },
      };
      fakeDataAccess = {
        getChannelsByTopic: chai.spy.returns(fakeMetaDataAccessGetReturnFirstHashWrong),
        getTransactionsByChannelId: chai.spy(),
        initialize: chai.spy(),
        persistTransaction: chai.spy(),
      };

      const transactionManager = new TransactionManager(fakeDataAccess);

      const ret = await transactionManager.getChannelsByTopic(extraTopics[0]);

      expect(ret.result, 'ret.result is wrong').to.be.deep.equal({
        transactions: { [channelId]: [null, tx, tx2] },
      });
      expect(ret.meta, 'ret.meta is wrong').to.be.deep.equal({
        dataAccessMeta: fakeMetaDataAccessGetReturnFirstHashWrong.meta,
        ignoredTransactions: {
          [channelId]: [
            {
              reason:
                'as first transaction, the hash of the transaction do not match the channelId',
              transaction: txWrongHash,
            },
            null,
            null,
          ],
        },
      });
      expect(fakeDataAccess.getChannelsByTopic).to.have.been.called.with(extraTopics[0]);
    });
  });
});
