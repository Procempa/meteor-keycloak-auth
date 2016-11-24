import { Meteor } from 'meteor/meteor';
import { DDPCommon } from 'meteor/ddp-common';
import { DISCARDED_MESSAGES, isInRole } from './common';
import _ from 'lodash';
import 'fallbackjs/fallback';
/* global fallback */
import localforage from 'localforage';
import { EJSON } from 'meteor/ejson';

const KEYCLOAK_INPROGESS_KEY = 'keycloak-login-inprogress';
const KEYCLOAK_TOKEN_EXPIRES_KEY = 'keycloak-token-expires';
const KEYCLOAK_TOKEN_TIMEOUT = 10;
export class KeycloakClientImpl {

	_config = {};
	_loggedIn = false;
	_user: null;
	_connection;
	events = {};

	constructor( connection ) {
		this._connection = connection || Meteor.connection;
		this._connection.onReconnect = () => {
			let stream_send = this._connection._stream.send;
			this._connection._stream.send = ( raw_msg ) => {
				let msg_obj = DDPCommon.parseDDP( raw_msg );
				if ( _.indexOf( DISCARDED_MESSAGES, msg_obj.msg ) === -1 && this._loggedIn ) {
					this
						.login()
						.then( () => {
							this
								.KeycloakPromise()
								.then( ( adapter ) => {
									adapter.updateToken( KEYCLOAK_TOKEN_TIMEOUT )
										.success( () => {
											let raw_token = EJSON.stringify( {
												access_token: adapter.token,
												refresh_token: adapter.refreshToken,
												id_token: adapter.idToken,
												expires_in: adapter.tokenParsed.exp,
												token_type: adapter.tokenParsed.typ
											} );
											msg_obj.raw_token = raw_token;
											let msg_sent = DDPCommon.stringifyDDP( msg_obj );
											stream_send.apply( this._connection._stream, [ msg_sent ] );
										} )
										.error( ( error ) => {
											console.error( error );
											this.logout();
										} );
								} );
						} );
				} else {
					stream_send.apply( this._connection._stream, [ raw_msg ] );
				}
			};
		};
		localforage.getItem( KEYCLOAK_TOKEN_EXPIRES_KEY, ( err, exp ) => {
			let expiresIn = ( exp * 1 ) - Math.ceil( new Date().getTime() / 1000 ) - 1;
			if ( expiresIn > 0 ) {
				this.login();
			}
		} );
	}

	get loginInProgress() {
		return localforage.getItem( KEYCLOAK_INPROGESS_KEY );
	}

	set config( value ) {
		this._config = value;
		this.KeycloakPromise()
			.then( () => {
				localforage
					.getItem( KEYCLOAK_INPROGESS_KEY )
					.then( value => {
						if ( value ) {
							this.login();
						}
					} )
					.catch( console.error );
			} );
	}

	get isLogged() {
		return this._loggedIn;
	}

	get user() {
		return this._user;
	}

	login() {
		if ( !this._loginPromise ) {
			this._loginPromise = new Promise( ( resolve, reject ) => {
				if ( this._loggedIn && this._user ) {
					resolve( this._user );
				} else {
					this
						.KeycloakPromise()
						.then( ( adapter ) => {
							localforage
								.setItem( KEYCLOAK_INPROGESS_KEY, true )
								.then( () => {
									adapter.init( { onLoad: 'login-required', checkLoginIframe: false } )
										.success( () => {
											this._user = this._buildUser( adapter );
											localforage.setItem( KEYCLOAK_TOKEN_EXPIRES_KEY, adapter.tokenParsed.exp );
											this._trigger( 'login', this._user );
											this._logout = adapter.logout;
											this._loggedIn = true;
											localforage
												.removeItem( KEYCLOAK_INPROGESS_KEY )
												.then( () => {
													let event = new HashChangeEvent( 'hashchange' );
													event.oldURL = '_oauth';
													event.newURL = location.hash;
													window.dispatchEvent( event );
													resolve( this._user );
												} )
												.catch( reject );
										} )
										.error( () => {
											this._loggedIn = false;
											reject( 'Login failed' );
										} );
								} )
								.catch( reject );
						}, reject );
				}
			} );
		}
		return this._loginPromise;
	}

	logout() {
		this._loggedIn = false;
		this._user = null;
		if ( this._logout ) {
			this._logout();
		}
		this._trigger( 'logout' );
		localforage.removeItem( KEYCLOAK_TOKEN_EXPIRES_KEY );
		return true;
	}

	isInRole( roles, scope ) {
		if ( !this.isInRolePromise ) {
			this.isInRolePromise = new Promise( ( resolve, reject ) => {
				this
					.login()
					.then( () => {
						if ( isInRole( this._user, roles, scope ) ) {
							resolve();
							this.isInRolePromise = null;
						} else {
							reject();
							this.isInRolePromise = null;
						}
					}, () => {
						reject();
						this.isInRolePromise = null;
					} );
			} );
		}
		return this.isInRolePromise;
	}

	KeycloakPromise() {
		if ( !this._KeycloakPromise ) {
			this._KeycloakPromise = new Promise( ( resolve ) => {
				if ( this._adapter ) {
					resolve( this._adapter );
				} else {

					Meteor.call( 'getKeycloakClientConfiguration', ( error, result ) => {
						if ( error ) {
							throw new Meteor.Error( 502, error );
						}
						if ( result ) {
							this.config = result;
							let url = `${result.url}/js/keycloak.js`;
							fallback.load( {
								Keycloak: url
							} );
							fallback.ready( () => {
								this._adapter = new window.Keycloak( this._config );
								resolve( this._adapter );
							} );
						}
					} );

				}
			} );
		}
		return this._KeycloakPromise;
	}

	on( event, cb ) {
		let handlers = this.events[ event ] || [];
		handlers.push( cb );
		this.events[ event ] = handlers;
	}

	_trigger( event, data ) {
		_.forEach( this.events[ event ], cb => cb( data ) );
	}

	_buildUser( adapter ) {
		return {
			_id: adapter.idTokenParsed.preferred_username,
			name: adapter.idTokenParsed.name.trim() || adapter.idTokenParsed.preferred_username,
			email: adapter.idTokenParsed.email,
			roles: {
				realm: ( ( adapter.realmAccess || {} ).roles || [] ),
				client: ( ( adapter.resourceAccess[ this._config.clientId ] || {} ).roles || [] )
			}
		};
	}

}
