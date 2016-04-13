Meteor.startup(() => {
  const fs = Npm.require('fs'),
    json = fs.realpathSync(process.cwd() + '/../server/assets/app/keycloak.json');
  if (fs.existsSync(json)) {
    var data = JSON.parse(fs.readFileSync(json, 'utf8'));
    ServiceConfiguration.configurations.upsert({
      service: "keycloak"
    }, {
      $set: {
        realmUrl: data["auth-server-url"] + '/realms/' + data.realm,
        realm: data.realm,
        loginStyle: "redirect",
        resource: data.resource
      }
    });
  }
});
