import {
  DataAccessTypes,
  DecryptionProviderTypes,
  EncryptionTypes,
  TransactionTypes,
} from '@requestnetwork/types';
import Utils from '@requestnetwork/utils';

import ChannelParser from './channel-parser';
import TransactionsFactory from './transactions-factory';

/**
 * Implementation of TransactionManager layer without encryption
 */
export default class TransactionManager implements TransactionTypes.ITransactionManager {
  private dataAccess: DataAccessTypes.IDataAccess;
  private channelParser: ChannelParser;

  public constructor(
    dataAccess: DataAccessTypes.IDataAccess,
    decryptionProvider?: DecryptionProviderTypes.IDecryptionProvider,
  ) {
    this.dataAccess = dataAccess;
    this.channelParser = new ChannelParser(decryptionProvider);
  }

  /**
   * Persists a transaction and topics in storage. If encryptionParams is given, the transaction will be encrypted
   *
   * @param transactionData transaction to persist
   * @param channelId string to identify a group of transactions
   * @param topics list of string to topic the transaction
   * @param encryptionParams list of encryption parameters to encrypt the channel key with
   *
   * @returns object containing the meta-data of the persist
   */
  public async persistTransaction(
    transactionData: TransactionTypes.ITransactionData,
    channelId: string,
    topics: string[] = [],
    encryptionParams: EncryptionTypes.IEncryptionParameters[] = [],
  ): Promise<TransactionTypes.IReturnPersistTransaction> {
    let transaction: TransactionTypes.IPersistedTransaction = {};
    let encryptionMethod: string | undefined;

    // compute hash to add it to the topics
    const hash = Utils.crypto.normalizeKeccak256Hash(JSON.parse(transactionData));

    // Need to create a new channel (only the first transaction can have the hash equals to the channel id)
    if (channelId === hash) {
      if (encryptionParams.length === 0) {
        // create a clear channel
        transaction = await TransactionsFactory.createClearTransaction(transactionData);
      } else {
        // create an encrypted channel
        transaction = await TransactionsFactory.createEncryptedTransactionInNewChannel(
          transactionData,
          encryptionParams,
        );
        encryptionMethod = transaction.encryptionMethod;
      }

      // Add the transaction to an existing channel
    } else {
      const resultGetTx = await this.dataAccess.getTransactionsByChannelId(channelId);

      const { channelKey, channelType } = await this.channelParser.getChannelTypeAndChannelKey(
        channelId,
        resultGetTx.result.transactions,
      );

      if (channelType === TransactionTypes.ChannelType.UNKNOWN) {
        throw new Error(`Impossible to retrieve the channel: ${channelId}`);
      }

      if (channelType === TransactionTypes.ChannelType.CLEAR) {
        // add the transaction to a clear channel
        transaction = await TransactionsFactory.createClearTransaction(transactionData);
      }

      if (channelType === TransactionTypes.ChannelType.ENCRYPTED) {
        // we cannot add new stakeholders to an existing channel
        if (encryptionParams.length !== 0) {
          throw new Error('Impossible to add new stakeholder to an existing channel');
        }

        if (!channelKey) {
          throw new Error(`Impossible to decrypt the channel key of: ${channelId}`);
        }

        transaction = await TransactionsFactory.createEncryptedTransaction(
          transactionData,
          channelKey,
        );

        encryptionMethod = channelKey.method;
      }
    }

    const persistResult = await this.dataAccess.persistTransaction(
      transaction,
      channelId,
      // add the hash to the topics
      topics.concat([hash]),
    );

    return {
      meta: {
        dataAccessMeta: persistResult.meta,
        encryptionMethod,
      },
      result: {},
    };
  }

  /**
   * Gets a list of transactions from a channel
   *
   * later it will handle decryption
   *
   * @param channelId channel id to retrieve the transaction from
   * @param timestampBoundaries timestamp boundaries of the transactions search
   * @returns list of transactions of the channel
   */
  public async getTransactionsByChannelId(
    channelId: string,
    timestampBoundaries?: TransactionTypes.ITimestampBoundaries,
  ): Promise<TransactionTypes.IReturnGetTransactions> {
    const resultGetTx = await this.dataAccess.getTransactionsByChannelId(
      channelId,
      timestampBoundaries,
    );

    // Decrypts and cleans the channel from the data-access layers
    const { transactions, ignoredTransactions } = await this.channelParser.decryptAndCleanChannel(
      channelId,
      resultGetTx.result.transactions,
    );

    return {
      meta: {
        dataAccessMeta: resultGetTx.meta,
        ignoredTransactions,
      },
      result: { transactions },
    };
  }

  /**
   * Gets a list of channels indexed by topic
   *
   * @param topic topic to retrieve the transaction from
   * @param updatedBetween filter the channel whose received new data in the boundaries
   * @returns list of channels indexed by topic
   */
  public async getChannelsByTopic(
    topic: string,
    updatedBetween?: TransactionTypes.ITimestampBoundaries,
  ): Promise<TransactionTypes.IReturnGetTransactionsByChannels> {
    const resultGetTx = await this.dataAccess.getChannelsByTopic(topic, updatedBetween);

    // Get the channels from the data-access layers to decrypt and clean them one by one
    const result = await Object.keys(resultGetTx.result.transactions).reduce(
      async (accumulatorPromise, channelId) => {
        const cleaned = await this.channelParser.decryptAndCleanChannel(
          channelId,
          resultGetTx.result.transactions[channelId],
        );

        // await for the accumulator promise at the end to parallelize the calls to decryptAndCleanChannel()
        const accumulator: any = await accumulatorPromise;

        accumulator.transactions[channelId] = cleaned.transactions;
        accumulator.ignoredTransactions[channelId] = cleaned.ignoredTransactions;
        return accumulator;
      },
      Promise.resolve({ transactions: {}, ignoredTransactions: {} }),
    );

    return {
      meta: {
        dataAccessMeta: resultGetTx.meta,
        ignoredTransactions: result.ignoredTransactions,
      },
      result: { transactions: result.transactions },
    };
  }
}
