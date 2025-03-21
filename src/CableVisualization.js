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
    { id: 'C', x: 600, y: 300, width: 80, height: 80 }
  ];
  
  const channels = [
    { id: 'channel1', y: 50, label: "Channel", labelX: 50, orientation: 'horizontal' }
  ];

  // Define cables with explicit routing paths
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
    // These two go via the channel
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

  // Helper function to find element by ID
  const getElementById = (id) => {
    const node = nodes.find(n => n.id === id);
    if (node) return { ...node, type: 'node' };
    
    const channel = channels.find(c => c.id === id);
    if (channel) return { ...channel, type: 'channel' };
    
    return null;
  };

  // Calculate dynamic spacing based on zoom level, minimum visibility threshold, and maximum edge space
  const calculateDynamicSpacing = (zoom, numCables, edgeLength) => {
    // If only one cable or no cables, no spacing needed
    if (numCables <= 1) return 0;
    
    // Minimum spacing when zoomed out (cables start to overlap)
    const minSpacing = 1; 
    
    // Threshold zoom level where cables should start separating
    const zoomThreshold = 0.5;
    
    // Maximum zoom level for fully separated cables
    const maxZoomEffect = 3.0;
    
    // If we're below the threshold, no spacing needed
    if (zoom.k < zoomThreshold) {
      return 0;
    }
    
    // Calculate normalized zoom factor (0 to 1) for more gradual transitions
    const normalizedZoom = Math.min(
      (zoom.k - zoomThreshold) / (maxZoomEffect - zoomThreshold), 
      1.0
    );
    
    // Apply easing function for smoother progression (cubic easing)
    const easedZoom = normalizedZoom * normalizedZoom * (3 - 2 * normalizedZoom);
    
    // Base spacing that represents maximum separation at full zoom
    const baseSpacing = 80;
    
    // Calculate spacing that scales with zoom level using a smoother curve
    const zoomBasedSpacing = minSpacing + (baseSpacing * easedZoom);
    
    // Calculate maximum spacing based on available edge length
    // Use the entire edge length for spreading cables
    const maxEdgeSpace = edgeLength;
    
    // Calculate maximum spacing between cables to fit within the edge
    const maxSpacing = maxEdgeSpace / (numCables + 1);
    
    // Return the smaller of zoom-based spacing or maximum edge-based spacing
    return Math.min(zoomBasedSpacing, maxSpacing);
  };

  // Get connection points for a channel
  const getChannelConnectionPoints = (channel, cableIdx, totalCables, zoom) => {
    // Calculate spacing perpendicular to the channel
    const channelSpacing = 2 + (zoom.k * 5);
    
    // Determine offset (alternating above/below)
    // For even number of cables, distribute evenly
    let offset;
    if (totalCables % 2 === 0) {
      offset = (cableIdx % 2 === 0) ? 
        -channelSpacing * (Math.floor(cableIdx / 2) + 0.5) : 
        channelSpacing * (Math.floor(cableIdx / 2) + 0.5);
    } else {
      // For odd number of cables, put one in the middle
      if (cableIdx === 0) {
        offset = 0;
      } else {
        offset = (cableIdx % 2 === 1) ? 
          -channelSpacing * Math.ceil(cableIdx / 2) : 
          channelSpacing * Math.ceil(cableIdx / 2);
      }
    }
    
    // Channel position
    return { x: 0, y: channel.y + offset, offset };
  };

  // Calculate dynamic connection points for node edges based on zoom level
  const getDynamicConnectionPoints = (node, edge, numConnections, zoom) => {
    if (numConnections <= 0) return [];
    
    // Maximum available space on this edge
    const edgeLength = edge === 'top' || edge === 'bottom' ? node.width : node.height;
    
    // Spacing between connection points - now takes into account edge length
    const spacing = calculateDynamicSpacing(zoom, numConnections, edgeLength);
    
    // Get node center
    const nodeCenter = {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
    
    // Calculate positions
    const points = [];
    
    // If no spacing needed or only one connection, position in the center of the edge
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
      }
      
      // If only one connection, return early
      if (numConnections === 1) {
        return points;
      }
      
      // If multiple connections but no spacing, duplicate the center point 
      // to create multiple connections at the same point
      while (points.length < numConnections) {
        points.push({ ...points[0] });
      }
      
      return points;
    }
    
    // With multiple connections and spacing, distribute them evenly
    // Calculate the total space needed based on the actual calculated spacing
    const totalWidth = spacing * (numConnections - 1);
    
    // Start position (centered on the edge)
    const startOffset = -totalWidth / 2;
    
    // Generate evenly spaced points
    for (let i = 0; i < numConnections; i++) {
      const offset = startOffset + (i * spacing);
      
      let point;
      switch (edge) {
        case 'top':
          point = { 
            x: nodeCenter.x + offset, 
            y: node.y 
          };
          break;
        case 'right':
          point = { 
            x: node.x + node.width, 
            y: nodeCenter.y + offset 
          };
          break;
        case 'bottom':
          point = { 
            x: nodeCenter.x + offset, 
            y: node.y + node.height 
          };
          break;
        case 'left':
          point = { 
            x: node.x, 
            y: nodeCenter.y + offset 
          };
          break;
      }
      
      points.push(point);
    }
    
    return points;
  };

  // Determine routes for all cables
  const calculateCableRoutes = (zoom) => {
    const cableRoutes = {};
    
    // Find nodes
    const nodeA = nodes.find(n => n.id === 'A');
    const nodeB = nodes.find(n => n.id === 'B');
    const nodeC = nodes.find(n => n.id === 'C');
    
    // Calculate midpoint for horizontal segment
    const midpointX = (nodeB.x + nodeB.width / 2 + nodeC.x) / 2;
    const midpointY = 250;
    
    // Minimum distance cables should extend perpendicular to an edge before changing direction
    const minPerpendicularExtension = 1 + (zoom.k * 2);
    
    // Group cables by their paths
    const directNodeToNodeCables = {};
    const channelCables = {};
    
    // Group cables by their endpoints for proper distribution
    cables.forEach(cable => {
      if (cable.path.length === 2) {
        // Direct node-to-node cable
        const sourceId = cable.path[0];
        const targetId = cable.path[1];
        const key = sourceId < targetId ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
        
        if (!directNodeToNodeCables[key]) {
          directNodeToNodeCables[key] = [];
        }
        directNodeToNodeCables[key].push(cable);
      } else if (cable.path.length === 3 && cable.path[1].startsWith('channel')) {
        // Node -> Channel -> Node path
        const channelId = cable.path[1];
        if (!channelCables[channelId]) {
          channelCables[channelId] = [];
        }
        channelCables[channelId].push(cable);
      }
    });
    
    // Process node-to-node paths
    Object.values(directNodeToNodeCables).forEach(cablesGroup => {
      if (cablesGroup.length === 0) return;
      
      // Identify the source and target nodes from the first cable
      const firstCable = cablesGroup[0];
      const sourceId = firstCable.path[0];
      const targetId = firstCable.path[1];
      
      // Get node objects
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === targetId);
      
      if (!sourceNode || !targetNode) return;
      
      // Check which type of connection this is (A-B, A-C, B-C)
      const isABConnection = (sourceId === 'A' && targetId === 'B') || (sourceId === 'B' && targetId === 'A');
      const isACConnection = (sourceId === 'A' && targetId === 'C') || (sourceId === 'C' && targetId === 'A');
      const isBCConnection = (sourceId === 'B' && targetId === 'C') || (sourceId === 'C' && targetId === 'B');
      
      // Determine connection points based on the type
      let sourcePoints = [];
      let targetPoints = [];
      
      if (isABConnection) {
        sourcePoints = getDynamicConnectionPoints(
          sourceId === 'A' ? nodeA : nodeB, 
          sourceId === 'A' ? 'bottom' : 'top', 
          cablesGroup.length, 
          zoom
        );
        
        targetPoints = getDynamicConnectionPoints(
          targetId === 'A' ? nodeA : nodeB, 
          targetId === 'A' ? 'bottom' : 'top', 
          cablesGroup.length, 
          zoom
        );
      } else if (isACConnection) {
        // For A-C connections, we need to account for existing A-B connections
        const abConnectionKey = 'A-B';
        const abConnectionCount = directNodeToNodeCables[abConnectionKey] ? directNodeToNodeCables[abConnectionKey].length : 0;
        
        if (sourceId === 'A') {
          // If source is A, we need to offset the connection points by the number of A-B connections
          const totalABottomConnections = abConnectionCount + cablesGroup.length;
          const allABottomPoints = getDynamicConnectionPoints(nodeA, 'bottom', totalABottomConnections, zoom);
          
          // Use points after the A-B connections
          sourcePoints = allABottomPoints.slice(abConnectionCount);
          
          // Get points on C normally
          targetPoints = getDynamicConnectionPoints(nodeC, 'top', cablesGroup.length, zoom);
        } else {
          // If source is C, we need to offset the target (A) connection points
          const totalABottomConnections = abConnectionCount + cablesGroup.length;
          const allABottomPoints = getDynamicConnectionPoints(nodeA, 'bottom', totalABottomConnections, zoom);
          
          // Use points after the A-B connections
          targetPoints = allABottomPoints.slice(abConnectionCount);
          
          // Get points on C normally
          sourcePoints = getDynamicConnectionPoints(nodeC, 'top', cablesGroup.length, zoom);
        }
      } else if (isBCConnection) {
        // Special case for B-C horizontal connections
        const bNode = sourceId === 'B' ? sourceNode : targetNode;
        const cNode = sourceId === 'C' ? sourceNode : targetNode;
        
        const bCenterY = bNode.y + bNode.height / 2;
        const cCenterY = cNode.y + cNode.height / 2;
        
        // Get edge lengths for maximum spacing calculation
        const bRightEdgeLength = bNode.height;
        const cLeftEdgeLength = cNode.height;
        
        // Use the smaller of the two edges to ensure cables stay within bounds on both sides
        const minEdgeLength = Math.min(bRightEdgeLength, cLeftEdgeLength);
        
        // Only apply spacing if needed based on zoom level and edge length
        const bcSpacing = calculateDynamicSpacing(zoom, cablesGroup.length, minEdgeLength);
        
        sourcePoints = [];
        targetPoints = [];
        
        for (let i = 0; i < cablesGroup.length; i++) {
          // Calculate vertical offset from the center
          const offset = cablesGroup.length > 1 && bcSpacing > 0 
            ? ((i - (cablesGroup.length - 1) / 2) * bcSpacing) 
            : 0;
            
          // Calculate y-position - same for both endpoints to ensure straight horizontal line
          const yPos = bCenterY + offset;
          
          if (sourceId === 'B') {
            sourcePoints.push({ x: bNode.x + bNode.width, y: yPos });
            targetPoints.push({ x: cNode.x, y: yPos });
          } else {
            sourcePoints.push({ x: cNode.x, y: yPos });
            targetPoints.push({ x: bNode.x + bNode.width, y: yPos });
          }
        }
      }
      
      // Process each cable in the group
      cablesGroup.forEach((cable, idx) => {
        // Get source and target points
        const sourcePoint = sourcePoints[idx];
        const targetPoint = targetPoints[idx];
        
        if (!sourcePoint || !targetPoint) return;
        
        // Create the path based on connection type
        const path = [];
        path.push(sourcePoint);
        
        if (isBCConnection) {
          // Special case for B-C horizontal routing
          // Add perpendicular extension from source
          path.push({ x: sourcePoint.x + (sourceId === 'B' ? minPerpendicularExtension : -minPerpendicularExtension), y: sourcePoint.y });
          
          // Add perpendicular extension to target
          path.push({ x: targetPoint.x + (targetId === 'B' ? minPerpendicularExtension : -minPerpendicularExtension), y: targetPoint.y });
        } else {
          // A-B or A-C routing with vertical and horizontal segments
          const isSourceA = sourceId === 'A';
          const isTargetA = targetId === 'A';
          
          // Always add an initial perpendicular segment from the edge
          path.push({ 
            x: sourcePoint.x, 
            y: sourcePoint.y + (isSourceA ? minPerpendicularExtension : -minPerpendicularExtension) 
          });
          
          // Calculate vertical offset for spacing
          const verticalOffset = calculateDynamicSpacing(zoom, cablesGroup.length, nodeA.width) > 0 
            ? ((idx - (cablesGroup.length - 1) / 2) * calculateDynamicSpacing(zoom, cablesGroup.length, nodeA.width)) 
            : 0;
          
          // Continue vertical segment
          path.push({ 
            x: sourcePoint.x, 
            y: midpointY + verticalOffset 
          });
          
          // Horizontal segment
          path.push({ 
            x: targetPoint.x, 
            y: midpointY + verticalOffset 
          });
          
          // Vertical segment to approach target
          path.push({ 
            x: targetPoint.x, 
            y: targetPoint.y + (isTargetA ? minPerpendicularExtension : -minPerpendicularExtension) 
          });
        }
        
        // Final connection point
        path.push(targetPoint);
        
        // Store the generated path
        cableRoutes[cable.id] = path;
      });
    });
    
    // Process channel-based paths
    Object.entries(channelCables).forEach(([channelId, cablesGroup]) => {
      const channel = channels.find(c => c.id === channelId);
      if (!channel || cablesGroup.length === 0) return;
      
      // Process each cable going through this channel
      cablesGroup.forEach((cable, idx) => {
        const path = [];
        
        // Get source and target IDs
        const sourceId = cable.path[0];
        const targetId = cable.path[2];
        
        // Get source and target nodes
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        
        if (!sourceNode || !targetNode) return;
        
        // Determine which edges to connect to
        const sourceEdge = channel.y < sourceNode.y ? 'top' : 'bottom';
        const targetEdge = channel.y < targetNode.y ? 'top' : 'bottom';
        
        // Get connection points on nodes
        const sourcePoints = getDynamicConnectionPoints(sourceNode, sourceEdge, cablesGroup.length, zoom);
        const targetPoints = getDynamicConnectionPoints(targetNode, targetEdge, cablesGroup.length, zoom);
        
        // Get channel connection info (with vertical offset for spacing)
        const channelInfo = getChannelConnectionPoints(channel, idx, cablesGroup.length, zoom);
        
        // Build the path
        const sourcePoint = sourcePoints[idx];
        const targetPoint = targetPoints[idx];
        
        // Start at source node
        path.push(sourcePoint);
        
        // Connect to channel with proper spacing
        path.push({ x: sourcePoint.x, y: channel.y + channelInfo.offset });
        
        // Horizontal segment along channel
        path.push({ x: targetPoint.x, y: channel.y + channelInfo.offset });
        
        // Connect to target node
        path.push(targetPoint);
        
        // Store the path
        cableRoutes[cable.id] = path;
      });
    });
    
    return cableRoutes;
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
        // Support for vertical channels (future)
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
    
    // Setup zoom behavior with limited scale
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3.0]) // Limit maximum zoom from 0.5x to 3x
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