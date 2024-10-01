// only creates line items for orders with listings of unitType: item, because in this implementation only listings with that unit type can be added to cart
// maps the cart listing array to line items
// determines the shipping price based on the listing with the highest shipping price and additional price in the cart
// calculates commissions similarly to the default line item calculation
// returns an array of line items

const {
    calculateTotalFromLineItems,
    calculateShippingFee,
    hasCommissionPercentage,
    calculateTotalPriceFromQuantity,
  } = require('./lineItemHelpers');
  const { types } = require('sharetribe-flex-sdk');
  const { Money } = types;
  const Decimal = require('decimal.js');
  
  /**
   * Get cart line items and add extra line-items that are related to delivery method
   *
   * @param {Object} orderData should contain a cart object with listing ids and their respective counts
   * @param {*} listings should contain public data with shipping prices
   * @param {*} currency should point to the currency of listing's price.
   */
  const getItemCartLineItems = (orderData, listings, currency) => {
    const { cart } = orderData;
    const { deliveryMethod } = cart;
  
    const isShipping = deliveryMethod === 'shipping';
    const isPickup = deliveryMethod === 'pickup';
  
    let orderQuantity = 0;
    let mainShippingPriceInSubunitsOneItem = 0;
    let mainShippingPriceInSubunitsAdditionalItems = 0;
  
    // Create listing line items
    const listingLineItems = listings.map(l => {
      const listingInCart = cart[l.id.uuid];
  
      const {
        unitType,
        shippingPriceInSubunitsOneItem,
        shippingPriceInSubunitsAdditionalItems,
      } = l.attributes.publicData;
  
      const code = `line-item/${unitType}`;
      const quan = parseFloat(listingInCart.count);
      const unitPrice = l.attributes.price;
  
      orderQuantity += quan;
  
      // Set the main shipping price to be the highest shipping price across all listings
      if (isShipping && shippingPriceInSubunitsOneItem > mainShippingPriceInSubunitsOneItem) {
        mainShippingPriceInSubunitsOneItem = shippingPriceInSubunitsOneItem;
        mainShippingPriceInSubunitsAdditionalItems = shippingPriceInSubunitsAdditionalItems;
      }
  
      return {
        code,
        unitPrice,
        quantity: new Decimal(quan),
        lineTotal: calculateTotalPriceFromQuantity(unitPrice, quan),
        includeFor: ['customer', 'provider'],
      };
    });
  
    // const { shippingPriceInSubunitsOneItem, shippingPriceInSubunitsAdditionalItems } =
    //   publicData || {};
  
    // Calculate shipping fee if applicable
    const shippingFee = isShipping
      ? calculateShippingFee(
          mainShippingPriceInSubunitsOneItem,
          mainShippingPriceInSubunitsAdditionalItems,
          currency,
          orderQuantity
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
  
    return { listingLineItems, deliveryLineItem };
  };
  
  /**
   * Returns collection of lineItems (max 50)
   *
   * All the line-items dedicated to _customer_ define the "payin total".
   * Similarly, the sum of all the line-items included for _provider_ create "payout total".
   * Platform gets the commission, which is the difference between payin and payout totals.
   *
   * Each line items has following fields:
   * - `code`: string, mandatory, indentifies line item type (e.g. \"line-item/cleaning-fee\"), maximum length 64 characters.
   * - `unitPrice`: money, mandatory
   * - `lineTotal`: money
   * - `quantity`: number
   * - `percentage`: number (e.g. 15.5 for 15.5%)
   * - `seats`: number
   * - `units`: number
   * - `includeFor`: array containing strings \"customer\" or \"provider\", default [\":customer\"  \":provider\" ]
   *
   * Line item must have either `quantity` or `percentage` or both `seats` and `units`.
   *
   * `includeFor` defines commissions. Customer commission is added by defining `includeFor` array `["customer"]` and provider commission by `["provider"]`.
   *
   * @param {Object} listing
   * @param {Object} orderData
   * @param {Object} providerCommission
   * @returns {Array} lineItems
   */
  exports.transactionLineItems = (listings, orderData, providerCommission, customerCommission) => {
    const listing = listings[0];
    const publicData = listing.attributes.publicData;
    const unitPrice = listing.attributes.price;
    const currency = unitPrice.currency;
  
    /**
     * Pricing starts with order's base price:
     * Listing's price is related to a single unit. It needs to be multiplied by quantity
     *
     * Initial line-item needs therefore:
     * - code (based on unitType)
     * - unitPrice
     * - quantity
     * - includedFor
     */
  
    // Unit type needs to be one of the following:
    // day, night, hour or item
    const unitType = publicData.unitType;
  
    // Here "extra line-items" mean line-items that are tied to unit type
    // E.g. by default, "shipping-fee" is tied to 'item' aka buying products.
    // Currently only products can use a cart, so we only return line items for 
    // unitType: 'item'.
    const cartAndExtraLineItems =
      unitType === 'item'
        ? getItemCartLineItems(orderData, listings, currency)
        : {};
  
    const { listingLineItems, deliveryLineItem } = cartAndExtraLineItems;
  
    // Provider commission reduces the amount of money that is paid out to provider.
    // Therefore, the provider commission line-item should have negative effect to the payout total.
    const getNegation = percentage => {
      return -1 * percentage;
    };
  
    // Note: extraLineItems for product selling (aka shipping fee)
    //       is not included to commission calculation.
    const providerCommissionMaybe = hasCommissionPercentage(providerCommission)
      ? [
          {
            code: 'line-item/provider-commission',
            unitPrice: calculateTotalFromLineItems([...listingLineItems]),
            percentage: getNegation(providerCommission.percentage),
            includeFor: ['provider'],
          },
        ]
      : [];
  
    // The customer commission is what the customer pays for the transaction, and
    // it is added on top of the order price to get the customer's payin price:
    // orderPrice + customerCommission = customerPayin
    const customerCommissionMaybe = hasCommissionPercentage(customerCommission)
      ? [
          {
            code: 'line-item/customer-commission',
            unitPrice: calculateTotalFromLineItems([...listingLineItems]),
            percentage: customerCommission.percentage,
            includeFor: ['customer'],
          },
        ]
      : [];
  
    // Let's keep the base price (order) as first line item and provider's commission as last one.
    // Note: the order matters only if OrderBreakdown component doesn't recognize line-item.
    const lineItems = [
      ...listingLineItems,
      ...deliveryLineItem,
      ...providerCommissionMaybe,
      ...customerCommissionMaybe,
    ];
  
    return lineItems;
  };