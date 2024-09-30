// CartPage.js shows the listings you have selected from a specific seller.

// If you have listings in your cart from multiple sellers, you can see a “Next seller” button. 
// You can also see a line item breakdown and a “Buy now” button, although these won’t show up until you have updated your line item calculation – we will do this in a future blog post.
// CartPage also checks the delivery options for the listings in the author’s cart. If only one delivery option is available across the listings – for example three listings all allow pickup but only one allows shipping – then the shared one is automatically saved to the cart:
// {
//   "63e3a8f4-84df-4dd7-995b-a876fec5a3e9": {
//     "65ca03f1-9331-429a-b1f5-839bea317bf5": {
//       "count": 2
//     },
//     "deliveryMethod": "pickup"
//   }
// }
// If all listings in the cart allow both pickup and shipping, the page shows CartDeliveryForm, and only saves the delivery information after the user has made a selection with the form.

//
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { useConfiguration } from '../../context/configurationContext';
import { initializeCardPaymentData } from '../../ducks/stripe.duck.js';
import { createResourceLocatorString, findRouteByRouteName } from '../../util/routes';
import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { createSlug } from '../../util/urlHelpers';
import { PURCHASE_PROCESS_NAME } from '../../transactions/transaction.js';
import { FormattedMessage } from '../../util/reactIntl';
import { CartDeliveryForm } from './CartDeliveryForm.js';

import { Button, LayoutSingleColumn, Page, UserNav } from '../../components';

import EstimatedCustomerBreakdownMaybe from '../../components/OrderPanel/EstimatedCustomerBreakdownMaybe';

import CartCard from './CartCard/CartCard';

import css from './CartPage.module.css';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import {
  getCartListingsById,
  loadData,
  deliveryOptions,
  setCartDelivery,
  setAuthorIdx,
  toggleCart,
} from './CartPage.duck';

