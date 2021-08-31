import {
  AdvancedLogicTypes,
  ExtensionTypes,
  IdentityTypes,
  RequestLogicTypes,
} from '@requestnetwork/types';

import ContentData from './extensions/content-data';
import AddressBasedBtc from './extensions/payment-network/bitcoin/mainnet-address-based';
import AddressBasedTestnetBtc from './extensions/payment-network/bitcoin/testnet-address-based';
import Declarative from './extensions/payment-network/declarative';
import AddressBasedErc20 from './extensions/payment-network/erc20/address-based';
import FeeProxyContractErc20 from './extensions/payment-network/erc20/fee-proxy-contract';
import ProxyContractErc20 from './extensions/payment-network/erc20/proxy-contract';
import EthereumInputData from './extensions/payment-network/ethereum/input-data';
import NearNative from './extensions/payment-network/near-native';
import AnyToErc20Proxy from './extensions/payment-network/any-to-erc20-proxy';

/**
 * Module to manage Advanced logic extensions
 * Package to route the format and parsing of extensions following their id
 */
export default class AdvancedLogic implements AdvancedLogicTypes.IAdvancedLogic {
  /** Give access to the functions specific of the extensions supported */
  public extensions = {
    addressBasedBtc: new AddressBasedBtc(),
    addressBasedErc20: new AddressBasedErc20(),
    addressBasedTestnetBtc: new AddressBasedTestnetBtc(),
    contentData: new ContentData(),
    anyToErc20Proxy: new AnyToErc20Proxy(),
    declarative: new Declarative(),
    ethereumInputData: new EthereumInputData(),
    nativeTokens: [new NearNative()],
    feeProxyContractErc20: new FeeProxyContractErc20(),
    proxyContractErc20: new ProxyContractErc20(),
  };

  /**
   * Applies the extension action to the request extensions state
   *
   * @param extensionsState IExtensionStates previous state of the extensions
   * @param extensionAction IAction action to apply
   * @param requestState IRequest request state read-only
   * @param actionSigner IIdentity identity of the signer
   * @param timestamp timestamp of the action
   *
   * @returns state of the extension
   */
  public applyActionToExtensions(
    extensionsState: RequestLogicTypes.IExtensionStates,
    extensionAction: ExtensionTypes.IAction,
    requestState: RequestLogicTypes.IRequest,
    actionSigner: IdentityTypes.IIdentity,
    timestamp: number,
  ): RequestLogicTypes.IExtensionStates {
    const id: ExtensionTypes.ID = extensionAction.id;
    const extension: ExtensionTypes.IExtension | undefined = {
      [ExtensionTypes.ID.CONTENT_DATA]: this.extensions.contentData,
      [ExtensionTypes.ID.PAYMENT_NETWORK_BITCOIN_ADDRESS_BASED]: this.extensions.addressBasedBtc,
      [ExtensionTypes.ID.PAYMENT_NETWORK_TESTNET_BITCOIN_ADDRESS_BASED]: this.extensions
        .addressBasedTestnetBtc,
      [ExtensionTypes.ID.PAYMENT_NETWORK_ANY_DECLARATIVE]: this.extensions.declarative,
      [ExtensionTypes.ID.PAYMENT_NETWORK_ERC20_ADDRESS_BASED]: this.extensions.addressBasedErc20,
      [ExtensionTypes.ID.PAYMENT_NETWORK_ERC20_PROXY_CONTRACT]: this.extensions.proxyContractErc20,
      [ExtensionTypes.ID.PAYMENT_NETWORK_ERC20_FEE_PROXY_CONTRACT]: this.extensions
        .feeProxyContractErc20,
      [ExtensionTypes.ID.PAYMENT_NETWORK_ETH_INPUT_DATA]: this.extensions.ethereumInputData,
      [ExtensionTypes.ID
        .PAYMENT_NETWORK_NATIVE_TOKEN]: this.getNativeTokenExtensionForStateAndAction(
        extensionAction,
        requestState,
      ),
      [ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ERC20_PROXY]: this.extensions.anyToErc20Proxy,
    }[id];

    if (!extension) {
      if (id === ExtensionTypes.ID.PAYMENT_NETWORK_NATIVE_TOKEN) {
        throw Error(
          `extension with id: ${id} not found for network: ${requestState.currency.network}`,
        );
      }
      throw Error(`extension not recognized, id: ${id}`);
    }

    return extension.applyActionToExtension(
      extensionsState,
      extensionAction,
      requestState,
      actionSigner,
      timestamp,
    );
  }

  protected getNativeTokenExtensionForStateAndAction(
    extensionAction: ExtensionTypes.IAction,
    requestState: RequestLogicTypes.IRequest,
  ): ExtensionTypes.IExtension<ExtensionTypes.PnReferenceBased.ICreationParameters> | undefined {
    if (
      requestState.currency.network &&
      extensionAction.parameters.paymentNetworkName &&
      requestState.currency.network !== extensionAction.parameters.paymentNetworkName
    ) {
      throw new Error(
        `Cannot apply action for network ${extensionAction.parameters.paymentNetworkName} on state with payment network: ${requestState.currency.network}`,
      );
    }
    const network = requestState.currency.network ?? extensionAction.parameters.paymentNetworkName;
    return network
      ? this.extensions.nativeTokens.find((nativeTokenExtension) =>
          nativeTokenExtension.supportedNetworks.includes(network),
        )
      : undefined;
  }
}
