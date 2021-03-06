import R from 'ramda';

import { SELECTION_ENTITY_TYPE } from './constants';

export const isEntitySelected = R.curry(
  (entityName, selection, id) => R.pipe(
    R.filter(R.propEq('entity', entityName)),
    R.find(R.propEq('id', id)),
    R.isNil,
    R.not
  )(selection)
);

export const isNodeSelected = isEntitySelected(SELECTION_ENTITY_TYPE.NODE);

export const isLinkSelected = isEntitySelected(SELECTION_ENTITY_TYPE.LINK);

export const isCommentSelected = isEntitySelected(SELECTION_ENTITY_TYPE.COMMENT);

export const isPinSelected = (linkingPin, renderablePin) => (
  linkingPin &&
  linkingPin.nodeId === renderablePin.nodeId &&
  linkingPin.pinKey === renderablePin.key
);
