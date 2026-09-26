import React, { useMemo } from 'react';

import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  EdgeLabelRenderer,
} from '@xyflow/react';

import {
  AlertCircle,
  Loader2,
  Network,
} from 'lucide-react';

import '@xyflow/react/dist/style.css';


/*
 * =================================================================
 * ENTITY TYPE CONFIGURATION
 * =================================================================
 */

const TYPE_CONFIG = {
  PERSON: {
    color: '#ef4444',
    label: 'PERSON',
  },

  PHONE: {
    color: '#3b82f6',
    label: 'PHONE',
  },

  VEHICLE: {
    color: '#f59e0b',
    label: 'VEHICLE',
  },

  LOCATION: {
    color: '#10b981',
    label: 'LOCATION',
  },

  ORGANIZATION: {
    color: '#8b5cf6',
    label: 'ORGANIZATION',
  },

  ACCOUNT: {
    color: '#06b6d4',
    label: 'ACCOUNT',
  },
};

const DEFAULT_TYPE = {
  color: '#64748b',
  label: 'ENTITY',
};


function getTypeConfig(type) {
  return TYPE_CONFIG[type] || DEFAULT_TYPE;
}


/*
 * =================================================================
 * CUSTOM GRAPH NODE
 * =================================================================
 */

function InvestigationNode({ data }) {
  const config = getTypeConfig(data.type);

  return (
    <div
      className="min-w-[190px] max-w-[230px] rounded-xl border bg-[#111827] shadow-2xl"
      style={{
        borderColor: `${config.color}80`,
        boxShadow: `0 0 28px ${config.color}14`,
      }}
    >

      <Handle
        type="target"
        position={Position.Top}
        className="!w-1.5 !h-1.5 !border-0"
        style={{
          background: config.color,
        }}
      />

      <div
        className="h-1 rounded-t-xl"
        style={{
          background: config.color,
        }}
      />

      <div className="px-4 py-3">

        <div className="flex items-center justify-between gap-3">

          <span
            className="text-[8px] font-bold tracking-[0.18em]"
            style={{
              color: config.color,
            }}
          >
            {config.label}
          </span>

          <span className="text-[8px] uppercase tracking-wider text-gray-700">
            Neo4j
          </span>

        </div>

        <div className="text-sm font-semibold text-gray-100 mt-2 leading-tight break-words">
          {data.label}
        </div>

        <div className="text-[9px] text-gray-600 mt-1">
          LLM relationship graph
        </div>

        {data.relationCount > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-800">

            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: config.color,
              }}
            />

            <span className="text-[8px] text-gray-600">
              {data.relationCount}{' '}
              {data.relationCount === 1
                ? 'relationship'
                : 'relationships'}
            </span>

          </div>
        )}

      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-1.5 !h-1.5 !border-0"
        style={{
          background: config.color,
        }}
      />

    </div>
  );
}


const nodeTypes = {
  investigation: InvestigationNode,
};


/*
 * =================================================================
 * PARALLEL RELATIONSHIP EDGE
 * =================================================================
 *
 * Multiple relationships can exist between the same two entities.
 *
 * Example:
 *
 * Rahul Kumar
 *      │
 *      ├──── CALLED 95% ──────────┐
 *      │                          │
 *      └──── FINANCIAL_LINK 95% ──┤
 *                                 ▼
 *                            Arjun Singh
 *
 * The offset changes the actual SVG path, not just the label.
 */

function ParallelRelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) {
  const offset =
    data?.parallelOffset || 0;

  const relation =
    data?.relation || {};

  const relationType =
    relation?.relation ||
    'RELATION';

  const confidence =
    typeof relation?.confidence === 'number'
      ? `${Math.round(
          relation.confidence * 100
        )}%`
      : '—';

  const direct =
    String(
      relation?.evidence_level || ''
    ).toUpperCase() === 'DIRECT';


  /*
   * --------------------------------------------------------------
   * CREATE CURVED PATH
   * --------------------------------------------------------------
   *
   * The curve is displaced perpendicular to the straight line
   * between the two nodes.
   */

  const dx =
    targetX - sourceX;

  const dy =
    targetY - sourceY;

  const distance =
    Math.sqrt(
      dx * dx +
      dy * dy
    ) || 1;


  const normalX =
    -dy / distance;

  const normalY =
    dx / distance;


  const curveAmount =
    offset * 1.15;


  const control1X =
    sourceX +
    dx * 0.33 +
    normalX * curveAmount;

  const control1Y =
    sourceY +
    dy * 0.33 +
    normalY * curveAmount;


  const control2X =
    sourceX +
    dx * 0.67 +
    normalX * curveAmount;

  const control2Y =
    sourceY +
    dy * 0.67 +
    normalY * curveAmount;


  const edgePath = `
    M ${sourceX},${sourceY}
    C
      ${control1X},${control1Y}
      ${control2X},${control2Y}
      ${targetX},${targetY}
  `;


  /*
   * --------------------------------------------------------------
   * LABEL POSITION
   * --------------------------------------------------------------
   */

  const labelX =
    sourceX +
    dx * 0.5 +
    normalX * curveAmount;

  const labelY =
    sourceY +
    dy * 0.5 +
    normalY * curveAmount;


  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={{
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
        }}
        style={{
          stroke: direct
            ? '#ef4444'
            : '#64748b',

          strokeWidth: direct
            ? 2
            : 1.5,

          strokeDasharray:
            direct
              ? '7 7'
              : undefined,
        }}
      />

      <EdgeLabelRenderer>

        <div
          className="nodrag nopan absolute px-2 py-1 rounded-md border border-gray-800 bg-[#0b0f19]/95 text-[9px] font-semibold whitespace-nowrap pointer-events-none"
          style={{
            transform:
              `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,

            color: direct
              ? '#e5e7eb'
              : '#9ca3af',
          }}
        >
          {relationType}{' '}
          {confidence}
        </div>

      </EdgeLabelRenderer>
    </>
  );
}


const edgeTypes = {
  parallelRelationship:
    ParallelRelationshipEdge,
};


/*
 * =================================================================
 * BUILD REACT FLOW GRAPH
 * =================================================================
 *
 * Backend contract:
 *
 * nodes:
 * {
 *   id,
 *   label,
 *   type
 * }
 *
 * edges:
 * {
 *   id,
 *   source,
 *   target,
 *   relation,
 *   confidence,
 *   evidence_level,
 *   reasoning_id,
 *   fir_id,
 *   reasoning,
 *   model_used
 * }
 */

function buildGraph(backendGraph) {
  if (!backendGraph) {
    return {
      nodes: [],
      edges: [],
    };
  }


  const backendNodes =
    Array.isArray(
      backendGraph.nodes
    )
      ? backendGraph.nodes
      : [];


  const backendEdges =
    Array.isArray(
      backendGraph.edges
    )
      ? backendGraph.edges
      : [];


  /*
   * --------------------------------------------------------------
   * NODE MAP
   * --------------------------------------------------------------
   */

  const nodeMap =
    new Map();


  backendNodes.forEach(
    (node) => {
      if (!node?.id) {
        return;
      }

      nodeMap.set(
        String(node.id),
        node
      );
    }
  );


  /*
   * --------------------------------------------------------------
   * ADD MISSING EDGE ENDPOINTS
   * --------------------------------------------------------------
   */

  backendEdges.forEach(
    (edge) => {
      if (!edge) {
        return;
      }


      const sourceId =
        edge.source;

      const targetId =
        edge.target;


      if (
        sourceId &&
        !nodeMap.has(
          String(sourceId)
        )
      ) {
        nodeMap.set(
          String(sourceId),
          {
            id:
              String(sourceId),

            label:
              edge.source_name ||
              sourceId,

            type:
              edge.source_type ||
              'ENTITY',
          }
        );
      }


      if (
        targetId &&
        !nodeMap.has(
          String(targetId)
        )
      ) {
        nodeMap.set(
          String(targetId),
          {
            id:
              String(targetId),

            label:
              edge.target_name ||
              targetId,

            type:
              edge.target_type ||
              'ENTITY',
          }
        );
      }
    }
  );


  /*
   * --------------------------------------------------------------
   * RELATIONSHIP DEGREE
   * --------------------------------------------------------------
   *
   * Used ONLY for visual layout.
   *
   * This is NOT:
   * - PageRank
   * - threat score
   * - criminal ranking
   */

  const degree =
    new Map();


  backendEdges.forEach(
    (edge) => {
      const sourceId =
        edge?.source;

      const targetId =
        edge?.target;


      if (sourceId) {
        const id =
          String(sourceId);

        degree.set(
          id,
          (degree.get(id) || 0) + 1
        );
      }


      if (targetId) {
        const id =
          String(targetId);

        degree.set(
          id,
          (degree.get(id) || 0) + 1
        );
      }
    }
  );


  /*
   * --------------------------------------------------------------
   * SORT NODES
   * --------------------------------------------------------------
   */

  const sortedNodes =
    Array.from(
      nodeMap.values()
    ).sort(
      (a, b) =>
        (degree.get(
          String(b.id)
        ) || 0) -
        (degree.get(
          String(a.id)
        ) || 0)
    );


  /*
   * --------------------------------------------------------------
   * NODE POSITIONS
   * --------------------------------------------------------------
   */

  const primaryId =
    sortedNodes[0]?.id
      ? String(
          sortedNodes[0].id
        )
      : null;


  const positionMap =
    new Map();


  if (primaryId) {
    positionMap.set(
      primaryId,
      {
        x: 0,
        y: 0,
      }
    );
  }


  const remainingNodes =
    sortedNodes.filter(
      (node) =>
        String(node.id) !==
        primaryId
    );


  const positions = [
    {
      x: -420,
      y: -30,
    },

    {
      x: 420,
      y: -30,
    },

    {
      x: 0,
      y: 270,
    },

    {
      x: -300,
      y: 260,
    },

    {
      x: 300,
      y: 260,
    },

    {
      x: -260,
      y: -260,
    },

    {
      x: 260,
      y: -260,
    },

    {
      x: -520,
      y: 300,
    },

    {
      x: 520,
      y: 300,
    },
  ];


  remainingNodes.forEach(
    (node, index) => {
      positionMap.set(
        String(node.id),
        positions[index] || {
          x:
            (index % 4) *
              280 -
            420,

          y:
            Math.floor(
              index / 4
            ) *
              240 +
            360,
        }
      );
    }
  );


  /*
   * --------------------------------------------------------------
   * REACT FLOW NODES
   * --------------------------------------------------------------
   */

  const nodes =
    sortedNodes.map(
      (node) => {
        const nodeId =
          String(node.id);


        return {
          id: nodeId,

          type:
            'investigation',

          position:
            positionMap.get(
              nodeId
            ) || {
              x: 0,
              y: 0,
            },


          data: {
            label:
              node.label ||
              node.value ||
              node.name ||
              nodeId,

            type:
              node.type ||
              node.entity_type ||
              'ENTITY',

            relationCount:
              degree.get(
                nodeId
              ) || 0,

            entity:
              node,
          },
        };
      }
    );


  /*
   * --------------------------------------------------------------
   * COUNT PARALLEL RELATIONSHIPS
   * --------------------------------------------------------------
   *
   * Relationships are grouped by the same pair of entities.
   *
   * Example:
   *
   * Rahul → Arjun
   * Rahul → Arjun
   *
   * gets:
   *
   * totalForPair = 2
   */

  const pairCounts =
    new Map();


  backendEdges.forEach(
    (edge) => {
      if (
        !edge?.source ||
        !edge?.target
      ) {
        return;
      }


      const source =
        String(edge.source);

      const target =
        String(edge.target);


      const pairKey =
        [source, target]
          .sort()
          .join('::');


      pairCounts.set(
        pairKey,
        (pairCounts.get(
          pairKey
        ) || 0) + 1
      );
    }
  );


  /*
   * --------------------------------------------------------------
   * TRACK POSITION WITHIN EACH PARALLEL GROUP
   * --------------------------------------------------------------
   */

  const pairIndexes =
    new Map();


  /*
   * --------------------------------------------------------------
   * REACT FLOW EDGES
   * --------------------------------------------------------------
   */

  const edges =
    backendEdges
      .filter(
        (edge) =>
          edge?.source &&
          edge?.target
      )
      .map(
        (edge, index) => {
          /*
           * IMPORTANT:
           *
           * These are the actual backend fields.
           */

          const source =
            String(edge.source);

          const target =
            String(edge.target);


          /*
           * ----------------------------------------------------
           * PARALLEL EDGE INDEX
           * ----------------------------------------------------
           */

          const pairKey =
            [source, target]
              .sort()
              .join('::');


          const totalForPair =
            pairCounts.get(
              pairKey
            ) || 1;


          const currentIndex =
            pairIndexes.get(
              pairKey
            ) || 0;


          pairIndexes.set(
            pairKey,
            currentIndex + 1
          );


          /*
           * ----------------------------------------------------
           * CALCULATE OFFSET
           * ----------------------------------------------------
           *
           * One relationship:
           *
           *       0
           *
           * Two:
           *
           *      -45    +45
           *
           * Three:
           *
           *    -60   0   +60
           */

          let parallelOffset =
            0;


          if (
            totalForPair > 1
          ) {
            const center =
              (totalForPair - 1) /
              2;


            parallelOffset =
              (
                currentIndex -
                center
              ) * 55;
          }


          /*
           * ----------------------------------------------------
           * EVIDENCE LEVEL
           * ----------------------------------------------------
           */

          const direct =
            String(
              edge.evidence_level ||
                ''
            ).toUpperCase() ===
            'DIRECT';


          /*
           * ----------------------------------------------------
           * CONFIDENCE
           * ----------------------------------------------------
           */

          const confidence =
            typeof edge.confidence ===
            'number'
              ? `${Math.round(
                  edge.confidence *
                    100
                )}%`
              : '—';


          /*
           * ----------------------------------------------------
           * FINAL EDGE
           * ----------------------------------------------------
           */

          return {
            id:
              edge.id ||
              `neo4j-edge-${index}`,

            /*
             * ReactFlow requires these exact IDs.
             */

            source,

            target,


            /*
             * Custom edge renderer.
             */

            type:
              'parallelRelationship',


            /*
             * Direct evidence gets animation.
             */

            animated:
              direct,


            /*
             * Complete backend relationship is preserved.
             */

            data: {
              relation:
                edge,

              parallelOffset,
            },


            markerEnd: {
              type:
                MarkerType.ArrowClosed,

              width: 18,

              height: 18,
            },

          };
        }
      );


  return {
    nodes,
    edges,
  };
}


/*
 * =================================================================
 * EMPTY GRAPH
 * =================================================================
 */

function EmptyGraph({
  investigation,
}) {
  const hasInvestigation =
    Boolean(
      investigation
    );


  return (
    <div className="w-full h-full flex items-center justify-center bg-police-dark">

      <div className="text-center max-w-md px-8">

        <div className="w-16 h-16 mx-auto rounded-2xl border border-gray-800 bg-gray-900 flex items-center justify-center mb-5">

          <Network className="w-8 h-8 text-gray-700" />

        </div>


        <h2 className="text-sm font-semibold text-gray-300">

          {hasInvestigation
            ? 'No LLM relationships'
            : 'Investigation workspace'}

        </h2>


        <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">

          {hasInvestigation
            ? 'No validated relationship edges were returned for this FIR.'
            : 'Upload an FIR to generate an evidence-backed relationship graph.'}

        </p>

      </div>

    </div>
  );
}


/*
 * =================================================================
 * LOADING STATE
 * =================================================================
 */

function LoadingGraph() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-police-dark">

      <div className="text-center">

        <Loader2
          className="w-8 h-8 mx-auto text-red-500 animate-spin"
        />

        <h2 className="text-sm font-semibold text-gray-300 mt-4">
          Building investigation graph
        </h2>

        <p className="text-[10px] text-gray-600 mt-2">
          Projecting validated LLM relationships into Neo4j.
        </p>

      </div>

    </div>
  );
}


/*
 * =================================================================
 * ERROR STATE
 * =================================================================
 */

function GraphError({
  error,
}) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-police-dark">

      <div className="text-center max-w-md px-8">

        <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-4" />

        <h2 className="text-sm font-semibold text-gray-300">
          Graph unavailable
        </h2>

        <p className="text-[10px] text-gray-600 mt-2 leading-relaxed break-words">
          {error ||
            'Unable to retrieve the investigation graph.'}
        </p>

      </div>

    </div>
  );
}


/*
 * =================================================================
 * MAIN GRAPH VIEW
 * =================================================================
 */

export default function GraphView({
  investigation,
  graph,
  onNodeSelect,
  isLoading = false,
  error = null,
}) {

  const reactFlowGraph =
    useMemo(
      () =>
        buildGraph(
          graph
        ),
      [graph]
    );


  /*
   * --------------------------------------------------------------
   * LOADING
   * --------------------------------------------------------------
   */

  if (isLoading) {
    return (
      <LoadingGraph />
    );
  }


  /*
   * --------------------------------------------------------------
   * ERROR
   * --------------------------------------------------------------
   */

  if (error) {
    return (
      <GraphError
        error={error}
      />
    );
  }


  /*
   * --------------------------------------------------------------
   * EMPTY
   * --------------------------------------------------------------
   */

  if (
    !investigation ||
    reactFlowGraph.nodes
      .length === 0
  ) {
    return (
      <EmptyGraph
        investigation={
          investigation
        }
      />
    );
  }


  /*
   * --------------------------------------------------------------
   * GRAPH
   * --------------------------------------------------------------
   */

  return (
    <div className="w-full h-full bg-police-dark relative">

      {/* ---------------------------------------------------------
          GRAPH HEADER
          --------------------------------------------------------- */}

      <div className="absolute top-4 left-4 z-10 pointer-events-none">

        <div className="rounded-lg border border-police-border bg-police-card/90 backdrop-blur px-3 py-2">

          <div className="flex items-center gap-2">

            <Network className="w-3.5 h-3.5 text-red-500" />

            <div className="text-[9px] uppercase tracking-widest text-gray-400">
              Investigation network
            </div>

          </div>

          <div className="text-[10px] text-gray-600 mt-1">
            Validated LLM relationships persisted in Neo4j
          </div>

        </div>

      </div>


      {/* ---------------------------------------------------------
          GRAPH METADATA
          --------------------------------------------------------- */}

      <div className="absolute top-4 right-4 z-10 pointer-events-none">

        <div className="flex items-center gap-3 rounded-lg border border-police-border bg-police-card/90 backdrop-blur px-3 py-2">

          <div className="flex items-center gap-1.5">

            <span className="w-2 h-2 rounded-full bg-red-500" />

            <span className="text-[8px] text-gray-500">
              Direct
            </span>

          </div>


          <div className="h-3 w-px bg-gray-800" />


          <div className="text-[8px] text-gray-600">
            {reactFlowGraph.nodes.length}{' '}
            entities
          </div>


          <div className="text-[8px] text-gray-600">
            {reactFlowGraph.edges.length}{' '}
            links
          </div>


          <div className="h-3 w-px bg-gray-800" />


          <div className="text-[8px] text-gray-600">
            Neo4j
          </div>

        </div>

      </div>


      {/* ---------------------------------------------------------
          REACT FLOW
          --------------------------------------------------------- */}

      <ReactFlow
        nodes={
          reactFlowGraph.nodes
        }

        edges={
          reactFlowGraph.edges
        }

        nodeTypes={
          nodeTypes
        }

        edgeTypes={
          edgeTypes
        }

        onNodeClick={
          (_, node) =>
            onNodeSelect?.(
              node
            )
        }

        fitView

        fitViewOptions={{
          padding: 0.25,

          minZoom: 0.55,

          maxZoom: 1.3,
        }}

        defaultEdgeOptions={{
          type:
            'parallelRelationship',
        }}

        proOptions={{
          hideAttribution: true,
        }}
      >

        <Controls />

        <MiniMap
          pannable
          zoomable

          style={{
            background:
              '#111827',

            border:
              '1px solid #1f2937',
          }}

          nodeColor={(node) =>
            getTypeConfig(
              node.data?.type
            ).color
          }
        />

        <Background
          gap={24}
          size={1}
          color="#182130"
        />

      </ReactFlow>

    </div>
  );
}