import { KeycloakServerImpl } from './keycloak-server';
import { Meteor } from 'meteor/meteor';

let KeycloakServer = new KeycloakServerImpl();

Meteor.Keycloak = KeycloakServer;

export { KeycloakServer };
