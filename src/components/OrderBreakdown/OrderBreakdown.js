import React from 'react';
import { oneOf, string } from 'prop-types';
import classNames from 'classnames';
import { FormattedMessage, intlShape, injectIntl } from '../../util/reactIntl';
import { propTypes, LISTING_UNIT_TYPES, LINE_ITEM_CUSTOMER_COMMISSION } from '../../util/types';
import LineItemBookingPeriod from './LineItemBookingPeriod';
import LineItemBasePriceMaybe from './LineItemBasePriceMaybe';
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

  // Calcular el subtotal sumando los montos de todos los line items
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.lineTotal.amount || 0);
  }, 0);

  // Formatear el subtotal
  const formattedSubTotal = intl.formatNumber(subtotal / 100, {
    style: 'currency',
    currency,
  });

  // Extraer la comisión del cliente
  const customerCommissionItems = lineItems.filter(
    item => item.code === LINE_ITEM_CUSTOMER_COMMISSION && !item.reversal
  );
  const customerCommissionTotal = customerCommissionItems.reduce((sum, item) => {
    return sum + (item.lineTotal.amount || 0);
  }, 0);

  // Crear una nueva variable con la suma de los valores numéricos de customerCommissionTotal y subtotal
  const totalSumValue = subtotal + customerCommissionTotal;

  // Formatear el resultado total
  const formattedTotalSum = intl.formatNumber(totalSumValue / 100, {
    style: 'currency',
    currency,
  });

  // Calcular si la comisión del cliente es el 10% del totalSumValue
  const isCustomerCommission10Percent = customerCommissionTotal === totalSumValue * 0.1;

  // Ajustar el valor final dependiendo de si la comisión es el 10%
  const adjustedFinalTotal = isCustomerCommission10Percent
    ? intl.formatNumber(((subtotal - customerCommissionTotal) * 0.9) / 100, {
        style: 'currency',
        currency,
      })
    : intl.formatNumber(subtotal / 100, {
        style: 'currency',
        currency,
      });

  const classes = classNames(rootClassName || css.root, className);
  const newSubtotal = subtotal - customerCommissionTotal;
  const formattedNewSubtotal = intl.formatNumber(newSubtotal / 100, {
    style: 'currency',
    currency,
  }); 
  //Cuando customerCommissionTotal(Monto de reserva) es el 20% del subtotal(A pagar al oferente) 
  //muestra formattedNewSubtotal(subtotal - customerCommissionTotal) en A pagar al oferente (caso persona) sino muestra formattedSubTotal(caso tienda)
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

      <div className={css.subTotalLineItem}>
        <span className={css.itemLabel}>
          <FormattedMessage id="OrderBreakdown.subTotal" />
        </span>
        <span className={css.itemValue}>
          {customerCommissionTotal === subtotal * 0.8
            ? adjustedFinalTotal
            : customerCommissionTotal === subtotal * 0.2
            ? formattedNewSubtotal
            : formattedSubTotal}
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
        isProvider={userRole === 'provider'}
        marketplaceName={marketplaceName}
        intl={intl}
      />

      <div className={css.commissionLineItem}>
        <hr className={css.totalDivider} />
        <div className={css.lineItemTotal}>
          <div className={css.totalLabel}>
            <FormattedMessage id="OrderBreakdown.total" />
          </div>
          <div className={css.totalPrice}>
            {customerCommissionTotal === subtotal * 0.2 ? adjustedFinalTotal : formattedTotalSum} 
          </div>
        </div>
      </div>
      <span className={css.feeInfo}>
        <FormattedMessage id="OrderBreakdown.commissionFeeNote" />
        <br />
        <FormattedMessage id="OrderBreakdown.commissionFeeNote2" />
      </span>
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
