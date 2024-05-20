/*
 *  TopbarMobileMenu prints the menu content for authenticated user or
 * shows login actions for those who are not authenticated.
 */
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../routing/routeConfiguration';
import { FormattedMessage } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { ensureCurrentUser } from '../../../util/data';

import { AvatarLarge, InlineTextButton, NamedLink, NotificationBadge } from '../../../components';

import css from './TopbarMobileMenu.module.css';

const TopbarMobileMenu = props => {
  const {
    isAuthenticated,
    currentPage,
    currentUserHasListings,
    currentUser,
    notificationCount,
    onLogout,
  } = props;

  const user = ensureCurrentUser(currentUser);

  if (!isAuthenticated) {
    const signup = (
      <NamedLink name="SignupPage" style={{color: "white"}} className={css.signupLink}>
        <FormattedMessage id="TopbarMobileMenu.signupLink" />
      </NamedLink>
    );

    const login = (
      <NamedLink name="LoginPage" style={{color: "white"}} className={css.loginLink}>
        <FormattedMessage id="TopbarMobileMenu.loginLink" />
      </NamedLink>
    );

    const signupOrLogin = (
      <span className={css.authenticationLinks}>
        <FormattedMessage id="TopbarMobileMenu.signupOrLogin" values={{ signup, login }} />
      </span>
    );
    return (
      <div className={css.root}>
        <div className={css.content}>
          <div className={css.authenticationGreeting}>
            <a href='/s'>
              <FormattedMessage id="ALQUILAR UN ARTÍCULO" />
            </a>
            <br></br>
            <br></br>
            <NamedLink name="NewListingPage" >
            <FormattedMessage id="TopbarMobileMenu.newListingLink" />
          </NamedLink>
          </div>
        </div>
        <div style={{display: "flex" ,flexDirection: "column"}} className="categorias">
          <h1 style={{color: "#7CC9BC"}}>Categorías</h1>
         
          <a style={{ marginLeft: '5%' }} href="/s?pub_campamento=carpa%2Cbolsa_de_dormir%2Caislante%2Csilla_camping%2Ccocina_camping%2Cheladeritas%2Ccolchon_inflable%2Cmochila%2Ciluminacion%2Cotros_camping">
          <FormattedMessage id="Camping"/>
          </a>
          <br></br>
          <a style={{ marginLeft: '5%' }} href="/s?pub_deportes_acuaticos=kayak%2Csup%2Ctraje_neoprene%2Cchaleco_salvavida%2Cbote_inflable%2Cotros_da&pub_esqui_snow_cate=esquies_alpino%2Cbotas_esqui_alpino%2Csnow_alpino%2Cbotas_snow%2Cbastones%2Cotros_sys_cate&pub_esqui_travesia=esqui_pieles_travesia%2Cbotas_travesia%2Cbastones_travesia%2Cseguridad_travesia%2Cpiquetas_travesia%2Ccasco%2Cantiparras%2Cguantes%2Ccrampones%2Csplitboard%2Cotros_syst">
          <FormattedMessage id="Deportes" />
          </a>
          <br></br>
          <a style={{ marginLeft: '5%' }} href="/s?pub_hogar=has_all%3Aherramientas_e%2Cmyi%2Cjardineria">
          <FormattedMessage id=" Hogar" />
          </a>
          <br></br>
          <a style={{ marginLeft: '5%' }} href="/s?pub_bebes=butaca_auto%2Cbuster%2Csilla_comer%2Cpracticuna%2Cmochila_trekking_bebe%2Cbanadera%2CCochecito%2Cotros_bebes%2Csalvavidas_bebe%2Cropa_nieve_bebe">
          <FormattedMessage id=" Bebés" />
          </a>
          <br></br>
          <a style={{ marginLeft: '5%' }} href="/s?pub_ropa=has_all%3Aadultos%2Cninos%2Cbebe">
          <FormattedMessage id=" Vestimenta" />
          </a>
          <br></br>
          <a style={{ marginLeft: '5%' }} href="/s">
          <FormattedMessage id=" Otros" />
          </a>
          
          <br></br>
          <br></br>
          <a href="https://www.rundo.com.ar/p/frequent-asked-questions">
          <h1 style={{color: "#7CC9BC"}}>Preguntas frecuentes
          </h1>
          </a>
          </div>
        <div className={css.footer}>
        <div style={{backgroundColor: "#7CC9BC"}} className={css.createNewListingLink}>
          <NamedLink name="SignupPage" style={{color: "white"}}>
            <FormattedMessage id="REGISTRATE " />
          </NamedLink>
          O
          <NamedLink name="LoginPage" style={{color: "white"}}>
            <FormattedMessage id=" INICIA SESIÓN" />
          </NamedLink>         
        </div>         
        </div>
      </div>
    );
  }

  const notificationCountBadge =
    notificationCount > 0 ? (
      <NotificationBadge className={css.notificationBadge} count={notificationCount} />
    ) : null;

  const displayName = user.attributes.profile.firstName;
  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    return currentPage === page || isAccountSettingsPage ? css.currentPage : null;
  };

  return (
    <div className={css.root}>
      <AvatarLarge className={css.avatar} user={currentUser} />
      <div className={css.content}>
        <span className={css.greeting}>
          <FormattedMessage id="TopbarMobileMenu.greeting" values={{ displayName }} />
        </span>
        <InlineTextButton rootClassName={css.logoutButton} onClick={onLogout}>
          <FormattedMessage id="TopbarMobileMenu.logoutLink" />
        </InlineTextButton>
        <NamedLink
          className={classNames(css.inbox, currentPageClass('InboxPage'))}
          name="InboxPage"
          params={{ tab: currentUserHasListings ? 'sales' : 'orders' }}
        >
          <FormattedMessage id="TopbarMobileMenu.inboxLink" />
          {notificationCountBadge}
        </NamedLink>
        <NamedLink
          className={classNames(css.navigationLink, currentPageClass('ManageListingsPage'))}
          name="ManageListingsPage"
        >
          <FormattedMessage id="TopbarMobileMenu.yourListingsLink" />
        </NamedLink>
        <NamedLink
          className={classNames(css.navigationLink, currentPageClass('ProfileSettingsPage'))}
          name="ProfileSettingsPage"
        >
          <FormattedMessage id="TopbarMobileMenu.profileSettingsLink" />
        </NamedLink>
        <NamedLink
          className={classNames(css.navigationLink, currentPageClass('AccountSettingsPage'))}
          name="AccountSettingsPage"
        >
          <FormattedMessage id="TopbarMobileMenu.accountSettingsLink" />
        </NamedLink>
        <a
          className={classNames(css.navigationLink, currentPageClass('faqs'))}
          name="AccountSettingsPage"
          href="https://www.rundo.com.ar/p/frequent-asked-questions"
        >
          <a href="https://www.rundo.com.ar/p/frequent-asked-questions"></a>
          <FormattedMessage id="Preguntas Frecuentes" />
        </a>
        <div className={css.spacer} />
      </div>
      <div className={css.footer}>
        <NamedLink className={css.createNewListingLink} name="NewListingPage">
          <FormattedMessage id="TopbarMobileMenu.newListingLink" />
        </NamedLink>
      </div>
    </div>
  );
};

TopbarMobileMenu.defaultProps = { currentUser: null, notificationCount: 0, currentPage: null };

const { bool, func, number, string } = PropTypes;

TopbarMobileMenu.propTypes = {
  isAuthenticated: bool.isRequired,
  currentUserHasListings: bool.isRequired,
  currentUser: propTypes.currentUser,
  currentPage: string,
  notificationCount: number,
  onLogout: func.isRequired,
};

export default TopbarMobileMenu;