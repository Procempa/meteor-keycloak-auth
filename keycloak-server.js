/*globals Assets*/
import { Meteor } from 'meteor/meteor';
import { ServiceConfiguration } from 'meteor/service-configuration';
import { DISCARDED_MESSAGES, isInRole } from './common';
import _ from 'lodash';
import { Config, GrantManager } from 'keycloak-auth-utils';
import Future from 'fibers/future';
import Q from 'q';
import { EJSON } from 'meteor/ejson';

export class KeycloakServerImpl {
	user;
	grant;

	tokenDeferred = Q.defer();

	get bearer_token() {
		return _.get( this, 'tokenDeferred.promise' );
	}

	constructor( server ) {
		this._server = server || Meteor.server;

		let keycloakJson = ServiceConfiguration.configurations.findOne( { 'service': 'keycloak-config' } );
		if ( !keycloakJson ) {
			console.warn( `
--------------------------------------------------------------------------------------------------------------------
There is no 'service': 'keycloak-config' object in collection meteor_accounts_loginServiceConfiguration.
You can add an object with the same attributes as keycloak.json, plus the attribute 'service': 'keycloak-config'
In the meanwhile, the file private/keycloak.json will be used.
			` );
			keycloakJson = EJSON.parse( Assets.getText( '../../private/keycloak.json' ) );
			if ( !keycloakJson ) {
				console.log( 'The file private/keycloak.json was not found either' );
				throw new Meteor.Error( 'Add the apropriated object to MongoCollection or add the keycloak.json file to private folder.' );
			}
		}
		let keycloakConfig = new Config( keycloakJson );
		console.info( 'Keycloak Server (Module):', keycloakConfig.authServerUrl );

		let grantManager = new GrantManager( keycloakConfig );
		this._server.onConnection( ( connection ) => {
			let session = this._server.sessions[ connection.id ];
			let socket = session.socket;
			let processMessage = socket._meteorSession.processMessage;
			socket._meteorSession.processMessage = Meteor.bindEnvironment( ( msg_in ) => {
				if ( _.indexOf( DISCARDED_MESSAGES, msg_in.msg ) === -1 && msg_in.raw_token ) {
					let realized = this.tokenDeferred.promise.inspect().state === 'fulfilled';
					this.tokenDeferred = realized ? Q.defer() : this.tokenDeferred;
					// console.log( '====> Token ' + ( realized ? 'novo' : '' ) + ': ', this.tokenDeferred );

					let grant = grantManager.createGrant( msg_in.raw_token );
					let fut = new Future();
					grantManager.ensureFreshness( grant, ( error ) => {
						if ( error ) {
							fut.throws( error );
							this.tokenDeferred.reject( error );
						} else {
							fut.return();
						}
					} );
					fut.wait();
					this.grant = grant;
					this.user = {
						_id: grant.id_token.content.preferred_username,
						name: grant.id_token.content.name || grant.id_token.content.preferred_username,
						email: grant.id_token.content.email,
						roles: {
							realm: ( ( grant.access_token.content.realm_access || {} )
								.roles || [] ),
							client: ( ( grant.access_token.content.resource_access[ keycloakConfig.clientId ] || {} )
								.roles || [] )
						}
					};
					this.tokenDeferred.resolve( grant.access_token.token );
					//this.bearer_token = grant.access_token.token;
				}
				processMessage.apply( socket._meteorSession, [ msg_in ] );
			} );
		} );
	}

	isInRole( roles, scope ) {
		return isInRole( this.user, roles, scope );
	}
}
