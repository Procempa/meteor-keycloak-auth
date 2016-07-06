Package.describe({
  name: 'procempa:keycloak-auth',
  version: '0.9.1',
  summary: 'Keycloak OAuth flow in Meteor',
  git: 'https://github.com/Procempa/meteor-keycloak-auth.git',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use('ecmascript');
  api.use('oauth2', ['client', 'server']);
  api.use('oauth', ['client', 'server']);
  api.use('http', ['server']);
  api.use('templating', 'client');
	api.use('underscore', ['client', 'server']);
  api.use('random', 'client');
  api.use('accounts-base', ['client', 'server']);
  api.imply('accounts-base', ['client', 'server']);
  api.use('accounts-oauth', ['client', 'server']);
  api.use('mongo', ['client', 'server']);
  api.use('service-configuration', ['client', 'server']);

	api.addFiles('asset.txt', 'server', {isAsset:true});

  api.export('Keycloak');

  api.addFiles(
    ['keycloak_configure.html', 'keycloak_configure.js'], 'client');

  api.addFiles('token.js', 'server');
  api.addFiles('grant.js', 'server');

  api.addFiles('keycloak_common.js', ['client', 'server']);
  api.addFiles('keycloak_accounts.js', ['client', 'server']);
	api.addFiles('keycloak_startup.js', 'server');
	api.addFiles('keycloak_publish.js', 'server');
	api.addFiles('keycloak_server.js', 'server');
  api.addFiles('keycloak_client.js', 'client');


});
