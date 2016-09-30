import { KeycloakClientImpl } from './keycloak-client';

let KeycloakClient = new KeycloakClientImpl();

Meteor.Keycloak = KeycloakClient;

export { KeycloakClient };
