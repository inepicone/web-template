const { transactionLineItems } = require('../api-util/lineItems');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');

// Definir comisiones para tiendas y particulares
const COMISION_TIENDAS = 0.10; // 10%
const COMISION_PARTICULARES = 0.20; // 20%

// Función para obtener la comisión según el tipo de usuario
const calcularComision = (tipoUsuario) => {
  if (tipoUsuario === 'tienda') {
    return COMISION_TIENDAS;
  } else if (tipoUsuario === 'particular') {
    return COMISION_PARTICULARES;
  } else {
    throw new Error("Tipo de usuario no reconocido");
  }
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body;
  const sdk = getSdk(req, res);
  let lineItems = null;

  // Obtener los detalles del anuncio (listing) y la comisión
  const listingPromise = () => sdk.listings.show({ id: bodyParams?.params?.listingId });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      // Obtener la comisión del proveedor (si existe en el asset de la API)
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      // Obtener el tipo de usuario del proveedor desde el listing
      const providerType = listing?.relationships?.author?.data?.attributes?.profile?.type;  // Asegúrate que este sea el campo correcto
      const comisionCalculada = calcularComision(providerType);

      // Combinar la comisión calculada con los valores obtenidos de fetchCommission
      const comisionProveedorFinal = providerCommission || comisionCalculada;

      // Generar las líneas de pedido incluyendo la comisión
      lineItems = transactionLineItems(
        listing,
        { ...orderData, ...bodyParams.params },
        comisionProveedorFinal,
        customerCommission
      );

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;

      // Añadir lineItems a los body params
      const body = {
        ...bodyParams,
        params: {
          ...params,
          lineItems,
        },
      };

      // Iniciar transacción especulativa o no especulativa según corresponda
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