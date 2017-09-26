function active(test, currentClasses = '', activeClass = 'active') {
  return test ? `${activeClass} ${currentClasses}` : currentClasses;
}

function disabled(test, currentClasses = '', disabledClass = 'disabled') {
  return test ? `${disabledClass} ${currentClasses}` : currentClasses;
}

export {
  active,
  disabled
};
