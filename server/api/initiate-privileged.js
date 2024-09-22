const { transactionLineItems } = require('../api-util/lineItems');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body;
  const sdk = getSdk(req, res);
  let lineItems = null;
  const listingPromise = () =>
    isOwnListing
    ? sdk.ownListings.show({ id: listingId })
    : sdk.listings.show({ id: listingId, include: ['author'] });
    
    Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
    const listing = showListingResponse.data.data;
    const commissionAsset = fetchAssetsResponse.data.data[0];
    
    const author = showListingResponse.data.included[0];
    const { publicData } = author.attributes.profile;
    
    const providerCommission = obtenerComisionProveedor(publicData);
    
    const { customerCommission } =
    commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};
    
    const lineItems = transactionLineItems(
    listing,
    orderData,
    providerCommission,
    customerCommission
    );

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;
      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
        },
      };
      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};