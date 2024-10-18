import React from 'react';
import { oneOf, string } from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage, intlShape, injectIntl } from '../../util/reactIntl';
import { propTypes, LISTING_UNIT_TYPES, LINE_ITEM_CUSTOMER_COMMISSION, LINE_ITEM_PROVIDER_COMMISSION } from '../../util/types';

import LineItemBookingPeriod from './LineItemBookingPeriod';
import LineItemBasePriceMaybe from './LineItemBasePriceMaybe';
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
  const allLineItems = transaction.attributes.lineItems || [];
  const lineItems = allLineItems.filter(lineItem => lineItem.includeFor.includes(userRole));
  const unitLineItem = lineItems.find(item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal);
  const lineItemUnitType = unitLineItem?.code;

  // Filter commission line items
  const hasCommissionLineItem = lineItems.find(item => {
    const hasCustomerCommission = isCustomer && item.code === LINE_ITEM_CUSTOMER_COMMISSION;
    const hasProviderCommission = isProvider && item.code === LINE_ITEM_PROVIDER_COMMISSION;
    return (hasCustomerCommission || hasProviderCommission) && !item.reversal;
  });

  const classes = classNames(rootClassName || css.root, className);
  console.log('Line Items:', lineItems);

// Buscar el item con el código 'line-item/day' para obtener el precio base
const basePriceLineItem = lineItems.find(item => item.code === 'line-item/day');
const basePrice = basePriceLineItem ? basePriceLineItem.lineTotal.amount / 100 : 0;


// Sumar todos los montos de los line items (que no sean reversals)
const totalPrice = lineItems
  .filter(item => !item.reversal)
  .reduce((total, item) => total + item.lineTotal.amount / 100, 0);


  // Get subtotal and commission information
  const subTotalLineItems = lineItems.filter(item => !item.reversal && item.code !== LINE_ITEM_CUSTOMER_COMMISSION && item.code !== LINE_ITEM_PROVIDER_COMMISSION);
  const subTotal = subTotalLineItems.reduce((total, item) => total + item.lineTotal.amount / 100, 0); // Calculate subtotal in main currency units
  const commission = hasCommissionLineItem ? hasCommissionLineItem.lineTotal.amount / 100 : 0;
  console.log('Line Items:', lineItems);

  // Check if the commission is 10% or if totalPrice is 90% of basePrice
  const isTenPercentCommission = commission === subTotal * 0.1;
  const isTotalPrice90PercentOfBase = totalPrice === basePrice * 0.9;
console.log(commission);
console.log(totalPrice);
console.log(basePrice);


  // Adjusted subtotal (90% or 80% depending on the commission or total price condition)
  const adjustedSubTotal = isTenPercentCommission || isTotalPrice90PercentOfBase ? subTotal * 0.9 : subTotal * 0.8;
  const formattedSubTotal = intl.formatNumber(adjustedSubTotal, { style: 'currency', currency: currency });
console.log(formattedSubTotal);

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

      <hr className={css.totalDivider} />
      <div className={css.subTotalLineItem}>
        <span className={css.itemLabel}>
          <FormattedMessage id="OrderBreakdown.subTotal" />
        </span>
        <span className={css.itemValue}>{formattedSubTotal}</span>
      </div>

      <LineItemRefundMaybe lineItems={lineItems} intl={intl} marketplaceCurrency={currency} />

      <LineItemCustomerCommissionMaybe
        lineItems={lineItems}
        isCustomer={isCustomer}
        marketplaceName={marketplaceName}
        intl={intl}
      />
      <LineItemCustomerCommissionRefundMaybe
        lineItems={lineItems}
        isCustomer={isCustomer}
        marketplaceName={marketplaceName}
        intl={intl}
      />

      <LineItemProviderCommissionMaybe
        lineItems={lineItems}
        isProvider={isProvider}
        marketplaceName={marketplaceName}
        intl={intl}
      />
      <LineItemProviderCommissionRefundMaybe
        lineItems={lineItems}
        isProvider={isProvider}
        marketplaceName={marketplaceName}
        intl={intl}
      />

      <LineItemTotalPrice transaction={transaction} isProvider={isProvider} intl={intl} />

      {hasCommissionLineItem ? (
        <span className={css.feeInfo}>
          <FormattedMessage id="OrderBreakdown.commissionFeeNote" />
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
  intl: intlShape.isRequired,
};

const OrderBreakdown = injectIntl(OrderBreakdownComponent);

OrderBreakdown.displayName = 'OrderBreakdown';

export default OrderBreakdown;
