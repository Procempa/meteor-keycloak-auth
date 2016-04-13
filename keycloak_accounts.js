Accounts.oauth.registerService('keycloak');

if (Meteor.isClient) {
  Meteor.loginWithKeyCloak = function(options, callback) {
    // support a callback without options
    if (!callback && typeof options === "function") {
      callback = options;
      options = null;
    }

    var credentialRequestCompleteCallback = Accounts.oauth.credentialRequestCompleteHandler(callback);
    Keycloak.requestCredential(options, credentialRequestCompleteCallback);
  };
} else {
  Accounts.addAutopublishFields({
    forLoggedInUser: ['services.keycloak'],
    forOtherUsers: ['services.keycloak.username']
  });
}
