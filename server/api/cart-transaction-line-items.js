// parses listing ids from the cart and fetches then with the Sharetribe SDK
// calls a helper function transactionLineItems imported from cartLineItems.js to calculate an array of line items based on the cart
// enhances the line items to correspond with what the Sharetribe backend would create
// returns the line item array to the frontend

const { transactionLineItems } = require('../api-util/cartLineItems');
const { getSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const { constructValidLineItems, getListingIdsFromCart } = require('../api-util/lineItemHelpers');

module.exports = (req, res) => {
  const { isOwnListing, orderData } = req.body;

  const listingIds = getListingIdsFromCart(orderData?.cart);

  const sdk = getSdk(req, res);

  const listingPromise = isOwnListing
    ? () => sdk.ownListings.query({ ids: listingIds })
    : () => sdk.listings.query({ ids: listingIds });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listings = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const lineItems = transactionLineItems(
        listings,
        orderData,
        providerCommission,
        customerCommission
      );

      // Because we are using returned lineItems directly in this template we need to use the helper function
      // to add some attributes like lineTotal and reversal that Marketplace API also adds to the response.
      const validLineItems = constructValidLineItems(lineItems);

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ data: validLineItems }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
      console.log('e.data', JSON.stringify(e.data, null, 2));
    });
};