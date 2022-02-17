import { erc20EscrowToPayArtifact } from '@requestnetwork/smart-contracts';
import {
  AdvancedLogicTypes,
  ExtensionTypes,
  PaymentTypes,
  RequestLogicTypes,
} from '@requestnetwork/types';
import { ICurrencyManager } from '@requestnetwork/currency';

import { makeGetDeploymentInformation } from '../utils';
import EscrowERC20InfoRetriever from './escrow-info-retriever';
import EscrowERC20GraphInfoRetriever from './escrow-thegraph-info-retriever';
import { ERC20FeeProxyPaymentDetector } from './fee-proxy-contract';
import { networkSupportsTheGraph } from '..';

const ESCROW_CONTRACT_ADDRESS_MAP = {
  ['0.1.0']: '0.1.0',
  ['0.2.0']: '0.1.0',
};

/**
 * Handle payment networks with ERC20 fee proxy contract extension, or derived
 */

export class CustomProxyDetector extends ERC20FeeProxyPaymentDetector {
  constructor({
    advancedLogic,
    currencyManager,
  }: {
    advancedLogic: AdvancedLogicTypes.IAdvancedLogic;
    currencyManager: ICurrencyManager;
  }) {
    super({
      advancedLogic,
      currencyManager,
    });
  }

  /**
   * Returns the custom events that do not impact the balance
   */
  public async getCustomEvents(
    request: RequestLogicTypes.IRequest,
  ): Promise<
    PaymentTypes.ICustomNetworkEvent<
      PaymentTypes.GenericEventParameters,
      PaymentTypes.ESCROW_EVENTS_NAMES
    >[]
  > {
    const paymentExtension = this.getPaymentExtension(request);
    const paymentChain = this.getPaymentChain(request);
    this.checkRequiredParameter(paymentExtension.values.paymentAddress, 'paymentAddress');
    const customEvents = await this.extractAllCustomEvents(
      paymentExtension.values.paymentAddress,
      this.getPaymentReference(request),
      request.currency,
      paymentChain,
      paymentExtension,
    );
    return customEvents;
  }

  /**
   * Returns the balance impacting and non-balance impacting events
   */
  public async getAllEvents(
    request: RequestLogicTypes.IRequest,
  ): Promise<
    PaymentTypes.ICustomNetworkEvent<
      PaymentTypes.GenericEventParameters,
      PaymentTypes.EVENTS_NAMES | PaymentTypes.ESCROW_EVENTS_NAMES
    >[]
  > {
    const paymentEvents = await super.getEvents(request);

    const customEvents = await this.getCustomEvents(request);
    return [...paymentEvents, ...customEvents];
  }

  protected async extractAllCustomEvents(
    to: string,
    paymentReference: string,
    requestCurrency: RequestLogicTypes.ICurrency,
    paymentChain: string,
    paymentNetwork: ExtensionTypes.IState<ExtensionTypes.PnFeeReferenceBased.ICreationParameters>,
  ): Promise<PaymentTypes.ICustomNetworkEvent<PaymentTypes.GenericEventParameters>[]> {
    return this.extractCustomEvents(
      undefined,
      to,
      paymentReference,
      requestCurrency,
      paymentChain,
      paymentNetwork,
    );
  }

  public async getEscrow(
    request: RequestLogicTypes.IRequest,
  ): Promise<PaymentTypes.EscrowData | null> {
    const paymentExtension = this.getPaymentExtension(request);
    const paymentChain = this.getPaymentChain(request);
    const deploymentInformation = this.getProxyDeploymentInformation(
      paymentChain,
      paymentExtension.version,
    );
    const paymentReference = this.getPaymentReference(request);
    const escrow = await this.getEscrowFromGraph(
      paymentReference,
      deploymentInformation.address,
      paymentChain,
    );
    return escrow.length ? escrow[0] : null;
  }

  protected async getEscrowFromGraph(
    paymentReference: string,
    contractAddress: string,
    paymentChain: string,
  ): Promise<PaymentTypes.EscrowData[]> {
    const infoRetriever = new EscrowERC20GraphInfoRetriever(
      paymentReference,
      contractAddress,
      paymentChain,
    );
    return await infoRetriever.getEscrow();
  }

