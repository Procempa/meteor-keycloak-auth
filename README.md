Keycloak OAuth Flow in Meteor
=============================================
Requires meteor 1.3.

Installation from Atmosphere:
```bash
  	meteor add procempa:keycloak-auth
```


Example
---------------------------------------------
```javascript
import 'meteor/silveirado:keycloak-auth';


angular.module('exampleApp')
  .run(['$transitions', '$timeout', authenticationRun])

function authenticationRun($transitions, $timeout) {
  $transitions
    .onBefore({
      to: '*',
      from: '*'
    }, [() => {
      if (Meteor.userId() || Meteor.loggingIn()) {
        return true;
      } else {
        Meteor.loginWithKeyCloak()
        return false
      }
    }])
}

function exampleRoute($stateProvider) {
  $stateProvider
    .state('example-list', {
      url: '/example',
      templateUrl: 'example.html',
      controller: 'exampleCtrl',
			resolve: {
				role: Keycloak.isInRole.bind(this, 'exampleRole')
			}
    });
}
```
