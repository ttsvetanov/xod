export function getViewableSize(defaultWidth = 0, defaultHeight = 0) {
  const sizes = {
    width: defaultWidth,
    height: defaultHeight,
  };

  if (window || document) {
    sizes.width = (
      document.body.clientWidth || document.documentElement.clientWidth || window.innerWidth || 0
    );
    sizes.height = (
      document.body.clientHeight || document.documentElement.clientHeight || window.innerHeight || 0
    );
  }

  return sizes;
}

export const isInput = event => (
  event.target.nodeName === 'INPUT' ||
  event.target.nodeName === 'TEXTAREA' ||
  event.target.nodeName === 'SELECT'
);

export const findParentByClassName = (element, className) => {
  let result = null;
  if (element && element.classList && element.classList.contains(className)) {
    result = element;
  } else if (element.parentNode) {
    result = findParentByClassName(element.parentNode, className);
  }
  return result;
};

export const checkForMouseBubbling = (event, parent) => {
  const elem = event.toElement || event.relatedTarget;
  return (elem.parentNode === parent || elem === parent);
};

export const isInputTarget = (event) => {
  const target = event.target || event.srcElement;
  const type = target.nodeName;
  const inputs = ['INPUT', 'TEXTAREA', 'SELECT'];

  return (inputs.indexOf(type) !== -1);
};
