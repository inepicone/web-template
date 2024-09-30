// contains the details of a single listing in the cart, as well as an AddToCartButton to increase or decrease the number of that specific item in the cart

import React from 'react';
import { AddToCartButton, NamedLink, ResponsiveImage } from '../../../components';
import { createSlug } from '../../../util/urlHelpers';

import css from '../CartCard/CartCard.module.css';

const CartCard = props => {
  const { listing, count, onToggleCart } = props;
  const { title, price } = listing.attributes;
  const listingId = listing.id.uuid;
  const authorId = listing.author.id.uuid;

  const variantPrefix = 'cart-card';

  const handleToggleCart = increment => {
    onToggleCart(listingId, authorId, increment);
  };

  const linkParams = { id: listingId, slug: createSlug(title) };
  const firstImage = listing.images && listing.images.length > 0 ? listing.images[0] : null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants).filter(k => k.startsWith(variantPrefix))
    : [];

  const total = `${(price.amount * count) / 100} ${price.currency}`;

  return (
    <div className={css.cardLayout}>
      <NamedLink name="ListingPage" params={linkParams}>
        {title}
      </NamedLink>
      <div className={css.itemLayout}>
        <ResponsiveImage
          rootClassName={css.rootForImage}
          alt={title}
          image={firstImage}
          variants={variants}
        />
        <AddToCartButton listing={listing} count={count} incrementCart={handleToggleCart} />
        <span>{total}</span>
      </div>
    </div>
  );
};

CartCard.defaultProps = {
  listing: null,
};

export default CartCard;