const factory = function (old) {
  if (!old) {
    return require('./createEnzymeRenderer');
  } else {
    return require('./_createShallowRenderer');
  }
}

export default factory