  protected async extractCustomEvents(
    eventName: PaymentTypes.ESCROW_EVENTS_NAMES | undefined,
    to: string,
    paymentReference: string,
    requestCurrency: RequestLogicTypes.ICurrency,
    paymentChain: string,
    paymentNetwork: ExtensionTypes.IState<ExtensionTypes.PnFeeReferenceBased.ICreationParameters>,
  ): Promise<PaymentTypes.ICustomNetworkEvent<PaymentTypes.GenericEventParameters>[]> {
    const deploymentInformation = CustomProxyDetector.getOptionalDeploymentInformation(
      paymentChain,
      paymentNetwork.version,
    );
    if (deploymentInformation) {
      const customContractAddress: string | undefined = deploymentInformation.address;
      const customCreationBlockNumber: number = deploymentInformation.creationBlockNumber;
      if (networkSupportsTheGraph(paymentChain)) {
        const infoRetriever = new EscrowERC20GraphInfoRetriever(
          paymentReference,
          customContractAddress,
          paymentChain,
        );
        return infoRetriever.getAllContractEvents();
      } else {
        const infoRetriever = new EscrowERC20InfoRetriever(
          paymentReference,
          customContractAddress,
          customCreationBlockNumber,
          requestCurrency.value,
          to,
          paymentChain,
        );
        if (eventName) {
          return infoRetriever.getContractEventsForEventName(eventName);
        }
        return infoRetriever.getAllContractEvents();
      }
    } else {
      return [];
    }
  }

  /**
   * Extract events for a given `eventName`, whether events are IPaymentNetworkEvent or ICustomNetworkEvent
   * @param eventName
   * @param paymentAddress
   * @param to
   * @param paymentReference
   * @param requestCurrency
   * @param paymentChain
   * @param paymentNetwork
   * @returns
   */
  protected async extractCustomizableEvents(
    eventName: PaymentTypes.EVENTS_NAMES | PaymentTypes.ESCROW_EVENTS_NAMES,
    paymentAddress: string,
    paymentReference: string,
    requestCurrency: RequestLogicTypes.ICurrency,
    paymentChain: string,
    paymentNetwork: ExtensionTypes.IState<ExtensionTypes.PnFeeReferenceBased.ICreationParameters>,
  ): Promise<
    | PaymentTypes.IPaymentNetworkEvent<PaymentTypes.IERC20PaymentEventParameters>[]
    | PaymentTypes.ICustomNetworkEvent<PaymentTypes.GenericEventParameters>[]
  > {
    switch (eventName) {
      case PaymentTypes.EVENTS_NAMES.PAYMENT:
      case PaymentTypes.EVENTS_NAMES.REFUND:
        return this.extractEvents(
          eventName,
          paymentAddress,
          paymentReference,
          requestCurrency,
          paymentChain,
          paymentNetwork,
        );
      case PaymentTypes.ESCROW_EVENTS_NAMES.FROZEN_PAYMENT:
      case PaymentTypes.ESCROW_EVENTS_NAMES.INITIATED_EMERGENCY_CLAIM:
      case PaymentTypes.ESCROW_EVENTS_NAMES.REVERTED_EMERGENCY_CLAIM:
      case PaymentTypes.ESCROW_EVENTS_NAMES.INIT_ESCROW:
        return this.extractCustomEvents(
          eventName,
          paymentAddress,
          paymentReference,
          requestCurrency,
          paymentChain,
          paymentNetwork,
        );
    }
  }

  protected getProxyDeploymentInformation(networkName: string, version: string) {
    return CustomProxyDetector.getDeploymentInformation(networkName, version);
  }

  public static getOptionalDeploymentInformation = makeGetDeploymentInformation(
    erc20EscrowToPayArtifact,
    ESCROW_CONTRACT_ADDRESS_MAP,
    true,
  );

  /*
   * Returns deployment information for the underlying smart contract for a given payment network version
   * TODO: Should probably remove this in all parent classes
   */
  public static getDeploymentInformation = makeGetDeploymentInformation(
    erc20EscrowToPayArtifact,
    ESCROW_CONTRACT_ADDRESS_MAP,
  );
}