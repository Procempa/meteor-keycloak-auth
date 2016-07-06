Keycloak.Roles = new Mongo.Collection("keycloak.roles");

Keycloak.requestCredential = _requestCredential;

var TOKEN_URL = '/protocol/openid-connect/auth?response_type=code&client_id=';

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
                TOKEN_URL + config.resource +
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

function _isInRole(roles) {

    // ensure array to simplify code
    if (!_.isArray(roles)) {
        roles = [roles]
    }

    return new Promise((resolve, reject) => {
        Meteor.subscribe("keycloak.roles", () => {
            let result = false;
						let promises = [];
            roles.forEach(role => {
                let appRole = (role.indexOf("app:") === 0),
                    realmRole = (role.indexOf("realm:") === 0);
                let configPromise = _getConfig();
								promises.push(configPromise);
								configPromise
										.then((config) => {
                        if (appRole) {
                            let access = Keycloak.Roles.findOne({
                                    _id: 'resource_access'
                                }) || {},
                                resource = access[config.resource] || {},
                                userRoles = resource.roles || [];
                            role = role.split(':')[1];
                            result = result || _.contains(userRoles, role);
                        } else if (realmRole) {
                            let realm = Keycloak.Roles.findOne({
                                    _id: 'realm_access'
                                }) || {},
                                userRoles = realm.roles || [];
                            role = role.split(':')[1];
                            result = result || _.contains(userRoles, role);
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

                            result = result || _.contains(resourceRoles, role) || _.contains(realmRoles, role);
                        }
                    }, reject);
            });
            //Acesso Negado
						Promise
							.all(promises)
							.then(() => resolve(result));
        });
    });
}

function _getConfig() {
    return new Promise((resolve) => {
        ServiceConfiguration
            .configurations
            .find({
                service: 'keycloak'
            })
            .observe({
                added: c => resolve(c)
            });
    });
}

Keycloak.logout = _logout;

function _logout() {

    Meteor.call("getKeycloakConfiguration", function(error, config) {
        if (error) {
            console.log("error", error);
        } else {

            var logoutUrl = config.realmUrl +
                '/protocol/openid-connect/logout?redirect_uri=' + encodeURIComponent(Meteor.absoluteUrl());
            window.location.href = logoutUrl;
        }
    });

}
