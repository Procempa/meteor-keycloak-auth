
Meteor.publish(null, function() {
  Keycloak.CurrentUserId = this.userId;
});

Meteor.publish("keycloak.roles", function() {
  var self = this;
  let user = Meteor.users.findOne({
      _id: self.userId
    }, {
      fields: {
        'services.keycloak.roles': 1
      }
    });

  if (user && user.services && user.services.keycloak && user.services.keycloak.roles) {
    _.each(user.services.keycloak.roles, (value, key) => {
      self.added("keycloak.roles", key, value);
    });
  }

  self.ready();
});
