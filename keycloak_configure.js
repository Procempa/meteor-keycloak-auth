Template.configureLoginServiceDialogForKeycloak.helpers({
  siteUrl: function () {
    return Meteor.absoluteUrl();
  }
});

Template.configureLoginServiceDialogForKeycloak.fields = function () {
  return [
		{property: 'authServerUrl', label: ''}
  ];
};
