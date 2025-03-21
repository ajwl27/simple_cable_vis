import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const CableVisualization = () => {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState(d3.zoomIdentity);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  // Sample data
  const nodes = [
    { id: 'A', x: 400, y: 100, width: 80, height: 80 },
    { id: 'B', x: 200, y: 300, width: 80, height: 80 },
    { id: 'C', x: 600, y: 300, width: 80, height: 80 }
  ];

  const cables = [
    { id: 'c1', source: 'A', target: 'B', color: 'blue' },
    { id: 'c2', source: 'A', target: 'B', color: 'orange' },
    { id: 'c3', source: 'A', target: 'B', color: 'green' },
    { id: 'c4', source: 'B', target: 'C', color: 'red' },
    { id: 'c5', source: 'B', target: 'C', color: 'purple' },
    { id: 'c6', source: 'A', target: 'C', color: 'yellow' },
    { id: 'c7', source: 'A', target: 'C', color: 'cyan' },
    { id: 'c8', source: 'A', target: 'C', color: 'magenta' },
    { id: 'c9',  source: 'A', target: 'C', color: 'lime' },
    { id: 'c10', source: 'A', target: 'C', color: 'pink' },
    { id: 'c11', source: 'A', target: 'C', color: 'teal' },
    { id: 'c12', source: 'A', target: 'C', color: 'brown' },
    { id: 'c13', source: 'A', target: 'C', color: 'coral' },
    { id: 'c14', source: 'A', target: 'C', color: 'gold' },
    { id: 'c15', source: 'A', target: 'C', color: 'indigo' },
    { id: 'c16', source: 'A', target: 'C', color: 'maroon' },
    { id: 'c17', source: 'A', target: 'C', color: 'olive' },
    { id: 'c18', source: 'A', target: 'C', color: 'navy' },
    { id: 'c19', source: 'A', target: 'C', color: 'navy' },
    { id: 'c20', source: 'A', target: 'C', color: 'navy' },
    { id: 'c21', source: 'A', target: 'C', color: 'navy' },
    { id: 'c22', source: 'A', target: 'C', color: 'navy' }
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
    // Use at most 90% of the edge length for spreading cables
    const maxEdgeSpace = edgeLength;
    
    // Calculate maximum spacing between cables to fit within the edge
    const maxSpacing = maxEdgeSpace / (numCables + 1);
    
    // Return the smaller of zoom-based spacing or maximum edge-based spacing
    return Math.min(zoomBasedSpacing, maxSpacing);
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
    // Make this distance scale slightly with zoom for better appearance
    const minPerpendicularExtension = 1 + (zoom.k * 2);
    
    // Get cables by type
    const abCables = cables.filter(c => 
      (c.source === 'A' && c.target === 'B') || (c.source === 'B' && c.target === 'A')
    );
    
    const acCables = cables.filter(c => 
      (c.source === 'A' && c.target === 'C') || (c.source === 'C' && c.target === 'A')
    );
    
    const bcCables = cables.filter(c => 
      (c.source === 'B' && c.target === 'C') || (c.source === 'C' && c.target === 'B')
    );
    
    // Get dynamic connection points for each edge based on zoom
    const aBottomPoints = getDynamicConnectionPoints(nodeA, 'bottom', abCables.length + acCables.length, zoom);
    const bTopPoints = getDynamicConnectionPoints(nodeB, 'top', abCables.length, zoom);
    const cTopPoints = getDynamicConnectionPoints(nodeC, 'top', acCables.length, zoom);
    
    // Special handling for B-C connections to ensure they remain truly horizontal
    // When we generate connection points for B-C, we need to ensure they have matching y-coordinates
    const bcCableCount = bcCables.length;
    const bRightPoints = [];
    const cLeftPoints = [];
    
    if (bcCableCount > 0) {
      // Calculate the midpoint y-coordinate between B and C for horizontal cables
      const nodeB_centerY = nodeB.y + nodeB.height / 2;
      const nodeC_centerY = nodeC.y + nodeC.height / 2;
      
      // Get edge lengths for maximum spacing calculation
      const bRightEdgeLength = nodeB.height;
      const cLeftEdgeLength = nodeC.height;
      
      // Use the smaller of the two edges to ensure cables stay within bounds on both sides
      const minEdgeLength = Math.min(bRightEdgeLength, cLeftEdgeLength);
      
      // Only apply spacing if needed based on zoom level and edge length
      const bcSpacing = calculateDynamicSpacing(zoom, bcCableCount, minEdgeLength);
      
      for (let i = 0; i < bcCableCount; i++) {
        // Calculate vertical offset from the center
        const offset = bcCableCount > 1 && bcSpacing > 0 
          ? ((i - (bcCableCount - 1) / 2) * bcSpacing) 
          : 0;
          
        // Calculate y-position - same for both endpoints to ensure straight horizontal line
        const yPos = nodeB_centerY + offset;
        
        // Add points at the same y-coordinate on both nodes
        bRightPoints.push({ x: nodeB.x + nodeB.width, y: yPos });
        cLeftPoints.push({ x: nodeC.x, y: yPos });
      }
    }
    
    // Calculate dynamic spacing for the main horizontal and vertical paths
    // Get the height of A's bottom edge for maximum spacing calculation
    const aBottomEdgeLength = nodeA.width;
    const verticalSpacing = calculateDynamicSpacing(zoom, abCables.length + acCables.length, aBottomEdgeLength);
    
    // Process A-B connections
    abCables.forEach((cable, idx) => {
      // Determine source and target points
      const aPoint = aBottomPoints[idx];
      const bPoint = bTopPoints[idx];
      
      // Create a clean orthogonal path
      const path = [];
      
      if (cable.source === 'A' && cable.target === 'B') {
        // A to B
        path.push(aPoint);
        
        // Always add an initial perpendicular segment from the edge
        path.push({ x: aPoint.x, y: aPoint.y + minPerpendicularExtension });
        
        // Calculate vertical offset based on position in the row of cables
        const verticalOffset = verticalSpacing > 0 ? ((idx - (abCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // Continue vertical segment down from A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward B
        path.push({ x: bPoint.x, y: midpointY + verticalOffset });
        
        // Vertical segment to approach B
        path.push({ x: bPoint.x, y: bPoint.y - minPerpendicularExtension });
        
        // Final perpendicular segment to B
        path.push(bPoint);
      } else {
        // B to A
        path.push(bPoint);
        
        // Always add an initial perpendicular segment from the edge
        path.push({ x: bPoint.x, y: bPoint.y - minPerpendicularExtension });
        
        // Calculate vertical offset
        const verticalOffset = verticalSpacing > 0 ? ((idx - (abCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // Continue vertical segment up from B
        path.push({ x: bPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Vertical segment to approach A
        path.push({ x: aPoint.x, y: aPoint.y + minPerpendicularExtension });
        
        // Final perpendicular segment to A
        path.push(aPoint);
      }
      
      cableRoutes[cable.id] = path;
    });
    
    // Process A-C connections
    acCables.forEach((cable, idx) => {
      // Determine source and target points - offset by the number of A-B cables
      const aPoint = aBottomPoints[idx + abCables.length];
      const cPoint = cTopPoints[idx];
      
      // Create a clean orthogonal path
      const path = [];
      
      if (cable.source === 'A' && cable.target === 'C') {
        // A to C
        path.push(aPoint);
        
        // Always add an initial perpendicular segment from the edge
        path.push({ x: aPoint.x, y: aPoint.y + minPerpendicularExtension });
        
        // Calculate vertical offset based on position in the row of cables
        const verticalOffset = verticalSpacing > 0 ? (((idx + abCables.length) - (abCables.length + acCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // Continue vertical segment down from A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward C
        path.push({ x: cPoint.x, y: midpointY + verticalOffset });
        
        // Vertical segment to approach C
        path.push({ x: cPoint.x, y: cPoint.y - minPerpendicularExtension });
        
        // Final perpendicular segment to C
        path.push(cPoint);
      } else {
        // C to A
        path.push(cPoint);
        
        // Always add an initial perpendicular segment from the edge
        path.push({ x: cPoint.x, y: cPoint.y - minPerpendicularExtension });
        
        // Calculate vertical offset
        const verticalOffset = verticalSpacing > 0 ? (((idx + abCables.length) - (abCables.length + acCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // Continue vertical segment up from C
        path.push({ x: cPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Vertical segment to approach A
        path.push({ x: aPoint.x, y: aPoint.y + minPerpendicularExtension });
        
        // Final perpendicular segment to A
        path.push(aPoint);
      }
      
      cableRoutes[cable.id] = path;
    });
    
    // Process B-C connections - horizontal routes with proper perpendicular extensions
    const bcSpacing = calculateDynamicSpacing(zoom, bcCables.length);
    
    bcCables.forEach((cable, idx) => {
      const bPoint = bRightPoints[idx];
      const cPoint = cLeftPoints[idx];
      const path = [];
      
      // For B-C connections, we still want straight horizontal lines, but with proper perpendicular segments
      // from the nodes to prevent cables from appearing to overlap with node edges
      
      if (cable.source === 'B' && cable.target === 'C') {
        // B to C
        path.push(bPoint);
        
        // Add perpendicular extension from B
        path.push({ x: bPoint.x + minPerpendicularExtension, y: bPoint.y });
        
        // Add perpendicular extension to C
        path.push({ x: cPoint.x - minPerpendicularExtension, y: cPoint.y });
        
        // Connection to C
        path.push(cPoint);
      } else {
        // C to B
        path.push(cPoint);
        
        // Add perpendicular extension from C
        path.push({ x: cPoint.x - minPerpendicularExtension, y: cPoint.y });
        
        // Add perpendicular extension to B
        path.push({ x: bPoint.x + minPerpendicularExtension, y: bPoint.y });
        
        // Connection to B
        path.push(bPoint);
      }
      
      cableRoutes[cable.id] = path;
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
    
    // Draw nodes first (so cables appear on top)
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
        .attr("class", "cable")
        .attr("id", `cable-${cableId}`);
    });
    
    // Add labels to nodes (on top of everything)
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
      .scaleExtent([0.5, 3.0]) // Limit maximum zoom to 3x
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