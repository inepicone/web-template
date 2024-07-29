import React from 'react';
import { bool, func, node, object, shape, string } from 'prop-types';
import classNames from 'classnames';

import Field, { hasDataInFields } from '../../Field';

import SectionContainer from '../SectionContainer';
import css from './SectionHero.module.css';

// Section component for a website's hero section
// The Section Hero doesn't have any Blocks by default, all the configurations are made in the Section Hero settings
const SectionHero = props => {
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    title,
    description,
    appearance,
    callToAction,
    options,
  } = props;

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };

  const hasHeaderFields = hasDataInFields([title, description, callToAction], fieldOptions);

  // Define the event handler
  const handleCtaButtonClick = listingId => {
    console.log('BtnsLandingHero'); // Log para verificar
    if (typeof fbq !== 'undefined') {
      fbq('track', 'BtnsLandingHero', { listing_id: listingId });
    } else {
      console.error('Meta Pixel no está definido');
    }
  };

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={classNames(rootClassName || css.root)}
      appearance={appearance}
      options={fieldOptions}
    >
      {hasHeaderFields ? (
        <header className={defaultClasses.sectionDetails} onClick={handleCtaButtonClick}> 
          <Field data={title} className={defaultClasses.title} options={fieldOptions} />
          <Field data={description} className={defaultClasses.description} options={fieldOptions} />
          <button onClick={handleCtaButtonClick}
            style={{ border: 'none', background: 'none', padding: 0, margin: 0, width: '100%' }}
          >
            <Field
              data={callToAction}
              className={defaultClasses.ctaButton}
              options={fieldOptions}
              onClick={handleCtaButtonClick} // Añade el evento onClick
            />
          </button>
        </header>
      ) : null}
    </SectionContainer>
  );
};

const propTypeOption = shape({
  fieldComponents: shape({ component: node, pickValidProps: func }),
});

SectionHero.defaultProps = {
  className: null,
  rootClassName: null,
  defaultClasses: null,
  textClassName: null,
  title: null,
  description: null,
  appearance: null,
  callToAction: null,
  isInsideContainer: false,
  options: null,
};

SectionHero.propTypes = {
  sectionId: string.isRequired,
  className: string,
  rootClassName: string,
  defaultClasses: shape({
    sectionDetails: string,
    title: string,
    description: string,
    ctaButton: string,
  }),
  title: object,
  description: object,
  appearance: object,
  callToAction: object,
  isInsideContainer: bool,
  options: propTypeOption,
};

export default SectionHero;
