Keycloak = {};

Util = {
	spawn: _spawn
}

function _spawn(generatorFunc) {
  return function() {
    function continuer(verb, arg) {
      var result;
      try {
        result = generator[verb](arg);
      } catch (err) {
        return Promise.reject(err);
      }
      if (result.done) {
        return result.value;
      } else {
        return Promise.resolve(result.value).then(onFulfilled, onRejected);
      }
    }
    var generator = generatorFunc.apply(this, arguments);
    var onFulfilled = continuer.bind(continuer, "next");
    var onRejected = continuer.bind(continuer, "throw");
    return onFulfilled();
  }
}
