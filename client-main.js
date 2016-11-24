import { Meteor } from 'meteor/meteor';
import { KeycloakClientImpl } from './keycloak-client';

let KeycloakClient = new KeycloakClientImpl();

Meteor.Keycloak = KeycloakClient;

// Meteor.call( 'getKeycloakClientConfiguration', function( error, result ) {
// 	if ( error ) {
// 		throw new Meteor.Error( 502, error );
// 	}
// 	if ( result ) {
// 		Meteor.Keycloak.config = result;
// 		console.log( 'Registrei o config no client', result );
// 	}
// } );

export { KeycloakClient };
