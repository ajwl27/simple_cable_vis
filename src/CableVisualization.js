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
    { id: 'c4', source: 'B', target: 'C', color: 'blue' },
    { id: 'c5', source: 'B', target: 'C', color: 'orange' },
    { id: 'c6', source: 'A', target: 'C', color: 'blue' },
    { id: 'c7', source: 'A', target: 'C', color: 'orange' },
    { id: 'c8', source: 'A', target: 'C', color: 'green' }
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

  // Calculate dynamic spacing based on zoom level and minimum visibility threshold
  const calculateDynamicSpacing = (zoom, numCables) => {
    // Minimum spacing when zoomed out (cables start to overlap)
    const minSpacing = 1; 
    
    // Threshold zoom level where cables should start separating
    const zoomThreshold = 0.3;
    
    // Base spacing that represents maximum separation at high zoom
    const baseSpacing = 15;
    
    // If we're below the threshold or have only 1 cable, no spacing needed
    if (zoom.k < zoomThreshold || numCables <= 1) {
      return 0;
    }
    
    // Calculate spacing that scales with zoom level, but with a minimum visibility threshold
    const dynamicSpacing = minSpacing + (baseSpacing * (zoom.k - zoomThreshold));
    
    return dynamicSpacing;
  };

  // Calculate dynamic connection points for node edges based on zoom level
  const getDynamicConnectionPoints = (node, edge, numConnections, zoom) => {
    if (numConnections <= 0) return [];
    
    // Spacing between connection points
    const spacing = calculateDynamicSpacing(zoom, numConnections);
    
    // Maximum available space on this edge
    const edgeLength = edge === 'top' || edge === 'bottom' ? node.width : node.height;
    
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
    // Calculate the total space needed
    const totalWidth = spacing * (numConnections - 1);
    
    // Ensure we don't exceed the edge length (cap at 80% of edge)
    const maxWidth = edgeLength * 0.8;
    const actualWidth = Math.min(totalWidth, maxWidth);
    
    // Start position (centered on the edge)
    const startOffset = -actualWidth / 2;
    
    // Generate evenly spaced points
    for (let i = 0; i < numConnections; i++) {
      const offset = startOffset + (i * (actualWidth / (numConnections - 1)));
      
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
    
    // Find nodes
    const nodeA = nodes.find(n => n.id === 'A');
    const nodeB = nodes.find(n => n.id === 'B');
    const nodeC = nodes.find(n => n.id === 'C');
    
    // Calculate midpoint for horizontal segment
    const midpointX = (nodeB.x + nodeB.width / 2 + nodeC.x) / 2;
    const midpointY = 250;
    
    // Get dynamic connection points for each edge based on zoom
    const aBottomPoints = getDynamicConnectionPoints(nodeA, 'bottom', abCables.length + acCables.length, zoom);
    const bTopPoints = getDynamicConnectionPoints(nodeB, 'top', abCables.length, zoom);
    const cTopPoints = getDynamicConnectionPoints(nodeC, 'top', acCables.length, zoom);
    const bRightPoints = getDynamicConnectionPoints(nodeB, 'right', bcCables.length, zoom);
    const cLeftPoints = getDynamicConnectionPoints(nodeC, 'left', bcCables.length, zoom);
    
    // Calculate dynamic spacing for the main horizontal and vertical paths
    const verticalSpacing = calculateDynamicSpacing(zoom, abCables.length + acCables.length);
    
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
        
        // Calculate vertical offset based on position in the row of cables
        const verticalOffset = verticalSpacing > 0 ? ((idx - (abCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // First vertical segment directly down from A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward B
        path.push({ x: bPoint.x, y: midpointY + verticalOffset });
        
        // Final vertical segment to B
        path.push(bPoint);
      } else {
        // B to A
        path.push(bPoint);
        
        // Calculate vertical offset
        const verticalOffset = verticalSpacing > 0 ? ((idx - (abCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // First vertical segment up from B
        path.push({ x: bPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Final vertical segment to A
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
        
        // Calculate vertical offset based on position in the row of cables
        const verticalOffset = verticalSpacing > 0 ? (((idx + abCables.length) - (abCables.length + acCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // First vertical segment directly down from A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward C
        path.push({ x: cPoint.x, y: midpointY + verticalOffset });
        
        // Final vertical segment to C
        path.push(cPoint);
      } else {
        // C to A
        path.push(cPoint);
        
        // Calculate vertical offset
        const verticalOffset = verticalSpacing > 0 ? (((idx + abCables.length) - (abCables.length + acCables.length - 1) / 2) * verticalSpacing) : 0;
        
        // First vertical segment up from C
        path.push({ x: cPoint.x, y: midpointY + verticalOffset });
        
        // Horizontal segment toward A
        path.push({ x: aPoint.x, y: midpointY + verticalOffset });
        
        // Final vertical segment to A
        path.push(aPoint);
      }
      
      cableRoutes[cable.id] = path;
    });
    
    // Process B-C connections - direct horizontal route with minimal bends
    const bcHorizontalY = 350; // Base Y position for B-C connections
    const bcSpacing = calculateDynamicSpacing(zoom, bcCables.length);
    
    bcCables.forEach((cable, idx) => {
      const bPoint = bRightPoints[idx];
      const cPoint = cLeftPoints[idx];
      
      // Calculate vertical offset for horizontal cables
      const verticalOffset = bcSpacing > 0 ? ((idx - (bcCables.length - 1) / 2) * bcSpacing) : 0;
      
      const path = [];
      
      if (cable.source === 'B' && cable.target === 'C') {
        // B to C - simplest path possible
        path.push(bPoint);
        
        if (Math.abs(verticalOffset) > 0) {
          // Only add offset segments if spacing is needed
          const offsetY = bcHorizontalY + verticalOffset;
          path.push({ x: bPoint.x + 20, y: bPoint.y }); // Short horizontal segment out from B
          path.push({ x: bPoint.x + 20, y: offsetY }); // Vertical to offset position
          path.push({ x: cPoint.x - 20, y: offsetY }); // Horizontal segment to near C
          path.push({ x: cPoint.x - 20, y: cPoint.y }); // Vertical to align with C point
        } else {
          // Direct connection with minimal bends
          path.push({ x: cPoint.x, y: bPoint.y });
        }
        
        path.push(cPoint);
      } else {
        // C to B - simplest path possible
        path.push(cPoint);
        
        if (Math.abs(verticalOffset) > 0) {
          // Only add offset segments if spacing is needed
          const offsetY = bcHorizontalY + verticalOffset;
          path.push({ x: cPoint.x - 20, y: cPoint.y }); // Short horizontal segment out from C
          path.push({ x: cPoint.x - 20, y: offsetY }); // Vertical to offset position
          path.push({ x: bPoint.x + 20, y: offsetY }); // Horizontal segment to near B
          path.push({ x: bPoint.x + 20, y: bPoint.y }); // Vertical to align with B point
        } else {
          // Direct connection with minimal bends
          path.push({ x: bPoint.x, y: cPoint.y });
        }
        
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
    
    // Setup zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
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