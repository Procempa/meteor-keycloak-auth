/* global Package, Npm */

Package.describe({
	name: 'procempa:keycloak-auth',
	version: '1.0.0',
	summary: 'Meteor Keycloak Handshake flow',
	git: 'https://github.com/Procempa/meteor-keycloak-auth.git',
	documentation: 'README.md'
});

Package.onUse(function(api) {
	api.use('ecmascript@0.1.4');
	api.use('service-configuration@1.0.1');
	api.export('KeycloakServer', 'server');
	api.export('KeycloakClient', 'client');
	api.mainModule('client-main.js', 'client');
	api.mainModule('server-main.js', 'server');
});


Npm.depends({
	'lodash': '4.16.1',
	'fallbackjs': '1.1.8',
	'localforage': '1.4.2',
	'keycloak-auth-utils': '2.2.1',
	'babel-plugin-transform-decorators-legacy': '1.3.4',
	'babel-plugin-transform-class-properties': '6.11.5',
	'babel-plugin-transform-strict-mode': '6.11.3',
	'q': '1.4.1'
});
