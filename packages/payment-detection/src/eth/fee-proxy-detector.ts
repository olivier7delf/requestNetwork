import * as SmartContracts from '@requestnetwork/smart-contracts';
import {
  AdvancedLogicTypes,
  ExtensionTypes,
  PaymentTypes,
  RequestLogicTypes,
} from '@requestnetwork/types';

import ProxyEthereumInfoRetriever from './proxy-info-retriever';
import FeeReferenceBasedDetector from '../fee-reference-based-detector';

/**
 * Handle payment networks with ETH input data extension
 */
export default class ETHFeeProxyDetector extends FeeReferenceBasedDetector<PaymentTypes.IETHPaymentEventParameters> {
  /**
   * @param extension The advanced logic payment network extensions
   */
  public constructor({ advancedLogic }: { advancedLogic: AdvancedLogicTypes.IAdvancedLogic }) {
    super(
      advancedLogic.extensions.feeProxyContractEth,
      ExtensionTypes.ID.PAYMENT_NETWORK_ETH_FEE_PROXY_CONTRACT,
    );
  }

  /**
   * Extracts payment events of an address matching an address and a payment reference
   *
   * @param address Address to check
   * @param eventName Indicate if it is an address for payment or refund
   * @param requestCurrency The request currency
   * @param paymentReference The reference to identify the payment
   * @param paymentNetwork the payment network
   * @returns The balance
   */
  protected async extractEvents(
    address: string,
    eventName: PaymentTypes.EVENTS_NAMES,
    requestCurrency: RequestLogicTypes.ICurrency,
    paymentReference: string,
    paymentNetwork: ExtensionTypes.IState<any>,
  ): Promise<PaymentTypes.ETHPaymentNetworkEvent[]> {
    const network = this.getPaymentChain(requestCurrency, paymentNetwork);

    const proxyContractArtifact = SmartContracts.ethereumFeeProxyArtifact.getOptionalDeploymentInformation(
      network,
      paymentNetwork.version,
    );

    if (!proxyContractArtifact) {
      throw Error('ETH fee proxy contract not found');
    }

    const proxyInfoRetriever = new ProxyEthereumInfoRetriever(
      paymentReference,
      proxyContractArtifact.address,
      proxyContractArtifact.creationBlockNumber,
      address,
      eventName,
      network,
    );

    return await proxyInfoRetriever.getTransferEvents();
  }
}
