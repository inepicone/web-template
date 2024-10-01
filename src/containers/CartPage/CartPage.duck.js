// CartPage.duck.js contains all the state management and SDK calls you need to make related 
// to shopping cart handling in the application. They are connected to CartPage.js 
// with mapStateToProps and mapDispatchToProps. 

import {
    updatedEntities,
    denormalisedEntities,
    denormalisedResponseEntities,
  } from '../../util/data';
  import { storableError } from '../../util/errors';
  import { createImageVariantConfig } from '../../util/sdkLoader';
  import { parse } from '../../util/urlHelpers';
  // import { cartTransactionLineItems } from '../../util/api';
  import { currentUserShowSuccess, fetchCurrentUser } from '../../ducks/user.duck';
  
  import { cartTransactionLineItems } from '../../util/api';

  export const FETCH_LISTINGS_REQUEST = 'app/CartPage/FETCH_LISTINGS_REQUEST';
  export const FETCH_LISTINGS_SUCCESS = 'app/CartPage/FETCH_LISTINGS_SUCCESS';
  export const FETCH_LISTINGS_ERROR = 'app/CartPage/FETCH_LISTINGS_ERROR';
  
  export const FETCH_LINE_ITEMS_REQUEST = 'app/CartPage/FETCH_LINE_ITEMS_REQUEST';
  export const FETCH_LINE_ITEMS_SUCCESS = 'app/CartPage/FETCH_LINE_ITEMS_SUCCESS';
  export const FETCH_LINE_ITEMS_ERROR = 'app/CartPage/FETCH_LINE_ITEMS_ERROR';
  
  export const TOGGLE_CART_REQUEST = 'app/CartPage/TOGGLE_CART_REQUEST';
  export const TOGGLE_CART_SUCCESS = 'app/CartPage/TOGGLE_CART_SUCCESS';
  export const TOGGLE_CART_ERROR = 'app/CartPage/TOGGLE_CART_ERROR';
  
  export const TOGGLE_DELIVERY_REQUEST = 'app/CartPage/TOGGLE_DELIVERY_REQUEST';
  export const TOGGLE_DELIVERY_SUCCESS = 'app/CartPage/TOGGLE_DELIVERY_SUCCESS';
  export const TOGGLE_DELIVERY_ERROR = 'app/CartPage/TOGGLE_DELIVERY_ERROR';
  
  export const ADD_CART_ENTITIES = 'app/CartPage/ADD_CART_ENTITIES';
  
  export const SET_CURRENT_AUTHOR = 'app/CartPage/SET_CURRENT_AUTHOR';
  export const SET_CURRENT_AUTHOR_DELIVERY = 'app/CartPage/SET_CURRENT_AUTHOR_DELIVERY';
  export const SET_AUTHOR_IDX = 'app/CartPage/SET_AUTHOR_IDX';
  
  export const deliveryOptions = {
    BOTH: 'both',
    SHIPPING: 'shipping',
    PICKUP: 'pickup',
    NONE: 'none',
  };
  
  const RESULT_PAGE_SIZE = 8;
  
  // ================ Reducer ================ //
  
  const initialState = {
    authorIdx: 0,
    cart: {},
    cartEntities: {},
    cartLineItems: [],
    currentPageResultIds: [],
    currentAuthor: null,
    currentAuthorDelivery: null,
    pagination: null,
    queryParams: null,
    queryInProgress: false,
    queryListingsError: null,
    lineItemsInProgress: false,
    lineItemsError: null,
    toggleCartInProgress: false,
    toggleCartError: null,
    toggleDeliveryInProgress: false,
    toggleDeliveryError: null,
  };
  
  const resultIds = data => data.data.map(l => l.id);
  
  const merge = (state, sdkResponse) => {
    const apiResponse = sdkResponse.data;
    return {
      ...state,
      cartEntities: updatedEntities({ ...state.cartEntities }, apiResponse),
    };
  };
  
  const cartPageReducer = (state = initialState, action = {}) => {
    const { type, payload } = action;
  
    switch (type) {
      case FETCH_LISTINGS_REQUEST:
        return {
          ...state,
          queryParams: payload.queryParams,
          queryInProgress: true,
          queryListingsError: null,
          currentPageResultIds: [],
        };
      case FETCH_LISTINGS_SUCCESS:
        return {
          ...state,
          currentPageResultIds: resultIds(payload.data),
          pagination: payload.data.meta,
          queryInProgress: false,
          cart: payload.cart,
        };
      case FETCH_LISTINGS_ERROR:
        // eslint-disable-next-line no-console
        console.error(payload);
        return { ...state, queryInProgress: false, queryListingsError: payload };
  
      case FETCH_LINE_ITEMS_REQUEST:
        return { ...state, lineItemsInProgress: true, lineItemsError: null };
      case FETCH_LINE_ITEMS_SUCCESS:
        return { ...state, lineItemsInProgress: false, cartLineItems: payload };
      case FETCH_LINE_ITEMS_ERROR:
        return { ...state, lineItemsInProgress: false, lineItemsError: payload };
  
      case TOGGLE_CART_REQUEST:
        return { ...state, toggleCartInProgress: true, toggleCartError: null };
      case TOGGLE_CART_SUCCESS:
        return { ...state, toggleCartInProgress: false, cart: payload };
      case TOGGLE_CART_ERROR:
        return { ...state, toggleCartInProgress: false, toggleCartError: payload };
  
      case TOGGLE_DELIVERY_REQUEST:
        return { ...state, toggleDeliveryInProgress: true, toggleDeliveryError: null };
      case TOGGLE_DELIVERY_SUCCESS:
        return {
          ...state,
          toggleDeliveryInProgress: false,
          cart: payload.cart,
          currentAuthorDelivery: payload.delivery,
        };
      case TOGGLE_DELIVERY_ERROR:
        return { ...state, toggleDeliveryInProgress: false, toggleDeliveryError: payload };
  
      case ADD_CART_ENTITIES:
        return merge(state, payload);
      case SET_CURRENT_AUTHOR:
        return { ...state, currentAuthor: payload, currentAuthorDelivery: null };
      case SET_CURRENT_AUTHOR_DELIVERY:
        return { ...state, currentAuthorDelivery: payload };
      case SET_AUTHOR_IDX:
        return { ...state, authorIdx: payload };
      default:
        return state;
    }
  };
  
  export default cartPageReducer;
  
  // ================ Selectors ================ //
  
  /**
   * Get the denormalised cart listing entities with the given IDs
   *
   * @param {Object} state the full Redux store
   * @param {Array<UUID>} listingIds listing IDs to select from the store
   */
  export const getCartListingsById = (state, listingIds) => {
    const { cartEntities } = state.CartPage;
    const resources = listingIds.map(id => ({
      id,
      type: 'listing',
    }));
    const throwIfNotFound = false;
    return denormalisedEntities(cartEntities, resources, throwIfNotFound);
  };
  
  /**
   * Return the listing ids of an author specific cart
   * @param {*} cart 
   * @returns array of listing ids
   */
  export const getCartListingIds = cart => {
    return Object.keys(cart).filter(key => key !== 'deliveryMethod');
  }
  
  /**
   * Get the total number of items in cart. Optionally get the count for only
   * the author being currently viewed on CartPage
   * @param {*} state
   * @param {*} useCurrentAuthorOnly
   */
  export const getCartCount = (state, useCurrentAuthorOnly = false) => {
    const { cart } = state.user?.currentUser?.attributes.profile.privateData || {};
    const { currentAuthor } = state?.CartPage;
  
    const authorId =
      useCurrentAuthorOnly && cart ? currentAuthor?.id.uuid ?? Object.keys(cart)[0] : null;
  
    if (!cart || (useCurrentAuthorOnly && !authorId)) {
      return null;
    }
  
    let counts;
  
    if (authorId) {
      counts = getAuthorListingIds(authorId, cart).map(l => cart[authorId][l].count);
    } else {
      counts = Object.keys(cart).flatMap(author => {
        const listings = getAuthorListingIds(author, cart);
        return listings.map(l => cart[author][l].count);
      });
    }
  
    return counts.length ? counts.reduce((acc, val) => acc + val) : 0;
  };
  
  // ================ Action creators ================ //
  
  export const addCartEntities = sdkResponse => ({
    type: ADD_CART_ENTITIES,
    payload: sdkResponse,
  });
  
  export const queryListingsRequest = queryParams => ({
    type: FETCH_LISTINGS_REQUEST,
    payload: { queryParams },
  });
  
  export const queryListingsSuccess = (response, cart) => ({
    type: FETCH_LISTINGS_SUCCESS,
    payload: { data: response.data, cart },
  });
  
  export const queryListingsError = e => ({
    type: FETCH_LISTINGS_ERROR,
    error: true,
    payload: e,
  });
  
  export const fetchLineItemsRequest = () => ({ type: FETCH_LINE_ITEMS_REQUEST });
  export const fetchLineItemsSuccess = result => ({
    type: FETCH_LINE_ITEMS_SUCCESS,
    payload: result.data,
  });
  export const fetchLineItemsError = e => ({ type: FETCH_LINE_ITEMS_ERROR, error: true, payload: e });
  
  export const toggleCartRequest = () => ({ type: TOGGLE_CART_REQUEST });
  export const toggleCartSuccess = result => ({
    type: TOGGLE_CART_SUCCESS,
    payload: result,
  });
  export const toggleCartError = e => ({ type: TOGGLE_CART_ERROR, error: true, payload: e });
  
  export const toggleDeliveryRequest = () => ({ type: TOGGLE_DELIVERY_REQUEST });
  export const toggleDeliverySuccess = result => ({
    type: TOGGLE_DELIVERY_SUCCESS,
    payload: result,
  });
  export const toggleDeliveryError = e => ({ type: TOGGLE_DELIVERY_ERROR, error: true, payload: e });
  
  export const setCurrentAuthor = author => ({ type: SET_CURRENT_AUTHOR, payload: author });
  export const setCurrentAuthorDelivery = delivery => ({
    type: SET_CURRENT_AUTHOR_DELIVERY,
    payload: delivery,
  });
  export const setAuthorIdx = idx => ({ type: SET_AUTHOR_IDX, payload: idx });
  
  /**
   * Clear the cart related to the provider specified by authorId
   * @param {*} authorId
   */
  export const clearCart = authorId => (dispatch, getState, sdk) => {
    dispatch(toggleCartRequest);
  
    const { cart, currentAuthor } = getState().CartPage;
  
    const newCart = {
      ...cart,
    };
  
    delete newCart[authorId];
  
    dispatch(updateCurrentUserCart(newCart))
      .then(() => {
        dispatch(toggleCartSuccess(null));
  
        if (currentAuthor?.id.uuid === authorId) {
          dispatch(setCurrentAuthor(null));
        }
      })
      .catch(e => {
        dispatch(toggleCartError(storableError(e)));
      });
  };
  
  /**
   * Fetch listings currently in cart
   * @param {*} queryParams
   * @param {*} config
   * @param {*} authorId
   * @param {*} currentUser
   */
  export const queryCartListings = (queryParams, config, authorId = null, currentUser = null) => (
    dispatch,
    getState,
    sdk
  ) => {
    dispatch(queryListingsRequest(queryParams));
  
    const user = currentUser ?? getState().user.currentUser;
    const cart = user?.attributes.profile.privateData?.cart || {};
  
    const { currentAuthor } = getState().CartPage;
    const cartAuthorId = authorId ?? currentAuthor?.id.uuid ?? Object.keys(cart)[0];
  
    const { aspectWidth = 1, aspectHeight = 1 } = config.layout.listingImage;
    const variantPrefix = 'cart-card';
    const listingVariantPrefix = 'listing-card';
    const aspectRatio = aspectHeight / aspectWidth;
  
    const includeParams = {
      perPage: RESULT_PAGE_SIZE,
      include: ['images', 'author', 'currentStock'],
      'fields.image': [
        `variants.${variantPrefix}`,
        `variants.${listingVariantPrefix}`,
        `variants.${listingVariantPrefix}-2x`,
        `variants.${listingVariantPrefix}-4x`,
        `variants.${listingVariantPrefix}-6x`,
      ],
      ...createImageVariantConfig(`${variantPrefix}`, 100, aspectRatio),
      ...createImageVariantConfig(`${listingVariantPrefix}`, 400, aspectRatio),
      ...createImageVariantConfig(`${listingVariantPrefix}-2x`, 800, aspectRatio),
      ...createImageVariantConfig(`${listingVariantPrefix}-4x`, 1600, aspectRatio),
      ...createImageVariantConfig(`${listingVariantPrefix}-6x`, 2400, aspectRatio),
      'limit.images': 1,
    };
  
    const { perPage, ...rest } = { ...queryParams, ...includeParams };
  
    const ids = getAuthorListingIds(cartAuthorId, cart);
  
    const params = {
      ...rest,
      ids,
      per_page: perPage,
    };
  
    return sdk.listings
      .query(params)
      .then(response => {
        dispatch(addCartEntities(response));
        dispatch(queryListingsSuccess(response, cart));
        const author = response.data?.included?.filter(i => i.type === 'user')[0];
        const newAuthorId = author?.id.uuid;
        if (newAuthorId !== currentAuthor?.id.uuid) {
          dispatch(setCurrentAuthor(author));
          const authorDelivery = cart[newAuthorId].deliveryMethod;
          dispatch(setCurrentAuthorDelivery(authorDelivery));
        }
  
        dispatch(getCartLineItems());
  
        return response;
      })
      .catch(e => {
        dispatch(queryListingsError(storableError(e)));
        throw e;
      });
  };
  
  /**
   * Fetch line items for current author's cart
   * @param {*} updatedCart
   * @returns
   */
  export const getCartLineItems = (updatedCart = null) => (dispatch, getState, sdk) => {
    dispatch(fetchLineItemsRequest);
    const { cart, currentAuthor } = getState().CartPage;
    if (!currentAuthor || !cart || !Object.keys(cart).length) {
      dispatch(fetchLineItemsSuccess({ data: [] }));
      return;
    }
  
    const currentCart = updatedCart ?? cart;
  
    if (currentAuthor) {
      const authorCart = currentCart[(currentAuthor?.id?.uuid)];
  
      cartTransactionLineItems({
        isOwnListing: false,
        orderData: {
          cart: authorCart,
        },
      })
        .then(resp => {
          dispatch(fetchLineItemsSuccess(resp));
        })
        .catch(e => {
          dispatch(fetchLineItemsError(storableError(e)));
        });
    }
  };
  
  // Add or remove items from cart
  export const toggleCart = (listingId, authorId, increment = 1) => (dispatch, getState, sdk) => {
    dispatch(toggleCartRequest);
  
    const currentUser = getState().user.currentUser;
    const cart = currentUser.attributes.profile.privateData?.cart || [];
  
    // Cart as object with author ids as keys
    let newCart = getNewCart(cart, authorId, listingId, increment);
  
    dispatch(updateCurrentUserCart(newCart))
      .then(updatedCart => {
        dispatch(toggleCartSuccess(updatedCart));
        // Only fetch listings if updated listing was removed from cart
        if (!listingIsInCart(updatedCart, authorId, listingId)) {
          dispatch(queryCartListings());
        }
  
        dispatch(getCartLineItems(updatedCart));
  
        // If resulting cart is empty, clear current author
        if (Object.keys(updatedCart).length === 0) {
          dispatch(setCurrentAuthor(null));
        }
      })
      .catch(e => {
        dispatch(toggleCartError(storableError(e)));
      });
  };
  
  /**
   * Set selected delivery option for the specified author's cart
   * @param {*} authorId
   * @param {*} delivery
   * @returns
   */
  export const setCartDelivery = (authorId, delivery) => (dispatch, getState, sdk) => {
    dispatch(toggleDeliveryRequest());
    const currentUser = getState().user.currentUser;
    const { currentAuthor } = getState().CartPage;
    const cart = currentUser.attributes.profile.privateData?.cart || [];
  
    const isCurrentAuthor = authorId === currentAuthor?.id?.uuid;
  
    const isValidDelivery =
      delivery === deliveryOptions.PICKUP || delivery === deliveryOptions.SHIPPING;
  
    if (isValidDelivery && isCurrentAuthor) {
      const newCart = {
        ...cart,
        [authorId]: {
          ...cart[authorId],
          deliveryMethod: delivery,
        },
      };
  
      dispatch(updateCurrentUserCart(newCart))
        .then(updatedCart => {
          dispatch(toggleDeliverySuccess({ cart: updatedCart, delivery }));
          dispatch(getCartLineItems())
        })
        .catch(e => {
          console.log('e', e);
          dispatch(toggleDeliveryError(storableError(e)));
        });
    }
  };
  
  /**
   * Update the current user's cart to the provided newCart value
   * @param {*} newCart
   * @returns
   */
  const updateCurrentUserCart = newCart => (dispatch, getState, sdk) => {
    return sdk.currentUser
      .updateProfile(
        {
          privateData: {
            cart: newCart,
          },
        },
        { expand: true }
      )
      .then(resp => {
        const entities = denormalisedResponseEntities(resp);
        if (entities.length !== 1) {
          throw new Error('Expected a resource in the sdk.currentUser.updateProfile response');
        }
        const currentUser = entities[0];
  
        // Update current user in state.user.currentUser through user.duck.js
        dispatch(currentUserShowSuccess(currentUser));
  
        // Return the updated cart
        return resp.data.data.attributes.profile.privateData.cart;
      });
  };
  
  /**
   * Get the listing ids for the listings in cart from the specified author
   * @param {*} cartAuthorId
   * @param {*} cart
   * @returns array of listing id strings
   */
  const getAuthorListingIds = (cartAuthorId, cart) => {
    return (
      (cartAuthorId &&
        cart[cartAuthorId] &&
        Object.keys(cart[cartAuthorId]).filter(key => key !== 'deliveryMethod')) ||
      []
    );
  };
  
  /**
   * Return true if the listing id is in the current user's cart, false otherwise
   * @param {*} cart
   * @param {*} authorId
   * @param {*} listingId
   * @returns boolean
   */
  export const listingIsInCart = (cart, authorId, listingId) => {
    if (!cart || !cart[authorId]) {
      return false;
    }
  
    return Object.keys(cart[authorId]).includes(listingId);
  };
  
  /**
   * Get the cart where the specified listing is incremented with the specified value.
   * If the listing value increments to 0, remove listing. If the update removes the last
   * listing for the author, remove author.
   * @param {*} cart
   * @param {*} authorId
   * @param {*} listingId
   * @param {*} increment
   * @returns
   */
  const getNewCart = (cart, authorId, listingId, increment) => {
    const authorInCart = Object.keys(cart).includes(authorId);
    const isListingInCart = listingIsInCart(cart, authorId, listingId);
  
    const newCount = ((cart[authorId] && cart[authorId][listingId]?.count) || 0) + increment;
  
    // Increment an existing listing
    if (authorInCart && isListingInCart && newCount > 0) {
      return {
        ...cart,
        [authorId]: {
          ...cart[authorId],
          [listingId]: {
            count: newCount,
          },
        },
      };
      // Remove an existing listing from cart
    } else if (authorInCart && isListingInCart && newCount <= 0) {
      const newCart = { ...cart };
      delete newCart[authorId][listingId];
  
      const remainingCart = Object.keys(newCart[authorId]);
  
      // If the listing was the author's last one, remove the author as well
      if (
        remainingCart.length == 0 ||
        (remainingCart.length === 1 && remainingCart[0] === 'deliveryMethod')
      ) {
        delete newCart[authorId];
      }
  
      return newCart;
      // Add new listing to an existing author
    } else if (authorInCart && !isListingInCart) {
      return {
        ...cart,
        [authorId]: {
          ...cart[authorId],
          [listingId]: {
            count: increment,
          },
        },
      };
      // Add new listing and a new author
    } else {
      return {
        ...cart,
        [authorId]: {
          [listingId]: {
            count: increment,
          },
        },
      };
    }
  };
  
  export const loadData = (params, search, config, authorId = null) => dispatch => {
    const queryParams = parse(search);
    const page = queryParams.page || 1;
    return Promise.all([dispatch(fetchCurrentUser())]).then(res => {
      const currentUser = res[0];
      return dispatch(
        queryCartListings(
          {
            ...queryParams,
            page,
          },
          config,
          authorId,
          currentUser
        )
      );
    });
  };
