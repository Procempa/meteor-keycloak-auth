Keycloak.Roles = new Mongo.Collection("keycloak.roles");

Keycloak.requestCredential = _requestCredential;

function _requestCredential(options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

  options = options || {};
  options.redirectUrl = options.redirectUrl || Meteor.absoluteUrl();

  Meteor.call("getKeycloakConfiguration", function(error, config) {
    if (error) {
      console.log("error", error);
    } else {
      var credentialToken = Random.secret();

      var loginStyle = OAuth._loginStyle('keycloak', {
        loginStyle: 'redirect'
      }, options);

      var loginUrl = config.realmUrl +
        '/tokens/login?client_id=' + config.resource +
        '&state=' + encodeURIComponent(OAuth._stateParam(loginStyle, credentialToken, options && options.redirectUrl)) +
        '&redirect_uri=' + encodeURIComponent(OAuth._redirectUri('keycloak', config));

      OAuth.launchLogin({
        loginService: "keycloak",
        loginStyle: loginStyle,
        loginUrl: loginUrl,
        credentialRequestCompleteCallback: credentialRequestCompleteCallback,
        credentialToken: credentialToken
      });

    }
  });
}

Keycloak.isInRole = _isInRole;

function _isInRole(role) {
  var appRole = (role.indexOf("app:") === 0),
    realmRole = (role.indexOf("realm:") === 0),
    config = ServiceConfiguration.configurations.findOne({
      service: 'keycloak'
    });

  if (appRole) {
    let access = Keycloak.Roles.findOne({
        _id: 'resource_access'
      }) || {},
      resource = access[config.resource] || {},
      roles = resource.roles || [];
    role = role.split(':')[1];
    return _.contains(roles, role);
  } else if (realmRole) {
    let realm = Keycloak.Roles.findOne({
        _id: 'realm_access'
      }) || {},
      roles = realm.roles || [];
    role = role.split(':')[1];
    return _.contains(roles, role);
  } else {
    let access = Keycloak.Roles.findOne({
        _id: 'resource_access'
      }) || {},
      resource = access[config.resource] || {},
      realm = Keycloak.Roles.findOne({
        _id: 'realm_access'
      }) || {},
      resourceRoles = resource.roles || [],
      realmRoles = realm.roles || [];
    return _.contains(resourceRoles, role) || _.contains(realmRoles, role);

  }
  return false;
}

Keycloak.logout = _logout;

function _logout() {

  Meteor.call("getKeycloakConfiguration", function(error, config) {
    if (error) {
      console.log("error", error);
    } else {

      var logoutUrl = config.realmUrl +
        '/tokens/logout?redirect_uri=' + encodeURIComponent(Meteor.absoluteUrl());
      window.location.href = logoutUrl;
    }
  });

}
