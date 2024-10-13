const {
  calculateQuantityFromDates,
  calculateQuantityFromHours,
  calculateTotalFromLineItems,
  calculateShippingFee,
  hasCommissionPercentage,
} = require('./lineItemHelpers');
const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

/**
 * Get quantity and add extra line-items that are related to delivery method
 *
 * @param {Object} orderData should contain stockReservationQuantity and deliveryMethod
 * @param {*} publicData should contain shipping prices
 * @param {*} currency should point to the currency of listing's price.
 */
const getItemQuantityAndLineItems = (orderData, publicData, currency) => {
  // Check delivery method and shipping prices
  const quantity = orderData ? orderData.stockReservationQuantity : null;
  const deliveryMethod = orderData && orderData.deliveryMethod;
  const isShipping = deliveryMethod === 'shipping';
  const isPickup = deliveryMethod === 'pickup';
  const { shippingPriceInSubunitsOneItem, shippingPriceInSubunitsAdditionalItems } =
    publicData || {};

  // Calculate shipping fee if applicable
  const shippingFee = isShipping
    ? calculateShippingFee(
        shippingPriceInSubunitsOneItem,
        shippingPriceInSubunitsAdditionalItems,
        currency,
        quantity
      )
    : null;

  // Add line-item for given delivery method.
  // Note: by default, pickup considered as free.
  const deliveryLineItem = !!shippingFee
    ? [
        {
          code: 'line-item/shipping-fee',
          unitPrice: shippingFee,
          quantity: 1,
          includeFor: ['customer', 'provider'],
        },
      ]
    : isPickup
    ? [
        {
          code: 'line-item/pickup-fee',
          unitPrice: new Money(0, currency),
          quantity: 1,
          includeFor: ['customer', 'provider'],
        },
      ]
    : [];

  return { quantity, extraLineItems: deliveryLineItem };
};

/**
 * Get quantity for arbitrary units for time-based bookings.
 *
 * @param {*} orderData should contain quantity
 */
const getHourQuantityAndLineItems = orderData => {
  const { bookingStart, bookingEnd } = orderData || {};
  const quantity =
    bookingStart && bookingEnd ? calculateQuantityFromHours(bookingStart, bookingEnd) : null;

  return { quantity, extraLineItems: [] };
};

/**
 * Calculate quantity based on days or nights between given bookingDates.
 *
 * @param {*} orderData should contain bookingDates
 * @param {*} code should be either 'line-item/day' or 'line-item/night'
 */
const getDateRangeQuantityAndLineItems = (orderData, code) => {
  // bookingStart & bookingend are used with day-based bookings (how many days / nights)
  const { bookingStart, bookingEnd } = orderData || {};
  const quantity =
    bookingStart && bookingEnd ? calculateQuantityFromDates(bookingStart, bookingEnd, code) : null;

  return { quantity, extraLineItems: [] };
};
/**
 * Calculate units based on days or nights between given bookingDates. Returns units and seats.
 *
 * @param {*} orderData should contain booking dates and seats
 * @param {*} code should be either 'line-item/day' or 'line-item/night'
 */
const getDateRangeUnitsSeatsLineItems = (orderData, code) => {
  const { bookingStart, bookingEnd, seats } = orderData;

  const units =
    bookingStart && bookingEnd
      ? calculateQuantityFromDates(bookingStart, bookingEnd, code)
      : null;

  return { units, seats, extraLineItems: [] };
};
/**
 * Returns collection of lineItems (max 50)
 *
 * @param {Object} listing
 * @param {Object} orderData
 * @param {Object} providerCommission
 * @param {Object} customerCommission
 * @returns {Array} lineItems
 */
