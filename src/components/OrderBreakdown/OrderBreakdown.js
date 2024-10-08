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
import LineItemProviderCommissionMaybe from './LineItemProviderCommissionMaybe';
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

  const lineItemUnitType = unitLineItem?.code;

  const hasCommissionLineItem = lineItems.find(item => {
    const hasCustomerCommission = isCustomer && item.code === LINE_ITEM_CUSTOMER_COMMISSION;
    const hasProviderCommission = isProvider && item.code === LINE_ITEM_PROVIDER_COMMISSION;
    return (hasCustomerCommission || hasProviderCommission) && !item.reversal;
  });

  // Calcular el subtotal sumando los montos de todos los line items
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.lineTotal.amount || 0);
  }, 0);

  // Extraer la comisión del cliente
  const customerCommissionItems = lineItems.filter(item => 
    item.code === LINE_ITEM_CUSTOMER_COMMISSION && !item.reversal
  );
  const customerCommissionTotal = customerCommissionItems.reduce((sum, item) => {
    return sum + (item.lineTotal.amount || 0);
  }, 0);

  // Restar la comisión del cliente al subtotal
  const finalTotalValue = subtotal - customerCommissionTotal;

  // Formatear el resultado final
  const formattedFinalTotal = intl.formatNumber(finalTotalValue / 100, {
    style: 'currency',
    currency,
  });

  const classes = classNames(rootClassName || css.root, className);

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

      {/* Mostrar el subtotal/A pagar al oferente */}
      <div className={css.subTotalLineItem}>
        <span className={css.itemLabel}>
          <FormattedMessage id="OrderBreakdown.subTotal" />
        </span>
        <span className={css.itemValue}>
          {formattedFinalTotal} 
        </span>
      </div>

      <LineItemCustomerCommissionMaybe
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

      <LineItemTotalPrice transaction={transaction} isProvider={isProvider} intl={intl} />

      {hasCommissionLineItem && (
        <span className={css.feeInfo}>
          <FormattedMessage id="OrderBreakdown.commissionFeeNote" />
          <br />
          <FormattedMessage id="OrderBreakdown.commissionFeeNote2" />
        </span>
      )}
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
