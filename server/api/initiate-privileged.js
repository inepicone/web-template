const { transactionLineItems } = require('../api-util/lineItems');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const { obtenerComisionCliente } = require('../api-util/lineItemHelpers'); // Si existe en tu código
module.exports = (req, res) => {
  const {  isSpeculative, orderData, bodyParams, queryParams } = req.body;
  const sdk = getSdk(req, res);
  let lineItems = null;
  const listingId = bodyParams.params.listingId;
  const listingPromise = () => sdk.listings.show({ id: listingId, include: ['author'] });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const author = showListingResponse.data.included[0];
      const { publicData } = author.attributes.profile;

      const customerCommission = obtenerComisionCliente(publicData);
      const providerCommission = obtenerComisionCliente(publicData);

/*       const { providerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {}; */
        
         lineItems = transactionLineItems(
        listing,
        { ...orderData, ...bodyParams.params },
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