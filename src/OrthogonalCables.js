import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const CableVisualization = () => {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [cableSpacing, setCableSpacing] = useState(5); // Initial spacing between cables
  
  // Sample data - this would be loaded from JSON in a real application
  const nodes = [
    { id: 'A', x: 400, y: 100, width: 80, height: 80 },
    { id: 'B', x: 200, y: 300, width: 80, height: 80 },
    { id: 'C', x: 600, y: 300, width: 80, height: 80 }
  ];

  const cables = [
    { id: 'c1', source: 'A', target: 'B' },
    { id: 'c2', source: 'A', target: 'B' },
    { id: 'c3', source: 'A', target: 'B' },
    { id: 'c4', source: 'B', target: 'C' },
    { id: 'c5', source: 'B', target: 'C' },
    { id: 'c6', source: 'A', target: 'C' },
    { id: 'c7', source: 'A', target: 'C' },
    { id: 'c8', source: 'A', target: 'C' }
  ];

  // Function to calculate edge connection points
  const getEdgeConnectionPoints = (node, numConnections, direction) => {
    const points = [];
    const nodeCenter = {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
    
    // Get the edge coordinates based on the direction
    let edgeStart, edgeEnd;
    
    switch (direction) {
      case 'top':
        edgeStart = { x: node.x, y: node.y };
        edgeEnd = { x: node.x + node.width, y: node.y };
        break;
      case 'right':
        edgeStart = { x: node.x + node.width, y: node.y };
        edgeEnd = { x: node.x + node.width, y: node.y + node.height };
        break;
      case 'bottom':
        edgeStart = { x: node.x, y: node.y + node.height };
        edgeEnd = { x: node.x + node.width, y: node.y + node.height };
        break;
      case 'left':
        edgeStart = { x: node.x, y: node.y };
        edgeEnd = { x: node.x, y: node.y + node.height };
        break;
      default:
        return points;
    }
    
    // Calculate the edge length
    const edgeLength = direction === 'top' || direction === 'bottom' 
      ? node.width 
      : node.height;
    
    // Calculate spacing
    const totalSpacing = edgeLength * 0.8; // Use 80% of the edge for connections
    const step = numConnections > 1 ? totalSpacing / (numConnections - 1) : 0;
    const startPos = (edgeLength - totalSpacing) / 2;
    
    // Generate evenly spaced points
    for (let i = 0; i < numConnections; i++) {
      let point;
      if (numConnections === 1) {
        // If only one connection, put it in the middle
        if (direction === 'top' || direction === 'bottom') {
          point = { x: nodeCenter.x, y: direction === 'top' ? node.y : node.y + node.height };
        } else {
          point = { x: direction === 'left' ? node.x : node.x + node.width, y: nodeCenter.y };
        }
      } else {
        // Multiple connections - distribute evenly
        if (direction === 'top' || direction === 'bottom') {
          point = { 
            x: node.x + startPos + i * step, 
            y: direction === 'top' ? node.y : node.y + node.height 
          };
        } else {
          point = { 
            x: direction === 'left' ? node.x : node.x + node.width, 
            y: node.y + startPos + i * step 
          };
        }
      }
      points.push(point);
    }
    
    return points;
  };

  // Determine the best edge for a cable to connect to
  const getBestEdge = (sourceNode, targetNode, connectionIdx, totalConnections) => {
    const directions = ['top', 'right', 'bottom', 'left'];
    const sourceCenter = { 
      x: sourceNode.x + sourceNode.width / 2, 
      y: sourceNode.y + sourceNode.height / 2 
    };
    const targetCenter = { 
      x: targetNode.x + targetNode.width / 2, 
      y: targetNode.y + targetNode.height / 2 
    };
    
    // Calculate the direction from source to target
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    
    // Determine best edges based on relative positions
    let sourceEdge, targetEdge;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal arrangement is stronger
      sourceEdge = dx > 0 ? 'right' : 'left';
      targetEdge = dx > 0 ? 'left' : 'right';
    } else {
      // Vertical arrangement is stronger
      sourceEdge = dy > 0 ? 'bottom' : 'top';
      targetEdge = dy > 0 ? 'top' : 'bottom';
    }
    
    const sourcePoint = getEdgeConnectionPoints(sourceNode, totalConnections, sourceEdge)[connectionIdx];
    const targetPoint = getEdgeConnectionPoints(targetNode, totalConnections, targetEdge)[connectionIdx];
    
    return { sourceEdge, targetEdge, sourcePoint, targetPoint };
  };

  // Generate the orthogonal path between two nodes
  const generateOrthogonalPath = (sourceNode, targetNode, cables, cableIdx) => {
    const totalCables = cables.length;
    const { sourceEdge, targetEdge, sourcePoint, targetPoint } = getBestEdge(sourceNode, targetNode, cableIdx, totalCables);
    
    // Determine meeting point for cables from lower nodes to top node (special case in requirement 8.1)
    let pathPoints = [];
    
    // Special case handling for A, B, C arrangement as specified in requirements
    if ((sourceNode.id === 'B' && targetNode.id === 'A') || (sourceNode.id === 'C' && targetNode.id === 'A')) {
      const nodeB = nodes.find(n => n.id === 'B');
      const nodeC = nodes.find(n => n.id === 'C');
      
      // Calculate the midpoint between B and C
      const midpointX = (nodeB.x + nodeB.width / 2 + nodeC.x + nodeC.width / 2) / 2;
      
      // Calculate dynamic spacing based on zoom level
      const dynamicSpacing = cableSpacing / transform.k;
      const offset = (cableIdx - (totalCables - 1) / 2) * dynamicSpacing;
      
      if (sourceNode.id === 'B' && targetNode.id === 'A') {
        pathPoints = [
          sourcePoint,
          { x: sourcePoint.x, y: sourcePoint.y + 30 }, // Move down from B
          { x: midpointX + offset, y: sourcePoint.y + 30 }, // Move to midpoint with offset
          { x: midpointX + offset, y: targetPoint.y - 30 }, // Move up towards A
          { x: targetPoint.x, y: targetPoint.y - 30 }, // Move horizontally to align with A's connection point
          targetPoint
        ];
      } else if (sourceNode.id === 'C' && targetNode.id === 'A') {
        pathPoints = [
          sourcePoint,
          { x: sourcePoint.x, y: sourcePoint.y + 30 }, // Move down from C
          { x: midpointX + offset, y: sourcePoint.y + 30 }, // Move to midpoint with offset
          { x: midpointX + offset, y: targetPoint.y - 30 }, // Move up towards A
          { x: targetPoint.x, y: targetPoint.y - 30 }, // Move horizontally to align with A's connection point
          targetPoint
        ];
      }
    } 
    // Handle B to C cables
    else if ((sourceNode.id === 'B' && targetNode.id === 'C') || (sourceNode.id === 'C' && targetNode.id === 'B')) {
      // Calculate dynamic spacing based on zoom level
      const dynamicSpacing = cableSpacing / transform.k;
      const offset = (cableIdx - (totalCables - 1) / 2) * dynamicSpacing;
      
      // Determine the vertical position for this cable
      const verticalPosition = (sourceNode.y + sourceNode.height / 2 + targetNode.y + targetNode.height / 2) / 2 + offset;
      
      pathPoints = [
        sourcePoint,
        { x: sourcePoint.x, y: verticalPosition }, // Move to vertical position with offset
        { x: targetPoint.x, y: verticalPosition }, // Move horizontally to target
        targetPoint
      ];
    }
    // Default case for any other connections
    else {
      // Calculate dynamic spacing based on zoom level
      const dynamicSpacing = cableSpacing / transform.k;
      const offset = (cableIdx - (totalCables - 1) / 2) * dynamicSpacing;
      
      // Determine if layout is more horizontal or vertical
      const isHorizontal = Math.abs(targetPoint.x - sourcePoint.x) > Math.abs(targetPoint.y - sourcePoint.y);
      
      if (isHorizontal) {
        const midX = (sourcePoint.x + targetPoint.x) / 2;
        pathPoints = [
          sourcePoint,
          { x: midX, y: sourcePoint.y },
          { x: midX, y: targetPoint.y + offset },
          targetPoint
        ];
      } else {
        const midY = (sourcePoint.y + targetPoint.y) / 2;
        pathPoints = [
          sourcePoint,
          { x: sourcePoint.x, y: midY },
          { x: targetPoint.x + offset, y: midY },
          targetPoint
        ];
      }
    }
    
    // Generate SVG path command
    return d3.line()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveLinear)(pathPoints);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear any existing content
    svg.selectAll("*").remove();

    // Create the main group that will be transformed for zooming/panning
    const g = svg.append("g");

    // Apply current transform
    g.attr("transform", transform);

    // Group cables by their source-target pairs to implement requirement 9
    const cableGroups = {};
    cables.forEach(cable => {
      const key = cable.source < cable.target 
        ? `${cable.source}-${cable.target}` 
        : `${cable.target}-${cable.source}`;
      
      if (!cableGroups[key]) {
        cableGroups[key] = [];
      }
      cableGroups[key].push(cable);
    });

    // Draw cables
    for (const [key, cablesInGroup] of Object.entries(cableGroups)) {
      const [sourceId, targetId] = key.split('-');
      const sourceNode = nodes.find(n => n.id === sourceId);
      const targetNode = nodes.find(n => n.id === targetId);
      
      if (!sourceNode || !targetNode) continue;
      
      cablesInGroup.forEach((cable, idx) => {
        const path = generateOrthogonalPath(sourceNode, targetNode, cablesInGroup, idx);
        
        g.append("path")
          .attr("d", path)
          .attr("stroke", d3.schemeCategory10[idx % 10])
          .attr("stroke-width", 2)
          .attr("fill", "none")
          .attr("id", `cable-${cable.id}`);
      });
    }

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

    // Set up zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        const newTransform = event.transform;
        setTransform(newTransform);
        
        // Adjust cable spacing based on zoom level
        setCableSpacing(20 * newTransform.k);
      });

    svg.call(zoom);

  }, [transform, cableSpacing, nodes, cables]);

  return (
    <div className="cable-visualization" style={{ width: '100%', height: '100vh' }}>
      <svg ref={svgRef} width="100%" height="100%">
        {/* SVG content will be rendered by D3 */}
      </svg>
    </div>
  );
};

export default CableVisualization;