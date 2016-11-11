import { Meteor } from 'meteor/meteor';
import { DISCARDED_MESSAGES, isInRole } from './common';
import _ from 'lodash';
import { Config, GrantManager } from 'keycloak-auth-utils';
import { EJSON } from 'meteor/ejson';
import Future from 'fibers/future';
import Q from 'q';
/* global Assets*/


export class KeycloakServerImpl {
	user;
	grant;

	tokenDeferred = Q.defer();

	get bearer_token() {
		return _.get( this, 'tokenDeferred.promise' );
	}

	constructor( server ) {
		this._server = server || Meteor.server;
		let keycloakJson = EJSON.parse( Assets.getText( '../../private/keycloak.json' ) );
		let keycloakConfig = new Config( keycloakJson );
		let grantManager = new GrantManager( keycloakConfig );
		this._server.onConnection( ( connection ) => {
			let session = this._server.sessions[ connection.id ];
			let socket = session.socket;
			let processMessage = socket._meteorSession.processMessage;
			socket._meteorSession.processMessage = Meteor.bindEnvironment( ( msg_in ) => {
				if ( _.indexOf( DISCARDED_MESSAGES, msg_in.msg ) === -1 && msg_in.raw_token ) {
					this.tokenDeferred = this.tokenDeferred.promise.inspect()
						.state === 'fulfilled' ? Q.defer() : this.tokenDeferred;

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
