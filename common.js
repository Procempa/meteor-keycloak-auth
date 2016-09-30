import _ from 'lodash';

export const DISCARDED_MESSAGES = ['ping', 'pong', 'sub'];


export function isInRole(user, roles, scope) {
	roles = (typeof roles === 'string') ? [roles] : roles;
	let userRoles = [];
	if (scope) {
		if (scope === 'realm') {
			userRoles = userRoles.concat(user.roles.realm);
		} else if (scope === 'client') {
			userRoles = userRoles.concat(user.roles.client);
		} else {
			throw new 'Invalid scope parameter, please use "realm" or "client"';
		}
	} else {
		userRoles = userRoles.concat(user.roles.client, user.roles.realm);
	}
	return (_.intersection(userRoles, roles).length > 0);
}
