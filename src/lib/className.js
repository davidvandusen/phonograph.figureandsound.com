function active(test, currentClasses = '', activeClass = 'active') {
  return test ? `${activeClass} ${currentClasses}` : currentClasses;
}

export {
  active
};
