import { KeycloakServerImpl } from './keycloak-server';
import { Meteor } from 'meteor/meteor';
import { ServiceConfiguration } from 'meteor/service-configuration';
import _ from 'lodash';

let KeycloakServer = new KeycloakServerImpl();

Meteor.Keycloak = KeycloakServer;

Meteor.methods( {
	'getKeycloakClientConfiguration': function() {
		let config = ServiceConfiguration.configurations.findOne( { 'service': 'keycloak' } );
		if ( config ) {
			return {
				'url': _.get( config, 'auth-server-url' ),
				'realm': _.get( config, 'realm' ),
				'clientId': _.get( config, 'resource' )
			};
		} else {
			throw new Meteor.Error( 404, 'No configurantion found for Keycloak' );
		}
	}
} );

export { KeycloakServer };
