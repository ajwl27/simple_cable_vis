/**
 * Revised Cable Visualization Component (v2)
 *
 * This version restores evenly spaced, perpendicular joins between cables and nodes.
 * It uses a minimal extension (minExtension) for safe points instead of a fixed buffer,
 * ensuring that cables leave and enter nodes with a single, short perpendicular segment.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const CableVisualization = () => {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Define nodes and channels
  const nodes = [
    { id: 'A', x: 400, y: 100, width: 80, height: 80 },
    { id: 'B', x: 200, y: 300, width: 80, height: 80 },
    { id: 'C', x: 600, y: 300, width: 80, height: 80 },
    { id: 'D', x: 500, y: 200, width: 80, height: 80 },
    { id: 'E', x: 250, y: 125, width: 80, height: 80 }
  ];
  
  const channels = [
    { id: 'channel1', y: 50, label: "Channel", labelX: 50, orientation: 'horizontal' },
    { id: 'channel2', x: 150, label: "Channel2", labelY: 150, orientation: 'vertical' }
  ];

  const cables = [
    { id: 'c1', path: ['A', 'B'], color: 'blue' },
    { id: 'c2', path: ['A', 'B'], color: 'orange' },
    { id: 'c3', path: ['A', 'B'], color: 'green' },
    { id: 'c4', path: ['B', 'C'], color: 'red' },
    { id: 'c5', path: ['B', 'C'], color: 'purple' },
    { id: 'c6', path: ['A', 'C'], color: 'yellow' },
    { id: 'c7', path: ['A', 'C'], color: 'cyan' },
    { id: 'c8', path: ['A', 'C'], color: 'magenta' },
    { id: 'c9',  path: ['A', 'C'], color: 'lime' },
    { id: 'c10', path: ['A', 'C'], color: 'pink' },
    { id: 'c11', path: ['A', 'C'], color: 'teal' },
    { id: 'c12', path: ['A', 'C'], color: 'brown' },
    { id: 'c13', path: ['A', 'C'], color: 'coral' },
    { id: 'c14', path: ['A', 'C'], color: 'gold' },
    { id: 'c15', path: ['A', 'C'], color: 'indigo' },
    { id: 'c16', path: ['C', 'channel1', 'A'], color: 'maroon' },  
    { id: 'c17', path: ['C', 'channel1', 'A'], color: 'olive' },
    { id: 'c18', path: ['C', 'A'], color: 'navy' },
    { id: 'c19', path: ['B','channel2', 'E'], color: 'navy' },
    { id: 'c20', path: ['A', 'channel1', 'E'], color: 'navy' },
    { id: 'c21', path: ['C', 'E'], color: 'navy' },
    { id: 'c22', path: ['D', 'E'], color: 'navy' },
    { id: 'c23', path: ['D', 'A'], color: 'navy' }
  ];

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper: Get element (node or channel) by id
  const getElementById = (id) => {
    const node = nodes.find(n => n.id === id);
    if (node) return { ...node, type: 'node' };

    const channel = channels.find(c => c.id === id);
    if (channel) return { ...channel, type: 'channel' };

    return null;
  };

  // Existing dynamic spacing function.
  const calculateDynamicSpacing = (zoom, numCables, edgeLength) => {
    if (numCables <= 1) return 0;
    const minSpacing = 1;
    const zoomThreshold = 0.5;
    const maxZoomEffect = 3.0;
    if (zoom.k < zoomThreshold) {
      return 0;
    }
    const normalizedZoom = Math.min(
      (zoom.k - zoomThreshold) / (maxZoomEffect - zoomThreshold),
      1.0
    );
    const easedZoom = normalizedZoom * normalizedZoom * (3 - 2 * normalizedZoom);
    const baseSpacing = 80;
    const zoomBasedSpacing = minSpacing + (baseSpacing * easedZoom);
    const maxEdgeSpace = edgeLength;
    const maxSpacing = maxEdgeSpace / (numCables + 1);
    return Math.min(zoomBasedSpacing, maxSpacing);
  };

  // Returns connection points on a channel with an offset for spacing.
  const getChannelConnectionPoints = (channel, cableIdx, totalCables, zoom) => {
    const channelSpacing = 2 + (zoom.k * 5);
    let offset;
    if (totalCables % 2 === 0) {
      offset = (cableIdx % 2 === 0) ?
        -channelSpacing * (Math.floor(cableIdx / 2) + 0.5) :
        channelSpacing * (Math.floor(cableIdx / 2) + 0.5);
    } else {
      if (cableIdx === 0) {
        offset = 0;
      } else {
        offset = (cableIdx % 2 === 1) ?
          -channelSpacing * Math.ceil(cableIdx / 2) :
          channelSpacing * Math.ceil(cableIdx / 2);
      }
    }
    return { x: 0, y: channel.y + offset, offset };
  };

  // Returns evenly spaced connection points along a node's edge.
  const getDynamicConnectionPoints = (node, edge, numConnections, zoom) => {
    if (numConnections <= 0) return [];
    const edgeLength = (edge === 'top' || edge === 'bottom') ? node.width : node.height;
    const spacing = calculateDynamicSpacing(zoom, numConnections, edgeLength);
    const nodeCenter = {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
    const points = [];
    if (spacing === 0 || numConnections === 1) {
      switch (edge) {
        case 'top':
          points.push({ x: nodeCenter.x, y: node.y });
          break;
        case 'right':
          points.push({ x: node.x + node.width, y: nodeCenter.y });
          break;
        case 'bottom':
          points.push({ x: nodeCenter.x, y: node.y + node.height });
          break;
        case 'left':
          points.push({ x: node.x, y: nodeCenter.y });
          break;
        default:
          break;
      }
      while (points.length < numConnections) {
        points.push({ ...points[0] });
      }
      return points;
    }
    const totalWidth = spacing * (numConnections - 1);
    const startOffset = -totalWidth / 2;
    for (let i = 0; i < numConnections; i++) {
      const offset = startOffset + (i * spacing);
      let point;
      switch (edge) {
        case 'top':
          point = { x: nodeCenter.x + offset, y: node.y };
          break;
        case 'right':
          point = { x: node.x + node.width, y: nodeCenter.y + offset };
          break;
        case 'bottom':
          point = { x: nodeCenter.x + offset, y: node.y + node.height };
          break;
        case 'left':
          point = { x: node.x, y: nodeCenter.y + offset };
          break;
        default:
          point = { ...nodeCenter };
      }
      points.push(point);
    }
    return points;
  };

  // ---- New Helper Functions for Orthogonal Routing ----

  // Compute a "safe" point just off the node edge.
  // Here we use minExtension (a small zoom-dependent value) instead of a fixed buffer.
  const computeSafePoint = (node, connectionPoint, edge, extension) => {
    switch (edge) {
      case 'top':
        return { x: connectionPoint.x, y: node.y - extension };
      case 'bottom':
        return { x: connectionPoint.x, y: node.y + node.height + extension };
      case 'left':
        return { x: node.x - extension, y: connectionPoint.y };
      case 'right':
        return { x: node.x + node.width + extension, y: connectionPoint.y };
      default:
        return connectionPoint;
    }
  };

  // Compute the intermediate bend points.
  // For vertical connections, the intermediate segment is horizontal.
  // For horizontal connections, the intermediate segment is vertical.
  const computeIntermediatePoints = (sourceSafe, targetSafe, orientation, offset) => {
    if (orientation === 'vertical') {
      const interY = (sourceSafe.y + targetSafe.y) / 2 + offset;
      return [
        { x: sourceSafe.x, y: interY },
        { x: targetSafe.x, y: interY }
      ];
    } else if (orientation === 'horizontal') {
      const interX = (sourceSafe.x + targetSafe.x) / 2 + offset;
      return [
        { x: interX, y: sourceSafe.y },
        { x: interX, y: targetSafe.y }
      ];
    }
    return [];
  };

  // Collision detection: check if a strictly horizontal/vertical segment intersects a node.
  const segmentIntersectsNode = (start, end, node) => {
    if (start.y === end.y) {
      const y = start.y;
      const segMinX = Math.min(start.x, end.x);
      const segMaxX = Math.max(start.x, end.x);
      if (y >= node.y && y <= node.y + node.height) {
        if (segMaxX >= node.x && segMinX <= node.x + node.width) {
          return true;
        }
      }
    }
    if (start.x === end.x) {
      const x = start.x;
      const segMinY = Math.min(start.y, end.y);
      const segMaxY = Math.max(start.y, end.y);
      if (x >= node.x && x <= node.x + node.width) {
        if (segMaxY >= node.y && segMinY <= node.y + node.height) {
          return true;
        }
      }
    }
    return false;
  };

  // Insert detour points for a segment that intersects a node.
  const insertDetourForSegment = (start, end, node, margin = 5) => {
    let detourPoints = [];
    if (start.y === end.y) { // horizontal segment
      const detourY = (start.y <= node.y) ? node.y - margin : node.y + node.height + margin;
      detourPoints.push({ x: start.x, y: detourY });
      detourPoints.push({ x: end.x, y: detourY });
    } else if (start.x === end.x) { // vertical segment
      const detourX = (start.x <= node.x) ? node.x - margin : node.x + node.width + margin;
      detourPoints.push({ x: detourX, y: start.y });
      detourPoints.push({ x: detourX, y: end.y });
    }
    return detourPoints;
  };

  // Adjust the route to avoid collisions with nodes that are not endpoints.
  const adjustRouteForCollisions = (route, cable) => {
    const endpoints = cable.path.filter(id => {
      const elem = getElementById(id);
      return elem && elem.type === 'node';
    });

    let newRoute = [route[0]];
    for (let i = 0; i < route.length - 1; i++) {
      let segmentStart = newRoute[newRoute.length - 1];
      let segmentEnd = route[i + 1];
      nodes.forEach(node => {
        if (endpoints.find(ep => ep.id === node.id)) return;
        if (segmentIntersectsNode(segmentStart, segmentEnd, node)) {
          const detour = insertDetourForSegment(segmentStart, segmentEnd, node);
          if (detour.length === 2) {
            newRoute.push(detour[0]);
            newRoute.push(detour[1]);
            segmentStart = detour[1];
          }
        }
      });
      newRoute.push(segmentEnd);
    }
    return newRoute;
  };

  // ---- Revised Cable Route Calculation ----

  const calculateCableRoutes = (zoom) => {
    const cableRoutes = {};

    // Group cables by endpoints: direct node-to-node vs. channel-based.
    const directNodeToNodeCables = {};
    const channelCables = {};
    cables.forEach(cable => {
      if (cable.path.length === 2) {
        const sourceId = cable.path[0];
        const targetId = cable.path[1];
        const key = sourceId < targetId ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
        if (!directNodeToNodeCables[key]) {
          directNodeToNodeCables[key] = [];
        }
        directNodeToNodeCables[key].push(cable);
      } else if (cable.path.length >= 3 && cable.path[1].startsWith('channel')) {
        const channelId = cable.path[1];
        if (!channelCables[channelId]) {
          channelCables[channelId] = [];
        }
        channelCables[channelId].push(cable);
      }
    });

    // Use a minimal extension (minExtension) for safe points.
    const minExtension = 1 + (zoom.k * 2);

    // Process direct node-to-node connections.
    Object.values(directNodeToNodeCables).forEach(cablesGroup => {
      if (cablesGroup.length === 0) return;
      const firstCable = cablesGroup[0];
      const sourceId = firstCable.path[0];
      const targetId = firstCable.path[1];
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === targetId);
      if (!sourceNode || !targetNode) return;

      // Decide connection orientation based on node positions.
      const verticalConnection = Math.abs(sourceNode.y - targetNode.y) > Math.abs(sourceNode.x - targetNode.x);
      let sourceEdge, targetEdge;
      if (verticalConnection) {
        if (sourceNode.y < targetNode.y) {
          sourceEdge = 'bottom';
          targetEdge = 'top';
        } else {
          sourceEdge = 'top';
          targetEdge = 'bottom';
        }
      } else {
        if (sourceNode.x < targetNode.x) {
          sourceEdge = 'right';
          targetEdge = 'left';
        } else {
          sourceEdge = 'left';
          targetEdge = 'right';
        }
      }

      const sourcePoints = getDynamicConnectionPoints(sourceNode, sourceEdge, cablesGroup.length, zoom);
      const targetPoints = getDynamicConnectionPoints(targetNode, targetEdge, cablesGroup.length, zoom);

      cablesGroup.forEach((cable, idx) => {
        const srcConn = sourcePoints[idx];
        const tgtConn = targetPoints[idx];

        // Compute safe points using the minimal extension.
        const srcSafe = computeSafePoint(sourceNode, srcConn, sourceEdge, minExtension);
        const tgtSafe = computeSafePoint(targetNode, tgtConn, targetEdge, minExtension);

        // Calculate per-cable offset for the intermediate segment.
        const spacing = verticalConnection
          ? calculateDynamicSpacing(zoom, cablesGroup.length, sourceNode.width)
          : calculateDynamicSpacing(zoom, cablesGroup.length, sourceNode.height);
        const offset = (idx - (cablesGroup.length - 1) / 2) * spacing;

        const intermediate = verticalConnection
          ? computeIntermediatePoints(srcSafe, tgtSafe, 'vertical', offset)
          : computeIntermediatePoints(srcSafe, tgtSafe, 'horizontal', offset);

        // Build route with only one short perpendicular extension per node.
        let path = [];
        path.push(srcConn);
        path.push(srcSafe);
        path.push(intermediate[0]);
        path.push(intermediate[1]);
        path.push(tgtSafe);
        path.push(tgtConn);

        // Adjust for collisions.
        path = adjustRouteForCollisions(path, cable);
        cableRoutes[cable.id] = path;
      });
    });

    // Process channel-based paths.
    Object.entries(channelCables).forEach(([channelId, cablesGroup]) => {
      const channel = channels.find(c => c.id === channelId);
      if (!channel || cablesGroup.length === 0) return;

      cablesGroup.forEach((cable, idx) => {
        let path = [];
        const sourceId = cable.path[0];
        const targetId = cable.path[2];
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        if (!sourceNode || !targetNode) return;

        // Choose node edge based on channel position.
        const sourceEdge = (channel.y < sourceNode.y) ? 'top' : 'bottom';
        const targetEdge = (channel.y < targetNode.y) ? 'top' : 'bottom';

        const sourcePoints = getDynamicConnectionPoints(sourceNode, sourceEdge, cablesGroup.length, zoom);
        const targetPoints = getDynamicConnectionPoints(targetNode, targetEdge, cablesGroup.length, zoom);
        const srcConn = sourcePoints[idx];
        const tgtConn = targetPoints[idx];

        const srcSafe = computeSafePoint(sourceNode, srcConn, sourceEdge, minExtension);
        const tgtSafe = computeSafePoint(targetNode, tgtConn, targetEdge, minExtension);

        const channelInfo = getChannelConnectionPoints(channel, idx, cablesGroup.length, zoom);

        path.push(srcConn);
        path.push(srcSafe);
        path.push({ x: srcSafe.x, y: channel.y + channelInfo.offset });
        path.push({ x: tgtSafe.x, y: channel.y + channelInfo.offset });
        path.push(tgtSafe);
        path.push(tgtConn);

        path = adjustRouteForCollisions(path, cable);
        cableRoutes[cable.id] = path;
      });
    });

    return cableRoutes;
  };

  // ---- D3 Drawing Code ----

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Create main group for zoom/pan.
    const g = svg.append("g")
      .attr("transform", transform);

    // Calculate cable routes.
    const cableRoutes = calculateCableRoutes(transform);

    // Line generator for strictly linear segments.
    const lineGenerator = d3.line()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveLinear);

    // Draw channels.
    channels.forEach(channel => {
      if (channel.orientation === 'horizontal') {
        g.append("line")
          .attr("x1", 0)
          .attr("y1", channel.y)
          .attr("x2", dimensions.width)
          .attr("y2", channel.y)
          .attr("stroke", "#444")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5")
          .attr("class", `channel channel-${channel.id}`);
      } else {
        g.append("line")
          .attr("x1", channel.x)
          .attr("y1", 0)
          .attr("x2", channel.x)
          .attr("y2", dimensions.height)
          .attr("stroke", "#444")
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", "5,5")
          .attr("class", `channel channel-${channel.id}`);
      }
      g.append("text")
        .attr("x", channel.labelX)
        .attr("y", channel.y - 10)
        .attr("text-anchor", "start")
        .attr("font-size", "16px")
        .text(channel.label);
    });

    // Draw nodes.
    g.selectAll(".node")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("class", "node")
      .attr("x", d => d.x)
      .attr("y", d => d.y)
      .attr("width", d => d.width)
      .attr("height", d => d.height)
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    // Draw cables.
    Object.entries(cableRoutes).forEach(([cableId, path]) => {
      const cable = cables.find(c => c.id === cableId);
      g.append("path")
        .attr("d", lineGenerator(path))
        .attr("stroke", cable.color || "#999")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("class", `cable cable-${cableId}`)
        .attr("id", `cable-${cableId}`);
    });

    // Add node labels.
    g.selectAll(".label")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", d => d.x + d.width / 2)
      .attr("y", d => d.y + d.height / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "24px")
      .attr("font-weight", "bold")
      .text(d => d.id);

    // Setup zoom behavior.
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.5, 3.0])
      .on("zoom", (event) => {
        setTransform(event.transform);
      });
    svg.call(zoomBehavior);
  }, [transform, dimensions]);

  return (
    <div className="cable-visualization" style={{ width: '100%', height: '100vh' }}>
      <svg ref={svgRef} width="100%" height="100%">
        {/* D3 will render SVG content here */}
      </svg>
      <div className="info" style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.7)', padding: '5px' }}>
        Zoom: {transform.k.toFixed(2)}x | Pan: ({transform.x.toFixed(0)}, {transform.y.toFixed(0)})
      </div>
    </div>
  );
};

export default CableVisualization;