exports.transactionLineItems = (listing, orderData, providerCommission, customerCommission) => {
  const publicData = listing.attributes.publicData;
  const unitPrice = listing.attributes.price;
  const currency = unitPrice.currency;
  const { obtenerComisionCliente } = require('./lineItemHelpers'); // Ajusta la ruta del archivo
  const comisionCliente = obtenerComisionCliente(publicData);
  const userType = orderData.userType;

  /**
   * Lógica para determinar el porcentaje de comisión del cliente basado en userType
   */
  let customerCommissionPercentage = comisionCliente;

  if (userType === 'tienda') {
    customerCommissionPercentage = 10; // 10% para "tienda"
  } else {
    customerCommissionPercentage = 10; // 20% para "persona_fisica"
  } 

  // Actualizar el objeto customerCommission con el porcentaje determinado
  const adjustedCustomerCommission = {
    ...customerCommission,
    percentage: customerCommissionPercentage,
  };

  /**
   * Función auxiliar para resolver el precio de la tarifa de casco (helmet fee)
   */
  const resolveHelmetFeePrice = (listing) => {
    const publicData = listing.attributes.publicData;
    const helmetFee = publicData && publicData.helmetFee;
    const { amount, currency } = helmetFee || {};

    if (amount && currency) {
      return new Money(amount, currency);
    }
  
    return null;
  };
  
  /**
   * Cálculo de la cantidad y los line-items extra según el tipo de unidad
   */
  const unitType = publicData.unitType;
  const code = `line-item/${unitType}`;

  const quantityAndExtraLineItems =
    unitType === 'item'
      ? getItemQuantityAndLineItems(orderData, publicData, currency)
      : unitType === 'hour'
      ? getHourQuantityAndLineItems(orderData)
      : ['day', 'night'].includes(unitType) && !!orderData.seats
      ? getDateRangeUnitsSeatsLineItems(orderData, code)
      : ['day', 'night'].includes(unitType)
      ? getDateRangeQuantityAndLineItems(orderData, code)
      : {};

  const { quantity, units, seats, extraLineItems } = quantityAndExtraLineItems;

  // Validación de la información de cantidad
  if (!quantity && !(units && seats)) {
    const message = `Error: transition should contain quantity information: 
      stockReservationQuantity, quantity, units & seats, or bookingStart & bookingEnd (if "line-item/day" or "line-item/night" is used)`;
    const error = new Error(message);
    error.status = 400;
    error.statusText = message;
    error.data = {};
    throw error;
  }

  // Determinar si se usa cantidad o unidades y asientos
  const quantityOrSeats = !!units && !!seats ? { units, seats } : { quantity };

  /**
   * Crear el line-item base para la orden
   */
  const order = {
    code,
    unitPrice,
    ...quantityOrSeats,
    includeFor: ['customer', 'provider'],
  };

  // Resolver la tarifa de casco si aplica
  const helmetFeePrice = orderData.hasHelmetFee ? resolveHelmetFeePrice(listing) : null;
  const helmetFee = helmetFeePrice
    ? [
        {
          code: 'line-item/Descuento por días de alquiler',
          unitPrice: helmetFeePrice,
          quantity: -1,
          includeFor: ['customer', 'provider'],
        },
      ]
    : [];

  // Función para obtener la negación del porcentaje (para la comisión del proveedor)
  const getNegation = (percentage) => {
    return -1 * percentage;
  };

  // Comisiones del proveedor
  const providerCommissionMaybe = hasCommissionPercentage(providerCommission)
    ? [
        {
          code: 'line-item/provider-commission',
          unitPrice: calculateTotalFromLineItems([order, ...helmetFee]),
          percentage: getNegation(providerCommission.percentage),
          includeFor: ['customer','provider'],
        },
      ]
    : [];

  // **Comisiones del cliente ajustadas según userType**
  const customerCommissionMaybe = hasCommissionPercentage(adjustedCustomerCommission)
    ? [
        {
          code: 'line-item/customer-commission',
          unitPrice: calculateTotalFromLineItems([order, ...helmetFee]),
          percentage: adjustedCustomerCommission.percentage,
          includeFor: ['customer'],
        },
      ]
    : [];

  // Let's keep the base price (order) as first line item and provider and customer commissions as last.
  // Note: the order matters only if OrderBreakdown component doesn't recognize line-item.
  const lineItems = [order, ...extraLineItems, ...helmetFee, ...providerCommissionMaybe, ...customerCommissionMaybe];

  return lineItems;
};