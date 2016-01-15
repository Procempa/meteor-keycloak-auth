Keycloak = {};



// Request Keycloak credentials for the user
//
// @param options {optional}
// @param credentialRequestCompleteCallback {Function} Callback function to call on
//   completion. Takes one argument, credentialToken on success, or Error on
//   error.
Keycloak.requestCredential = function (options, credentialRequestCompleteCallback) {
  // support both (options, callback) and (callback).
  if (!credentialRequestCompleteCallback && typeof options === 'function') {
    credentialRequestCompleteCallback = options;
    options = {};
  }

	options = options || {};

	options.redirectUrl = options.redirectUrl || Meteor.absoluteUrl();


  var config = ServiceConfiguration.configurations.findOne({service: 'keycloak'});
  if (!config) {
    credentialRequestCompleteCallback && credentialRequestCompleteCallback(
      new ServiceConfiguration.ConfigError());
    return;
  }

  var credentialToken = Random.secret();

  var scope = "email";

  var loginStyle = OAuth._loginStyle('keycloak', config, options);

  var loginUrl = config.realmUrl +
								'/tokens/login?client_id=' + config.resource +
								'&state=' + encodeURIComponent(OAuth._stateParam(loginStyle, credentialToken, options && options.redirectUrl)) +
								'&redirect_uri=' + encodeURIComponent(OAuth._redirectUri('keycloak', config));

console.log(loginUrl);
  OAuth.launchLogin({
    loginService: "keycloak",
    loginStyle: loginStyle,
    loginUrl: loginUrl,
    credentialRequestCompleteCallback: credentialRequestCompleteCallback,
    credentialToken: credentialToken
  });
};
