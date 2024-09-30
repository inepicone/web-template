// renders the delivery method selection input for carts that have both shipping and pickup available.
import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import { FieldSelect, Form } from '../../components';

export const CartDeliveryForm = props => (
  <FinalForm
    {...props}
    render={formRenderProps => {
      const { intl, handleSubmit, className } = formRenderProps;

      return (
        <Form onChange={handleSubmit}>
          <FieldSelect
            id="delivery"
            name="delivery"
            className={className}
            label={intl.formatMessage({ id: 'CartPage.selectDeliveryMethod' })}
          >
            <option value="" disabled>
              {intl.formatMessage({ id: 'CartPage.optionSelect' })}
            </option>
            <option value="shipping">
              {intl.formatMessage({ id: 'CartPage.optionShipping' })}
            </option>
            <option value="pickup">{intl.formatMessage({ id: 'CartPage.optionPickup' })}</option>
          </FieldSelect>
        </Form>
      );
    }}
  />
);