import { ExtensionTypes } from '@requestnetwork/types';
import ReferenceBasedDetector from './reference-based-detector';

/**
 * Abstract class to extend to get the payment balance of reference based requests
 */
export default abstract class FeeReferenceBasedDetector<
  TPaymentEventParameters
> extends ReferenceBasedDetector<TPaymentEventParameters> {
  /**
   * @param extension The advanced logic payment network extension, reference based
   * @param extensionType Example : ExtensionTypes.ID.PAYMENT_NETWORK_ETH_INPUT_DATA
   */
  public constructor(
    protected extension: ExtensionTypes.PnFeeReferenceBased.IFeeReferenceBased,
    protected extensionType: ExtensionTypes.ID,
  ) {
    super(extension, extensionType);
  }

  /**
   * Creates the extensions data to add fee address and amount
   *
   * @param Parameters to add refund information
   * @returns The extensionData object
   */
  public createExtensionsDataForAddFeeInformation(
    parameters: ExtensionTypes.PnFeeReferenceBased.IAddFeeParameters,
  ): ExtensionTypes.IAction {
    return this.extension.createAddFeeAction({
      feeAddress: parameters.feeAddress,
      feeAmount: parameters.feeAmount,
    });
  }
}
