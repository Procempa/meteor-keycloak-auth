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
        realm: data['realm'],
        loginStyle: "redirect",
        resource: data['resource']
      }
    })
  }
});
