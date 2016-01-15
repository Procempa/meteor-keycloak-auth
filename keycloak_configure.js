Template.configureLoginServiceDialogForKeycloak.helpers({
  siteUrl: function () {
    return Meteor.absoluteUrl();
  }
});

Template.configureLoginServiceDialogForKeycloak.fields = function () {
  return [
		{property: 'authServerUrl', label: 'https://sso-16-des.procempa.com.br/auth'},
    {property: 'appId', label: 'App ID'},
    {property: 'secret', label: 'App Secret'}
  ];
};
