import R from 'ramda';
import { createSelector } from 'reselect';

import * as XP from 'xod-project';

import {
  addNodePositioning,
  addLinksPositioning,
  addPoints,
} from './nodeLayout';
import { SELECTION_ENTITY_TYPE } from '../editor/constants';
import {
  getSelection,
  getCurrentPatchPath,
  getLinkingPin,
  getTabs,
} from '../editor/selectors';

import { createMemoizedSelector } from '../utils/selectorTools';

export const getProject = R.prop('project');
export const projectLens = R.lensProp('project');

//
// Patch
//

// :: State -> StrMap Comment
export const getCurrentPatchComments = createSelector(
  [getProject, getCurrentPatchPath],
  (project, currentPatchPath) => {
    if (!currentPatchPath) return {};

    return R.compose(
      R.indexBy(R.prop('id')),
      XP.listComments,
      XP.getPatchByPathUnsafe(currentPatchPath)
    )(project);
  }
);

// :: State -> StrMap Link
export const getCurrentPatchLinks = createSelector(
  [getProject, getCurrentPatchPath],
  (project, currentPatchPath) => {
    if (!currentPatchPath) return {};

    return R.compose(
      R.indexBy(R.prop('id')),
      XP.listLinks,
      XP.getPatchByPathUnsafe(currentPatchPath)
    )(project);
  }
);

// returns object with a shape { nodeId: { pinKey: Boolean } }
const getConnectedPins = createMemoizedSelector(
  [getCurrentPatchLinks],
  [R.equals],
  R.compose(
    R.reduce(
      (acc, link) => R.compose(
        R.assocPath([
          XP.getLinkInputNodeId(link),
          XP.getLinkInputPinKey(link),
        ], true),
        R.assocPath([
          XP.getLinkOutputNodeId(link),
          XP.getLinkOutputPinKey(link),
        ], true)
      )(acc),
      {}
    ),
    R.values
  )
);

// :: IndexedLinks -> IntermediateNode -> IntermediateNode
const assocPinIsConnected = R.curry((connectedPins, node) =>
  R.over(
    R.lensProp('pins'),
    R.map(pin =>
      R.assoc(
        'isConnected',
        !!R.path([node.id, pin.key], connectedPins),
        pin
      )
    ),
    node
  )
);

// :: IntermediateNode -> IntermediateNode
const assocNodeIdToPins = node =>
  R.over(
    R.lensProp('pins'),
    R.map(
      R.assoc('nodeId', node.id)
    ),
    node
  );

// :: Project -> IntermediateNode -> IntermediateNode
const mergePinDataFromPatch = R.curry((project, node) => {
  const type = XP.getNodeType(node);

  const pins = R.compose(
    R.map(pin => R.assoc(
      'value',
      XP.getBoundValueOrDefault(pin, node),
      pin
    )),
    patchPins => R.compose(
      R.mergeWith(R.merge, R.__, patchPins),
      R.map(R.compose(
        R.objOf('normalizedLabel'),
        XP.getPinLabel
      )),
      R.indexBy(XP.getPinKey),
      XP.normalizePinLabels,
      R.values
    )(patchPins),
    // TODO: add something like getPinsIndexedByKey to xod-project?
    // + see other 'indexBy's below
    R.indexBy(XP.getPinKey),
    XP.listPins,
    XP.getPatchByPathUnsafe(type)
  )(project);

  return R.assoc(
    'pins',
    pins,
    node
  );
});

// :: State -> StrMap Node
export const getCurrentPatchNodes = createSelector(
  [getProject, getCurrentPatchPath],
  (project, currentPatchPath) => {
    if (!currentPatchPath) return {};

    return R.compose(
      R.indexBy(R.prop('id')),
      XP.listNodes,
      XP.getPatchByPathUnsafe(currentPatchPath)
    )(project);
  }
);

// :: State -> Maybe Patch
export const getCurrentPatch = createSelector(
  [getCurrentPatchPath, getProject],
  XP.getPatchByPath
);

// :: State -> StrMap RenderableNode
export const getRenderableNodes = createMemoizedSelector(
  [getProject, getCurrentPatchNodes, getConnectedPins],
  [R.T, R.equals, R.equals],
  (project, currentPatchNodes, connectedPins) =>
    R.map(
      R.compose(
        addNodePositioning,
        assocPinIsConnected(connectedPins),
        assocNodeIdToPins,
        mergePinDataFromPatch(project)
      ),
      currentPatchNodes
    )
);

// :: State -> StrMap RenderableLink
export const getRenderableLinks = createMemoizedSelector(
  [getRenderableNodes, getCurrentPatchLinks],
  [R.equals, R.equals],
  (nodes, links) =>
    R.compose(
      addLinksPositioning(nodes),
      R.map((link) => {
        const outputNodeId = XP.getLinkOutputNodeId(link);
        const outputPinKey = XP.getLinkOutputPinKey(link);

        return R.merge(
          link,
          {
            type: nodes[outputNodeId].pins[outputPinKey].type,
          }
        );
      })
    )(links)
);

// :: State -> StrMap RenderableComment
export const getRenderableComments = getCurrentPatchComments;

// :: State -> LinkGhost
export const getLinkGhost = createSelector(
  [getRenderableNodes, getLinkingPin],
  (nodes, fromPin) => {
    if (!fromPin) { return null; }

    const node = nodes[fromPin.nodeId];
    const pin = node.pins[fromPin.pinKey];

    return {
      id: '',
      type: pin.type,
      from: addPoints(pin.position, node.position),
      to: { x: 0, y: 0 },
    };
  }
);


//
// Tabs
//

// :: State -> EditorTabs
export const getPreparedTabs = createSelector(
  [getCurrentPatchPath, getProject, getTabs],
  (currentPatchPath, project, tabs) =>
    R.map(
      (tab) => {
        const patchPath = tab.id;

        const label = R.compose(
          XP.getBaseName,
          XP.getPatchPath,
          XP.getPatchByPathUnsafe(patchPath)
        )(project);

        return R.merge(
          tab,
          {
            label,
            isActive: (currentPatchPath === tab.id),
          }
        );
      },
      tabs
    )
);


//
// Inspector
//

// :: State -> [ RenderableSelection ]
export const getRenderableSelection = createMemoizedSelector(
  [getRenderableNodes, getRenderableLinks, getRenderableComments, getSelection],
  [R.equals, R.equals, R.equals, R.equals],
  (renderableNodes, renderableLinks, renderableComments, selection) => {
    const renderables = {
      [SELECTION_ENTITY_TYPE.NODE]: renderableNodes,
      [SELECTION_ENTITY_TYPE.LINK]: renderableLinks,
      [SELECTION_ENTITY_TYPE.COMMENT]: renderableComments,
    };

    return R.map(
      ({ entity, id }) => ({
        entityType: entity,
        data: renderables[entity][id],
      }),
      selection
    );
  }
);
