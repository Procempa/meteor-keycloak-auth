/* global Package, Npm */

Package.describe({
	name: 'procempa:keycloak-auth',
	version: '1.0.0',
	summary: 'Meteor Keycloak Handshake flow',
	git: 'https://github.com/Procempa/meteor-keycloak-auth.git',
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.4.1.1');
	api.use('ecmascript');
	api.export('KeycloakServer', 'server');
	api.export('KeycloakClient', 'client');
	api.mainModule('client-main.js', 'client');
	api.mainModule('server-main.js', 'server');
	api.addAssets('../../private/keycloak.json', 'server');
});

Package.onTest(function(api) {
	api.use('ecmascript');
	api.use('tinytest');
	api.use('procempa:meteor-keycloak');
	api.mainModule('keycloak-tests.js');
});

Npm.depends({
	'lodash': '4.16.1',
	'fallbackjs': '1.1.8',
	'localforage': '1.4.2',
	'keycloak-auth-utils': '2.2.1',
	'babel-plugin-transform-decorators-legacy': '1.3.4',
	'babel-plugin-transform-class-properties': '6.11.5',
	'babel-plugin-transform-strict-mode': '6.11.3'
});
