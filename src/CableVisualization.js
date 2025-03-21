import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const CableVisualization = () => {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  // Sample data - Can be replaced with any node/channel/cable configuration
  const nodes = [
    { id: 'A', x: 400, y: 100, width: 80, height: 80 },
    { id: 'B', x: 200, y: 300, width: 80, height: 80 },
    { id: 'C', x: 600, y: 300, width: 80, height: 80 }
  ];
  
  const channels = [
    { id: 'channel1', y: 50, label: "Channel", labelX: 50, orientation: 'horizontal' }
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
    { id: 'c18', path: ['C', 'A'], color: 'navy' }
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

  // Find any element (node or channel) by ID
  const getElementById = (id) => {
    const node = nodes.find(n => n.id === id);
    if (node) return { ...node, type: 'node' };
    
    const channel = channels.find(c => c.id === id);
    if (channel) return { ...channel, type: 'channel' };
    
    return null;
  };

  // Calculate dynamic spacing based on zoom level and available space
  const calculateDynamicSpacing = (zoom, numElements, availableSpace) => {
    // If only one element or no elements, no spacing needed
    if (numElements <= 1) return 0;
    
    // Minimum spacing when zoomed out (elements start to overlap)
    const minSpacing = 1; 
    
    // Threshold zoom level where elements should start separating
    const zoomThreshold = 0.5;
    
    // Maximum zoom level for fully separated elements
    const maxZoomEffect = 3.0;
    
    // If we're below the threshold, no spacing needed
    if (zoom.k < zoomThreshold) {
      return 0;
    }
    
    // Calculate normalized zoom factor (0 to 1) for gradual transitions
    const normalizedZoom = Math.min(
      (zoom.k - zoomThreshold) / (maxZoomEffect - zoomThreshold), 
      1.0
    );
    
    // Apply easing function for smoother progression (cubic easing)
    const easedZoom = normalizedZoom * normalizedZoom * (3 - 2 * normalizedZoom);
    
    // Base spacing that represents maximum separation at full zoom
    const baseSpacing = 80;
    
    // Calculate spacing that scales with zoom level
    const zoomBasedSpacing = minSpacing + (baseSpacing * easedZoom);
    
    // Calculate maximum spacing based on available space
    const maxSpacing = availableSpace / (numElements + 1);
    
    // Return the smaller of zoom-based spacing or maximum space-based spacing
    return Math.min(zoomBasedSpacing, maxSpacing);
  };

  // CENTRAL REGISTRY: Track all connections to each node edge
  const createEdgeRegistry = () => {
    const registry = {};
    
    // Initialize registry for all nodes and edges
    nodes.forEach(node => {
      registry[node.id] = {
        top: { connections: [], count: 0 },
        right: { connections: [], count: 0 },
        bottom: { connections: [], count: 0 },
        left: { connections: [], count: 0 }
      };
    });
    
    return registry;
  };

  // Determine the optimal edges to connect based on relative positions
  const determineOptimalEdges = (sourceNode, targetNode) => {
    const sourceCenter = {
      x: sourceNode.x + sourceNode.width / 2,
      y: sourceNode.y + sourceNode.height / 2
    };
    
    const targetCenter = {
      x: targetNode.x + targetNode.width / 2,
      y: targetNode.y + targetNode.height / 2
    };
    
    // Calculate center-to-center vector
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    
    // Determine dominant direction for connection
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection dominates
      return {
        source: dx > 0 ? 'right' : 'left',
        target: dx > 0 ? 'left' : 'right'
      };
    } else {
      // Vertical connection dominates
      return {
        source: dy > 0 ? 'bottom' : 'top',
        target: dy > 0 ? 'top' : 'bottom'
      };
    }
  };

  // Register a cable connection to an edge
  const registerEdgeConnection = (registry, nodeId, edge, cable, connectionInfo) => {
    if (!registry[nodeId]) {
      registry[nodeId] = {
        top: { connections: [], count: 0 },
        right: { connections: [], count: 0 },
        bottom: { connections: [], count: 0 },
        left: { connections: [], count: 0 }
      };
    }
    
    if (!registry[nodeId][edge]) {
      registry[nodeId][edge] = { connections: [], count: 0 };
    }
    
    registry[nodeId][edge].connections.push({
      cable,
      ...connectionInfo
    });
    
    registry[nodeId][edge].count = registry[nodeId][edge].connections.length;
  };

  // Analyze all cables and register their connections in the registry
  const analyzeCableConnections = () => {
    const edgeRegistry = createEdgeRegistry();
    
    // Process direct node-to-node cables
    cables.forEach(cable => {
      if (cable.path.length === 2) {
        // Direct node-to-node connection
        const sourceId = cable.path[0];
        const targetId = cable.path[1];
        
        const sourceNode = getElementById(sourceId);
        const targetNode = getElementById(targetId);
        
        if (!sourceNode || !targetNode || 
            sourceNode.type !== 'node' || targetNode.type !== 'node') {
          return;
        }
        
        // Determine optimal edges for connection
        const { source: sourceEdge, target: targetEdge } = 
          determineOptimalEdges(sourceNode, targetNode);
        
        // Register connections in both directions
        registerEdgeConnection(edgeRegistry, sourceId, sourceEdge, cable, {
          role: 'source',
          targetId,
          targetEdge
        });
        
        registerEdgeConnection(edgeRegistry, targetId, targetEdge, cable, {
          role: 'target',
          sourceId,
          sourceEdge
        });
      } 
      else if (cable.path.length === 3 && cable.path[1].includes('channel')) {
        // Node -> Channel -> Node connection
        const sourceId = cable.path[0];
        const channelId = cable.path[1];
        const targetId = cable.path[2];
        
        const sourceNode = getElementById(sourceId);
        const channel = getElementById(channelId);
        const targetNode = getElementById(targetId);
        
        if (!sourceNode || !channel || !targetNode) return;
        
        // Determine edge based on channel position relative to node
        const sourceEdge = channel.y < sourceNode.y ? 'top' : 'bottom';
        const targetEdge = channel.y < targetNode.y ? 'top' : 'bottom';
        
        // Register connections
        registerEdgeConnection(edgeRegistry, sourceId, sourceEdge, cable, {
          role: 'source',
          targetId,
          channelId,
          targetEdge
        });
        
        registerEdgeConnection(edgeRegistry, targetId, targetEdge, cable, {
          role: 'target',
          sourceId,
          channelId,
          sourceEdge
        });
      }
    });
    
    return edgeRegistry;
  };

  // Calculate connection points for a node edge based on total connections
  const calculateEdgeConnectionPoints = (node, edge, connections, zoom) => {
    if (connections.length === 0) return [];
    
    // Get node center
    const nodeCenter = {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
    
    // Determine available space on the edge
    const edgeLength = (edge === 'top' || edge === 'bottom') ? node.width : node.height;
    
    // Calculate spacing between connection points
    const spacing = calculateDynamicSpacing(zoom, connections.length, edgeLength);
    
    // Calculate points
    const points = [];
    
    // If no spacing needed or only one connection, position in the center of the edge
    if (spacing === 0 || connections.length === 1) {
      let point;
      
      switch (edge) {
        case 'top':
          point = { x: nodeCenter.x, y: node.y };
          break;
        case 'right':
          point = { x: node.x + node.width, y: nodeCenter.y };
          break;
        case 'bottom':
          point = { x: nodeCenter.x, y: node.y + node.height };
          break;
        case 'left':
          point = { x: node.x, y: nodeCenter.y };
          break;
      }
      
      // If multiple connections but no spacing, duplicate the center point
      for (let i = 0; i < connections.length; i++) {
        points.push({ ...point, cableId: connections[i].cable.id });
      }
      
      return points;
    }
    
    // Calculate the total space needed for all connections
    const totalWidth = spacing * (connections.length - 1);
    
    // Start position (centered on the edge)
    const startOffset = -totalWidth / 2;
    
    // Generate evenly spaced points
    for (let i = 0; i < connections.length; i++) {
      const offset = startOffset + (i * spacing);
      let point;
      
      switch (edge) {
        case 'top':
          point = { 
            x: nodeCenter.x + offset, 
            y: node.y,
            cableId: connections[i].cable.id
          };
          break;
        case 'right':
          point = { 
            x: node.x + node.width, 
            y: nodeCenter.y + offset,
            cableId: connections[i].cable.id
          };
          break;
        case 'bottom':
          point = { 
            x: nodeCenter.x + offset, 
            y: node.y + node.height,
            cableId: connections[i].cable.id
          };
          break;
        case 'left':
          point = { 
            x: node.x, 
            y: nodeCenter.y + offset,
            cableId: connections[i].cable.id
          };
          break;
      }
      
      points.push(point);
    }
    
    return points;
  };

  // Calculate connection points for channel connections
  const calculateChannelConnectionPoints = (channel, connections, zoom) => {
    if (connections.length === 0) return [];
    
    // Calculate spacing perpendicular to the channel
    const channelSpacing = 2 + (zoom.k * 5);
    
    const points = [];
    
    // Determine offsets (alternating above/below)
    for (let i = 0; i < connections.length; i++) {
      let offset;
      
      // For even number of connections, distribute evenly
      if (connections.length % 2 === 0) {
        offset = (i % 2 === 0) ? 
          -channelSpacing * (Math.floor(i / 2) + 0.5) : 
          channelSpacing * (Math.floor(i / 2) + 0.5);
      } else {
        // For odd number of connections, put one in the middle
        if (i === 0) {
          offset = 0;
        } else {
          offset = (i % 2 === 1) ? 
            -channelSpacing * Math.ceil(i / 2) : 
            channelSpacing * Math.ceil(i / 2);
        }
      }
      
      // Channel position depends on orientation
      let point;
      if (channel.orientation === 'horizontal') {
        point = { 
          x: 0, // Will be set later when calculating actual path
          y: channel.y + offset,
          offset,
          cableId: connections[i].cable.id
        };
      } else {
        point = {
          x: channel.x + offset,
          y: 0, // Will be set later when calculating actual path
          offset,
          cableId: connections[i].cable.id
        };
      }
      
      points.push(point);
    }
    
    return points;
  };

  // Generate an orthogonal path between two points with proper routing
  const generateOrthogonalPath = (
    sourcePoint, targetPoint, sourceInfo, targetInfo, 
    sourceNode, targetNode, pathConfig, zoom
  ) => {
    const path = [];
    
    // Add the source point
    path.push(sourcePoint);
    
    // Minimum perpendicular extension from an edge
    const minExtension = Math.max(1, zoom.k * 2);
    
    // Extract edge information
    const sourceEdge = sourceInfo.edge;
    const targetEdge = targetInfo.edge;
    
    // Handle direct connections (horizontal or vertical)
    if ((sourceEdge === 'right' && targetEdge === 'left') || 
        (sourceEdge === 'left' && targetEdge === 'right')) {
      // Direct horizontal connection
      // Add perpendicular extension from source
      path.push({ 
        x: sourcePoint.x + (sourceEdge === 'right' ? minExtension : -minExtension), 
        y: sourcePoint.y 
      });
      
      // Add perpendicular extension to target
      path.push({ 
        x: targetPoint.x + (targetEdge === 'right' ? minExtension : -minExtension), 
        y: targetPoint.y 
      });
    } 
    else if ((sourceEdge === 'top' && targetEdge === 'bottom') || 
            (sourceEdge === 'bottom' && targetEdge === 'top')) {
      // Direct vertical connection
      // Add perpendicular extension from source
      path.push({ 
        x: sourcePoint.x, 
        y: sourcePoint.y + (sourceEdge === 'bottom' ? minExtension : -minExtension) 
      });
      
      // Add perpendicular extension to target
      path.push({ 
        x: targetPoint.x, 
        y: targetPoint.y + (targetEdge === 'bottom' ? minExtension : -minExtension) 
      });
    } 
    else {
      // Indirect connection requiring turns
      // First, add extension from source edge
      let firstPoint;
      switch (sourceEdge) {
        case 'top':
          firstPoint = { x: sourcePoint.x, y: sourcePoint.y - minExtension };
          break;
        case 'right':
          firstPoint = { x: sourcePoint.x + minExtension, y: sourcePoint.y };
          break;
        case 'bottom':
          firstPoint = { x: sourcePoint.x, y: sourcePoint.y + minExtension };
          break;
        case 'left':
          firstPoint = { x: sourcePoint.x - minExtension, y: sourcePoint.y };
          break;
      }
      path.push(firstPoint);
      
      // Calculate intermediate points for zigzag routing
      // Determine midpoint for horizontal/vertical segments
      const sourceCenterX = sourceNode.x + sourceNode.width / 2;
      const sourceCenterY = sourceNode.y + sourceNode.height / 2;
      const targetCenterX = targetNode.x + targetNode.width / 2;
      const targetCenterY = targetNode.y + targetNode.height / 2;
      
      // Calculate midpoint y-value (for horizontal segments)
      const midY = (sourceCenterY + targetCenterY) / 2;
      
      // Add vertical segment to midpoint Y
      path.push({ x: firstPoint.x, y: midY });
      
      // Add horizontal segment to align with target X
      path.push({ x: targetPoint.x, y: midY });
      
      // Add extension to target
      let lastPoint;
      switch (targetEdge) {
        case 'top':
          lastPoint = { x: targetPoint.x, y: targetPoint.y - minExtension };
          break;
        case 'right':
          lastPoint = { x: targetPoint.x + minExtension, y: targetPoint.y };
          break;
        case 'bottom':
          lastPoint = { x: targetPoint.x, y: targetPoint.y + minExtension };
          break;
        case 'left':
          lastPoint = { x: targetPoint.x - minExtension, y: targetPoint.y };
          break;
      }
      path.push(lastPoint);
    }
    
    // Add the target point
    path.push(targetPoint);
    
    return path;
  };

  // Generate channel path between source, channel and target
  const generateChannelPath = (
    sourcePoint, channelPoint, targetPoint,
    sourceNode, targetNode, channel, zoom
  ) => {
    const path = [];
    
    // Start at source
    path.push(sourcePoint);
    
    // Connect to channel with offset
    path.push({ 
      x: sourcePoint.x, 
      y: channelPoint.y 
    });
    
    // Horizontal segment along channel
    path.push({ 
      x: targetPoint.x, 
      y: channelPoint.y 
    });
    
    // Connect to target
    path.push(targetPoint);
    
    return path;
  };

  // Calculate cable routes based on current zoom level
  const calculateCableRoutes = (zoom) => {
    // Analyze and register all cable connections
    const edgeRegistry = analyzeCableConnections();
    
    // Calculate connection points for all node edges
    const nodeConnectionPoints = {};
    nodes.forEach(node => {
      nodeConnectionPoints[node.id] = {
        top: [], right: [], bottom: [], left: []
      };
      
      // Process each edge
      ['top', 'right', 'bottom', 'left'].forEach(edge => {
        if (edgeRegistry[node.id] && edgeRegistry[node.id][edge]) {
          const connections = edgeRegistry[node.id][edge].connections;
          
          // Calculate connection points for this edge
          const points = calculateEdgeConnectionPoints(node, edge, connections, zoom);
          
          // Store points with cable IDs for lookup
          nodeConnectionPoints[node.id][edge] = points;
        }
      });
    });
    
    // Calculate channel connection points
    const channelConnectionPoints = {};
    channels.forEach(channel => {
      // Group cables by this channel
      const channelCables = cables.filter(cable => 
        cable.path.length === 3 && cable.path[1] === channel.id
      );
      
      // Create mock connections array for consistent API
      const connections = channelCables.map(cable => ({ cable }));
      
      // Calculate channel points
      channelConnectionPoints[channel.id] = 
        calculateChannelConnectionPoints(channel, connections, zoom);
    });
    
    // Generate final cable routes
    const cableRoutes = {};
    
    // Process direct node-to-node cables
    cables.forEach(cable => {
      if (cable.path.length === 2) {
        // Direct node-to-node cable
        const sourceId = cable.path[0];
        const targetId = cable.path[1];
        
        const sourceNode = getElementById(sourceId);
        const targetNode = getElementById(targetId);
        
        if (!sourceNode || !targetNode) return;
        
        // Find optimal edges based on relative positions
        const { source: sourceEdge, target: targetEdge } = 
          determineOptimalEdges(sourceNode, targetNode);
        
        // Find connection points for this cable
        const sourcePoint = getPointForCable(nodeConnectionPoints[sourceId][sourceEdge], cable.id);
        const targetPoint = getPointForCable(nodeConnectionPoints[targetId][targetEdge], cable.id);
        
        if (!sourcePoint || !targetPoint) return;
        
        // Generate path
        const path = generateOrthogonalPath(
          sourcePoint, targetPoint,
          { edge: sourceEdge }, { edge: targetEdge },
          sourceNode, targetNode,
          null, zoom
        );
        
        // Store path
        cableRoutes[cable.id] = path;
      }
      else if (cable.path.length === 3 && cable.path[1].includes('channel')) {
        // Node -> Channel -> Node path
        const sourceId = cable.path[0];
        const channelId = cable.path[1];
        const targetId = cable.path[2];
        
        const sourceNode = getElementById(sourceId);
        const channel = getElementById(channelId);
        const targetNode = getElementById(targetId);
        
        if (!sourceNode || !channel || !targetNode) return;
        
        // Determine edges based on channel position
        const sourceEdge = channel.y < sourceNode.y ? 'top' : 'bottom';
        const targetEdge = channel.y < targetNode.y ? 'top' : 'bottom';
        
        // Find connection points
        const sourcePoint = getPointForCable(nodeConnectionPoints[sourceId][sourceEdge], cable.id);
        const channelPoint = getPointForCable(channelConnectionPoints[channelId], cable.id);
        const targetPoint = getPointForCable(nodeConnectionPoints[targetId][targetEdge], cable.id);
        
        if (!sourcePoint || !channelPoint || !targetPoint) return;
        
        // Generate path through channel
        const path = generateChannelPath(
          sourcePoint, channelPoint, targetPoint,
          sourceNode, targetNode, channel, zoom
        );
        
        // Store path
        cableRoutes[cable.id] = path;
      }
    });
    
    return cableRoutes;
  };

  // Helper to find connection point for a specific cable
  const getPointForCable = (points, cableId) => {
    return points.find(p => p.cableId === cableId);
  };

  // Draw the visualization with D3.js
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Create main group for zoom/pan
    const g = svg.append("g")
      .attr("transform", transform);
    
    // Calculate cable routes based on current zoom level
    const cableRoutes = calculateCableRoutes(transform);
    
    // Create a line generator for the paths
    const lineGenerator = d3.line()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveLinear);
    
    // Draw all channels
    channels.forEach(channel => {
      if (channel.orientation === 'horizontal') {
        // Draw the horizontal channel line
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
        // Vertical channel
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
      
      // Add channel label
      g.append("text")
        .attr("x", channel.labelX)
        .attr("y", channel.y - 10)
        .attr("text-anchor", "start")
        .attr("font-size", "16px")
        .text(channel.label);
    });
    
    // Draw nodes
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
    
    // Draw cables
    Object.entries(cableRoutes).forEach(([cableId, path]) => {
      const cable = cables.find(c => c.id === cableId);
      
      if (!cable || !path) return;
      
      g.append("path")
        .attr("d", lineGenerator(path))
        .attr("stroke", cable.color || "#999")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("class", `cable cable-${cableId}`)
        .attr("id", `cable-${cableId}`);
    });
    
    // Add labels to nodes
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
    
    // Setup zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3.0]) // Limit zoom from 0.5x to 3x
      .on("zoom", (event) => {
        setTransform(event.transform);
      });
    
    svg.call(zoom);
    
  }, [transform, dimensions]);

  return (
    <div className="cable-visualization" style={{ width: '100%', height: '100vh' }}>
      <svg ref={svgRef} width="100%" height="100%">
        {/* SVG content will be rendered by D3 */}
      </svg>
      <div className="info" style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.7)', padding: '5px' }}>
        Zoom: {transform.k.toFixed(2)}x | Pan: ({transform.x.toFixed(0)}, {transform.y.toFixed(0)})
      </div>
    </div>
  );
};

export default CableVisualization;