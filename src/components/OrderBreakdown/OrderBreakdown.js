/**
 * This component will show the booking info and calculated total price.
 * I.e. dates and other details related to payment decision in receipt format.
 */
import React from 'react';
import { oneOf, string } from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage, intlShape, injectIntl } from '../../util/reactIntl';
import {
  propTypes,
  LISTING_UNIT_TYPES,
  LINE_ITEM_CUSTOMER_COMMISSION,
  LINE_ITEM_PROVIDER_COMMISSION,
} from '../../util/types';
import LineItemBookingPeriod from './LineItemBookingPeriod';
import LineItemBasePriceMaybe from './LineItemBasePriceMaybe';
import LineItemSubTotalMaybe from './LineItemSubTotalMaybe';
import LineItemShippingFeeMaybe from './LineItemShippingFeeMaybe';
import LineItemPickupFeeMaybe from './LineItemPickupFeeMaybe';
import LineItemCustomerCommissionMaybe from './LineItemCustomerCommissionMaybe';
import LineItemCustomerCommissionRefundMaybe from './LineItemCustomerCommissionRefundMaybe';
import LineItemProviderCommissionMaybe from './LineItemProviderCommissionMaybe';
import LineItemProviderCommissionRefundMaybe from './LineItemProviderCommissionRefundMaybe';
import LineItemRefundMaybe from './LineItemRefundMaybe';
import LineItemTotalPrice from './LineItemTotalPrice';
import LineItemUnknownItemsMaybe from './LineItemUnknownItemsMaybe';
import css from './OrderBreakdown.module.css';
export const OrderBreakdownComponent = props => {
  const {
    rootClassName,
    className,
    userRole,
    transaction,
    booking,
    intl,
    dateType,
    timeZone,
    currency,
    marketplaceName,
  } = props;
  const isCustomer = userRole === 'customer';
  const isProvider = userRole === 'provider';
  const lineItems = transaction.attributes.lineItems;
  const unitLineItem = lineItems?.find(
    item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal
  );
  // Line-item code that matches with base unit: day, night, hour, item
  const lineItemUnitType = unitLineItem?.code;
  // Calcula el subtotal y la comisión del cliente
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.lineTotal.amount || 0);
  }, 0);

  const total = lineItems.reduce((sum, item) => {
    return sum + (item.lineTotal.amount || 0);
  }, );

  const customerCommission = lineItems.reduce((sum, item) => {
    return sum + (isCustomer && item.code === LINE_ITEM_CUSTOMER_COMMISSION && !item.reversal ? item.lineTotal.amount : 0);
  }, 0);

  const netSubtotal = subtotal * 80 / 100;
  const nettotal = total + 20 ;

  const hasCommissionLineItem = lineItems.find(item => {
    const hasCustomerCommission = isCustomer && item.code === LINE_ITEM_CUSTOMER_COMMISSION;
    const hasProviderCommission = isProvider && item.code === LINE_ITEM_PROVIDER_COMMISSION;
    return (hasCustomerCommission || hasProviderCommission) && !item.reversal;
  });

    // Extraer la comisión del proveedor de los line items
    const customerCommissionItems = lineItems.filter(item => 
      item.code === LINE_ITEM_CUSTOMER_COMMISSION && !item.reversal
    );
  
    // Sumar las comisiones del proveedor
    const customerCommissionTotal = customerCommissionItems.reduce((sum, item) => {
      return sum + (item.lineTotal.amount || 0);
    }, 0);
  
    // Formatear el total de la comisión del proveedor para mostrarlo
    const formattedcustomerCommissionTotal = intl.formatNumber(customerCommissionTotal / 100, {
      style: 'currency',
      currency,
    });

  const classes = classNames(rootClassName || css.root, className);
  /**
   * OrderBreakdown contains different line items:
   *
   * LineItemBookingPeriod: prints booking start and booking end types. Prop dateType
   * determines if the date and time or only the date is shown
   *
   * LineItemShippingFeeMaybe: prints the shipping fee (combining additional fee of
   * additional items into it).
   *
   * LineItemShippingFeeRefundMaybe: prints the amount of refunded shipping fee
   *
   * LineItemBasePriceMaybe: prints the base price calculation for the listing, e.g.
   * "$150.00 * 2 nights $300"
   *
   * LineItemUnknownItemsMaybe: prints the line items that are unknown. In ideal case there
   * should not be unknown line items. If you are using custom pricing, you should create
   * new custom line items if you need them.
   *
   * LineItemSubTotalMaybe: prints subtotal of line items before possible
   * commission or refunds
   *
   * LineItemRefundMaybe: prints the amount of refund
   *
   * LineItemCustomerCommissionMaybe: prints the amount of customer commission
   * The default transaction process used by this template doesn't include the customer commission.
   *
   * LineItemCustomerCommissionRefundMaybe: prints the amount of refunded customer commission
   *
   * LineItemProviderCommissionMaybe: prints the amount of provider commission
   *
   * LineItemProviderCommissionRefundMaybe: prints the amount of refunded provider commission
   *
   * LineItemTotalPrice: prints total price of the transaction
   *
   */
  return (
    <div className={classes}>
      <LineItemBookingPeriod
        booking={booking}
        code={lineItemUnitType}
        dateType={dateType}
        timeZone={timeZone}
      />
      <LineItemBasePriceMaybe lineItems={lineItems} code={lineItemUnitType} intl={intl} />
      <LineItemShippingFeeMaybe lineItems={lineItems} intl={intl} />
      <LineItemPickupFeeMaybe lineItems={lineItems} intl={intl} />
      <LineItemUnknownItemsMaybe lineItems={lineItems} isProvider={isProvider} intl={intl} />

      {/* Codigo modificado para mostrar el subtotal - el valor de comisión */}
      <div className={css.subTotalLineItem}>
        <span className={css.itemLabel}>
          <FormattedMessage id="OrderBreakdown.subTotal" />
        </span> 
         <span className={css.itemValue}>
          {intl.formatNumber(netSubtotal / 100, { style: 'currency', currency })}
        </span> 
      </div>
{/* {       <LineItemSubTotalMaybe
        lineItems={lineItems}
        code={lineItemUnitType}
        userRole={userRole}
        intl={intl}
        marketplaceCurrency={currency}
      />
      <LineItemRefundMaybe lineItems={lineItems} intl={intl} marketplaceCurrency={currency} />
 } */}
      {/* Mostrar el total de la comisión del proveedor */}
      <LineItemCustomerCommissionMaybe
        lineItems={lineItems}
        isCustomer={isCustomer}
        marketplaceName={marketplaceName}
        intl={intl}
        />
{/*       <LineItemCustomerCommissionRefundMaybe
        lineItems={lineItems}
        isCustomer={isCustomer}
        marketplaceName={marketplaceName}
        intl={intl}
        /> */}
      <LineItemProviderCommissionMaybe
        lineItems={lineItems}
        isProvider={isProvider}
        marketplaceName={marketplaceName}
        intl={intl}
        />
{/*       <LineItemProviderCommissionRefundMaybe
        lineItems={lineItems}
        isProvider={isProvider}
        marketplaceName={marketplaceName}
        intl={intl}
        /> */}

      {/* Mostrar la comisión del proveedor solo si el netSubtotal es 0 */}
      {netSubtotal === 0 && customerCommissionItems.length > 0 && (
        <div className={css.commissionLineItem}>
          <hr className={css.totalDivider} />
                <div className={css.lineItemTotal}>
        <div className={css.totalLabel}><FormattedMessage id="OrderBreakdown.total" /></div>
        <div className={css.totalPrice}>{formattedcustomerCommissionTotal}</div>
      </div>
        </div>
      )}

      {/* Ocultar el total de la orden si netSubtotal es 0 */}
      {netSubtotal !== 0 && (
        <LineItemTotalPrice transaction={transaction} isProvider={isProvider} intl={intl} />
      )}

      {hasCommissionLineItem ? (

        <span className={css.feeInfo}>
          <FormattedMessage id="OrderBreakdown.commissionFeeNote" />
          <br></br>
          <FormattedMessage id="OrderBreakdown.commissionFeeNote2" />
        </span>

      ) : null}
    </div>
  ); 
};
OrderBreakdownComponent.defaultProps = {
  rootClassName: null,
  className: null,
  booking: null,
  dateType: null,
};
OrderBreakdownComponent.propTypes = {
  rootClassName: string,
  className: string,
  marketplaceName: string.isRequired,
  userRole: oneOf(['customer', 'provider']).isRequired,
  transaction: propTypes.transaction.isRequired,
  booking: propTypes.booking,
  dateType: propTypes.dateType,
  // from injectIntl
  intl: intlShape.isRequired,
};
const OrderBreakdown = injectIntl(OrderBreakdownComponent);
OrderBreakdown.displayName = 'OrderBreakdown';
export default OrderBreakdown;