const CartPage = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  const {
    currentAuthor,
    listings,
    cart,
    cartLineItems = [],
    callSetInitialValues,
    scrollingDisabled,
    currentAuthorDelivery: delivery,
    toggleDeliveryInProgress,
    queryInProgress,
    setAuthorIdx,
    authorIdx,
    onInitializeCardPaymentData,
    onReloadData,
    onSetCartDelivery,
    onToggleCart,
  } = props;

  const history = useHistory();
  const authorId = currentAuthor?.id.uuid;
  const authorName = currentAuthor?.attributes?.profile.displayName;
  const authors = cart && Object.keys(cart);

  // Determine whether the listings in the cart allow
  // shipping, pickup, or both
  const determineShipping = (acc, val) => {
    const { shippingEnabled, pickupEnabled } = val.attributes.publicData;
    return {
      shippingEnabled: acc.shippingEnabled && shippingEnabled,
      pickupEnabled: acc.pickupEnabled && pickupEnabled,
    };
  };

  // Initialise the reducer with both options set to true
  const cartDelivery = listings.reduce(determineShipping, {
    shippingEnabled: true,
    pickupEnabled: true,
  });

  
  const availableDelivery =
    cartDelivery.shippingEnabled && cartDelivery.pickupEnabled
      ? deliveryOptions.BOTH
      : cartDelivery.shippingEnabled
      ? deliveryOptions.SHIPPING
      : cartDelivery.pickupEnabled
      ? deliveryOptions.PICKUP
      : !!cartLineItems.length
      ? deliveryOptions.NONE
      : null;

  
  // Determine whether to automatically update cart delivery
  // when only one delivery option is available for this author's cart
  const updateDelivery =
    (availableDelivery === deliveryOptions.PICKUP ||
      availableDelivery === deliveryOptions.SHIPPING) &&
    delivery !== availableDelivery &&
    !toggleDeliveryInProgress &&
    !queryInProgress &&
    authorId &&
    authorId === authors[authorIdx];

  // Update cart delivery automatically if necessary
  useEffect(() => {
    if (updateDelivery && authorId) {
      onSetCartDelivery(authorId, availableDelivery);
    }
  }, [updateDelivery, authorId, availableDelivery, onSetCartDelivery])

  const submitSelectDelivery = values => {
    const { delivery } = values;
    onSetCartDelivery(authorId, delivery);
  };

  /**
   * Render either a label for the delivery method or a form to select one
   */
  const deliveryInfo = () => {
    switch (availableDelivery) {
      case deliveryOptions.BOTH:
        return (
          <CartDeliveryForm
            onSubmit={submitSelectDelivery}
            intl={intl}
            className={css.deliverySelect}
            initialValues={{ delivery }}
          />
        );
      case deliveryOptions.SHIPPING:
        return <FormattedMessage id="CartPage.deliveryShipping" />;
      case deliveryOptions.PICKUP:
        return <FormattedMessage id="CartPage.deliveryPickup" />;
      case deliveryOptions.NONE:
        return <FormattedMessage id="CartPage.deliveryNotSet" />;
      default:
        return null;
    }
  };

  const pageTitle = currentAuthor ? (
    <FormattedMessage id="CartPage.pageTitleAuthor" values={{ name: authorName }} />
  ) : (
    <FormattedMessage id="CartPage.pageTitleNoItems" />
  );

  /**
  * Handle cart purchase:
  * - Set necessary initial values
  * - Redirect to CheckoutPage
  */
  const buyCart = () => {
    const listing = listings[0];

    const saveToSessionStorage = props.currentUser;

    // Customize checkout page state with current listing and selected orderData
    const authorCart = cart[currentAuthor.id.uuid];

    // Send details for each cart listing to CheckoutPage to be displayed
    const cartListingDetails = listings.map(l => {
      return {
        id: l.id,
        attributes: l.attributes,
        price: `${l.attributes.price.amount / 100} ${l.attributes.price.currency}`,
        count: authorCart[l.id.uuid].count,
        images: l.images,
      };
    });

    const initialValues = {
      listing,
      cartListings: cartListingDetails,
      cartAuthorId: currentAuthor.id.uuid,
      orderData: {
        cart: authorCart,
        deliveryMethod: delivery,
      },
      confirmPaymentError: null,
    };

    const { setInitialValues } = findRouteByRouteName('CheckoutPage', routeConfiguration);
    callSetInitialValues(setInitialValues, initialValues, saveToSessionStorage);

    // Clear previous Stripe errors from store if there is any
    onInitializeCardPaymentData();

    // Redirect to CheckoutPage
    history.push(
      createResourceLocatorString(
        'CheckoutPage',
        routeConfiguration,
        { id: listing.id.uuid, slug: createSlug(authorName) },
        {}
      )
    );
  };

  /**
  * Change the author whose cart is displayed
  */ 
  const getNextAuthor = () => {
    const newAuthorIdx = authorIdx + 1 < authors?.length ? authorIdx + 1 : 0;
    setAuthorIdx(newAuthorIdx);
    const authorId = authors[newAuthorIdx];
    onReloadData(null, null, config, authorId);
  };

  /**
  * Get the count of a specific item in the cart
  */ 
  const getCartCount = listing => {
    const listingId = listing?.id?.uuid;
    const authorId = listing?.author?.id?.uuid;

    return (
      (authorId && listingId && cart && cart[authorId] && cart[authorId][listingId]?.count) || 0
    );
  };

  return (
    <Page title="Shopping cart" scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={
          <>
            <TopbarContainer currentPage="CartPage" />
            <UserNav currentPage="CartPage" />
          </>
        }
        footer={<FooterContainer />}
      >
        <h1 className={css.title}>{pageTitle}</h1>
        {authors?.length > 1 && (
          <Button className={css.buyNowButton} onClick={getNextAuthor}>
            <FormattedMessage id="CartPage.nextAuthor" count={authors.length} />
          </Button>
        )}
        <div className={css.splitView}>
          <div className={css.listingPanel}>
            <div className={css.listingCards}>
              {listings.map(l => (
                <CartCard
                  key={l.id.uuid}
                  listing={l}
                  count={getCartCount(l)}
                  config={config}
                  onToggleCart={onToggleCart}
                />
              ))}
            </div>
          </div>
          <div className={css.breakdownPanel}>
            <EstimatedCustomerBreakdownMaybe
              lineItems={cartLineItems}
              processName={PURCHASE_PROCESS_NAME}
              marketplaceName={config.marketplaceName}
            />
            {deliveryInfo()}
          </div>
        </div>
        {cartLineItems?.length > 0 && (
          <Button className={css.buyNowButton} onClick={buyCart} disabled={!delivery}>
            <FormattedMessage id="CartPage.buyNowButton" />
          </Button>
        )}
      </LayoutSingleColumn>
    </Page>
  );
};

CartPage.defaultProps = {
  listings: null,
};

const mapStateToProps = state => {
  const {
    authorIdx,
    currentPageResultIds,
    currentAuthor,
    pagination,
    queryInProgress,
    queryListingsError,
    queryParams,
    cart,
    cartLineItems,
    currentAuthorDelivery,
    toggleDeliveryInProgress,
  } = state.CartPage;
  const { currentUser } = state.user;
  const listings = (currentPageResultIds && getCartListingsById(state, currentPageResultIds)) || [];
  return {
    authorIdx,
    currentPageResultIds,
    currentAuthor,
    currentUser,
    listings,
    cart,
    cartLineItems,
    pagination,
    queryInProgress,
    queryListingsError,
    queryParams,
    scrollingDisabled: isScrollingDisabled(state),
    currentAuthorDelivery,
    toggleDeliveryInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  callSetInitialValues: (setInitialValues, initialValues, saveToSessionStorage) =>
    dispatch(setInitialValues(initialValues, saveToSessionStorage)),
  onInitializeCardPaymentData: () => dispatch(initializeCardPaymentData()),
  onReloadData: (params, search, config, authorId) =>
    dispatch(loadData(params, search, config, authorId)),
  onSetCartDelivery: (authorId, delivery) => dispatch(setCartDelivery(authorId, delivery)),
  onToggleCart: (listingId, authorId, increment) =>
    dispatch(toggleCart(listingId, authorId, increment)),
  setAuthorIdx: idx => dispatch(setAuthorIdx(idx)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CartPage);
