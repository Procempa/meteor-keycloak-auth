Keycloak = {};

Meteor.startup(() => {
  const fs = Npm.require('fs'),
    json = process.env.PWD + '/server/keycloak.json';

  if (fs.existsSync(json)) {
    var data = JSON.parse(fs.readFileSync(json, 'utf8'));
    ServiceConfiguration.configurations.upsert({
      service: "keycloak"
    }, {
      $set: {
        realmUrl: data['auth-server-url'] + '/realms/' + data['realm'],
        //loginStyle: "redirect",
        loginStyle: "popup",
        resource: data['resource']
      }
    })
  }
});


OAuth.registerService('keycloak', 2, null, function(query) {

  var login = Meteor.wrapAsync(doLogin);

  var res = login(query);

  return res;

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
    redirectUri = encodeURIComponent(OAuth._redirectUri('keycloak', config)),
    params = 'code=' + code + '&application_session_state=' + sessionId + '&redirect_uri=' + redirectUri,
    uri = config.realmUrl + '/tokens/access/codes',
    fs = Npm.require('fs'),
    json = process.env.PWD + '/server/keycloak.json',
    configFile = JSON.parse(fs.readFileSync(json, 'utf8')),
    headers = {
      'Content-Length': params.length,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + new Buffer(config.resource + ':' + configFile['realm-public-key']).toString('base64'),
    },
    URL = Npm.require('url');

  let options = URL.parse(uri);
  options.headers = headers;
  options.method = 'POST';

  let protocol = Npm.require(options.protocol === 'https:' ? 'https' : 'http');

  let promise = new Promise(function(resolve, reject) {
      let request = protocol.request(options, (response) => {
        let json = '';
        response.on('data', (d) => {
          json += d.toString();
        });
        response.on('end', () => {
          resolve(json);
        });
      });
      request.write(params);
      request.end();
    })
    .then(function(json) {
      let plainKey = configFile['realm-public-key'];
      let publicKey = "-----BEGIN PUBLIC KEY-----\n";
      for (i = 0; i < plainKey.length; i = i + 64) {
        publicKey += plainKey.substring(i, i + 64);
        publicKey += "\n";
      }
      publicKey += "-----END PUBLIC KEY-----\n";

      let grant = createGrant(json, config.resource, publicKey);

      let result = {
        serviceData: {
					id: grant.access_token.content.preferred_username,
          token: grant.access_token.token,
          expiresAt: (+new Date) + (1000 * grant.expires_in),
          name: grant.access_token.content.name,
          email: grant.access_token.content.email,
          given_name: grant.access_token.content.given_name,
          family_name: grant.access_token.content.family_name
        },
        options: {
          profile: {
            name: grant.access_token.content.name
          }
        }
      };
      cb(null, result);
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
};



function validateGrant(grant, publicKey) {
  grant.access_token = validateToken(grant.access_token, publicKey);
  grant.refresh_token = validateToken(grant.refresh_token, publicKey);
  grant.id_token = validateToken(grant.id_token, publicKey);
  return grant;
}


validateToken = function(token, publicKey) {
  if (!token) {
    return;
  }

  if (token.isExpired()) {
    return;
  }

  if (token.content.iat < this.notBefore) {
    return;
  }
  var crypto = Npm.require('crypto')
  var verify = crypto.createVerify('RSA-SHA256');
  verify.update(token.signed);
  if (!verify.verify(publicKey, token.signature, 'base64')) {
    return;
  }

  return token;
};
