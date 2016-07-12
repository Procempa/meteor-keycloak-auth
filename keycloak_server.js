import http from 'http';
import https from 'https';
import Future from 'fibers/future';
import URL from 'url';

Keycloak.CurrentUserId = null;

const TOKEN_URL = "/protocol/openid-connect/token";

Meteor.methods({
    getKeycloakConfiguration: function() {
        var config = ServiceConfiguration.configurations.findOne({
            service: 'keycloak'
        });
        return config;
    }
});

OAuth.registerService('keycloak', 2, null, function(query) {
    var future = new Future();

    doLogin(query, function(err, result) {
        future.return(result);
    });

    return future.wait();
});

Keycloak.retrieveCredential = function(credentialToken, credentialSecret) {
    return OAuth.retrieveCredential(credentialToken, credentialSecret);
};

function doLogin(query, cb) {
    const code = query.code,
        sessionId = query.state,
        config = ServiceConfiguration.configurations.findOne({
            service: 'keycloak'
        }),
        redirectUri = encodeURIComponent(OAuth._redirectUri('keycloak', config));
    let params = `code=${code}&application_session_state=${sessionId}&redirect_uri=${redirectUri}&grant_type=authorization_code&client_id=${config.resource}`;

    let uri = config.realmUrl + TOKEN_URL,
        fs = Npm.require('fs'),
        json = fs.realpathSync(process.cwd() + '/../server/assets/app/keycloak.json'),
        configFile = JSON.parse(fs.readFileSync(json, 'utf8')),
        secret = '';
    if (configFile.credentials && configFile.credentials.secret) {
        secret = configFile.credentials.secret;
    } else {
        secret = configFile['realm-public-key'];
    }

    let headers = {
        'Content-Length': params.length,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + new Buffer(config.resource + ':' + secret).toString('base64')
    };
    let options = URL.parse(uri);
    options.headers = headers;
    options.method = 'POST';
    let protocol = options.protocol === 'https:' ? https : http; //Npm.require(options.protocol === 'https:' ? 'https' : 'http');

    new Promise(function(resolve, reject) {
            let request = protocol.request(options, (response) => {
                let json = '';
                response.on('data', (d) => {
                    json += d.toString();
                });

                response.on('error', reject);

                response.on('end', () => {
                    let responseJson = JSON.parse(json);
                    if (responseJson.error) {
                        console.error(`Error in login response: ${responseJson.error} - ${responseJson.error_description}`);
                        reject(responseJson);
                    } else {
                        resolve(json);
                    }
                });
            });
            request.write(params);
            request.end();
        })
        .then(function(json) {
            let plainKey = configFile['realm-public-key'];
            let publicKey = "-----BEGIN PUBLIC KEY-----\n";
            for (var i = 0; i < plainKey.length; i = i + 64) {
                publicKey += plainKey.substring(i, i + 64);
                publicKey += "\n";
            }
            publicKey += "-----END PUBLIC KEY-----\n";

            let grant = createGrant(json, config.resource, publicKey);


            let result = {
                serviceData: {
                    id: grant.access_token.content.preferred_username,
                    token: grant.access_token.token,
                    expiresAt: (+new Date()) + (1000 * grant.expires_in),
                    name: grant.access_token.content.name,
                    email: grant.access_token.content.email,
                    given_name: grant.access_token.content.given_name,
                    family_name: grant.access_token.content.family_name,
                    roles: {
                        resource_access: grant.access_token.content.resource_access,
                        realm_access: grant.access_token.content.realm_access
                    }
                },
                options: {
                    profile: {
                        name: grant.access_token.content.name
                    }
                }
            };

            cb(null, result);
        }, err => {
            cb(err);
        });
}

function createGrant(rawData, resource, publicKey) {
    var grantData = rawData;
    if (typeof(rawData) !== 'object') {
        grantData = JSON.parse(grantData);
    }

    var access_token;
    var refresh_token;
    var id_token;

    if (grantData.access_token) {
        access_token = new Token(grantData.access_token, resource);
    }

    if (grantData.refresh_token) {
        refresh_token = new Token(grantData.refresh_token);
    }

    if (grantData.id_token) {
        id_token = new Token(grantData.id_token);
    }

    var grant = new Grant({
        access_token: access_token,
        refresh_token: refresh_token,
        id_token: id_token,
        expires_in: grantData.expires_in,
        token_type: grantData.token_type,
    });
    grant.__raw = rawData;

    return validateGrant(grant, publicKey);
}

function validateGrant(grant, publicKey) {
    grant.access_token = validateToken(grant.access_token, publicKey);
    grant.refresh_token = validateToken(grant.refresh_token, publicKey);
    grant.id_token = validateToken(grant.id_token, publicKey);
    return grant;
}

function validateToken(token, publicKey) {
    if (!token) {
        return;
    }

    if (token.isExpired()) {
        return;
    }

    if (token.content.iat < this.notBefore) {
        return;
    }
    var crypto = Npm.require('crypto');
    var verify = crypto.createVerify('RSA-SHA256');
    verify.update(token.signed);
    if (!verify.verify(publicKey, token.signature, 'base64')) {
        return;
    }

    return token;
}

Keycloak.isInRole = function(role) {
    var appRole = (role.indexOf("app:") === 0),
        realmRole = (role.indexOf("realm:") === 0),
        config = ServiceConfiguration.configurations.findOne({
            service: 'keycloak'
        }),
        user = Meteor.users.findOne({
            _id: Keycloak.CurrentUserId
        }, {
            fields: {
                'services.keycloak.roles': 1
            }
        });

    if (user && user.services && user.services.keycloak && user.services.keycloak.roles) {
        if (appRole) {
            let access = user.services.keycloak.roles.resource_access || {},
                resource = access[config.resource] || {},
                roles = resource.roles || [];
            role = role.split(':')[1];
            return _.contains(roles, role);
        } else if (realmRole) {
            let realm = user.services.keycloak.roles.realm_access || {},
                roles = realm.roles || [];
            role = role.split(':')[1];
            return _.contains(roles, role);
        } else {
            let access = user.services.keycloak.roles.resource_access || {},
                resource = access[config.resource] || {},
                realm = user.services.keycloak.roles.realm_access || {},
                resourceRoles = resource.roles || [],
                realmRoles = realm.roles || [];
            return _.contains(resourceRoles, role) || _.contains(realmRoles, role);

        }
    }
    return false;

};
