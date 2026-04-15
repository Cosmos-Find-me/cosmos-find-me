import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { CompanyGraphProps, Company } from '../types';
import { transformToGraphData, getCytoscapeStyles } from '../utils/graphDataTransform';
import { useIsMobile } from '../hooks/useIsMobile';
import UserProfileModal from './UserProfileModal';
import { ZoomControlsFAB } from './ZoomControlsFAB';

// Helper function to apply selection highlighting
const applySelectionHighlighting = (cy: cytoscape.Core, selectedCompany: Company | null, companies: Company[]) => {
  // Clear previous selections
  cy.nodes().removeClass('selected');
  cy.edges().removeClass('highlighted');

  // If no company is selected, remove dimmed from all nodes
  if (!selectedCompany) {
    cy.nodes().removeClass('dimmed');
    return;
  }

  // Get selected node
  const selectedNode = cy.getElementById(`company-${selectedCompany.id}`);
  const allCompanyNodes = cy.nodes('[type="company"]');
  const allNameLabelNodes = cy.nodes('[type="company-name-label"]');
  const allPercentLabelNodes = cy.nodes('[type="company-percent-label"]');

  // Build set of IDs that should NOT be dimmed
  const highlightedIds = new Set([selectedCompany.id, ...selectedCompany.connections]);

  // Selectively add/remove dimmed based on whether node should be highlighted
  allCompanyNodes.forEach((node: cytoscape.NodeSingular) => {
    const companyId = ((node.data('company') as { id?: number } | undefined)?.id) ?? NaN;
    const isDimmed = node.hasClass('dimmed');
    const isHidden = node.hasClass('view-hidden');
    const shouldBeDimmed = !highlightedIds.has(companyId) && !isHidden;

    if (isDimmed !== shouldBeDimmed) {
      // Only change the class if the state needs to change
      if (shouldBeDimmed) {
        node.addClass('dimmed');
      } else {
        node.removeClass('dimmed');
      }
    }
  });

  // Same pattern for name labels
  allNameLabelNodes.forEach((label: cytoscape.NodeSingular) => {
    const companyId = parseInt(label.id().replace('name-label-', ''));
    const isDimmed = label.hasClass('dimmed');
    const shouldBeDimmed = !highlightedIds.has(companyId) && !label.hasClass('view-hidden');

    if (isDimmed !== shouldBeDimmed) {
      if (shouldBeDimmed) {
        label.addClass('dimmed');
      } else {
        label.removeClass('dimmed');
      }
    }
  });

  // Same pattern for percent labels
  allPercentLabelNodes.forEach((label: cytoscape.NodeSingular) => {
    const companyId = parseInt(label.id().replace('percent-label-', ''));
    const isDimmed = label.hasClass('dimmed');
    const shouldBeDimmed = !highlightedIds.has(companyId) && !label.hasClass('view-hidden');

    if (isDimmed !== shouldBeDimmed) {
      if (shouldBeDimmed) {
        label.addClass('dimmed');
      } else {
        label.removeClass('dimmed');
      }
    }
  });

  // Mark selected node
  selectedNode.addClass('selected');
  
  // Highlight only outgoing edges from selected node to its declared connections
  selectedCompany.connections.forEach((connId: number) => {
    const edge = cy.getElementById(`edge-${selectedCompany.id}-${connId}`);
    if (edge.length > 0 && !edge.hasClass('view-hidden')) {
      edge.addClass('highlighted');
    }
  });
  
  // Optimized: highlight edges between connected companies using Set for O(1) lookup
  const directlyConnectedSet = new Set(selectedCompany.connections.map((id: number) => `company-${id}`));
  
  // Get edges more efficiently - only check edges between directly connected nodes
  selectedCompany.connections.forEach((connId: number) => {
    const connectedCompany = companies.find(c => c.id === connId);
    if (connectedCompany) {
      connectedCompany.connections.forEach((secondConnId: number) => {
        if (directlyConnectedSet.has(`company-${secondConnId}`) && connId !== secondConnId) {
          const edge = cy.getElementById(`edge-${connId}-${secondConnId}`);
          if (edge.length > 0 && !edge.hasClass('view-hidden')) {
            edge.addClass('highlighted');
          }
        }
      });
    }
  });
};

const CompanyGraph: React.FC<CompanyGraphProps> = ({
  cmf,
  companies,
  selectedCompany,
  // hoveredCompany,
  onCompanySelect,
  onCompanyHover,
  onCMFToggle,
  watchlistCompanyIds = new Set(),
  viewMode = 'explore',
  hideCenter = false,
  fadingCompanyIds = new Set()
}) => {
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);
  const onCompanySelectRef = useRef(onCompanySelect);
  const onCompanyHoverRef = useRef(onCompanyHover);
  const onCMFToggleRef = useRef(onCMFToggle);
  const selectedCompanyRef = useRef(selectedCompany);
  const viewStateRef = useRef<{zoom: number; pan: {x: number; y: number}} | null>(null);
  
  // State to track center node screen position and zoom level
  const [centerNodePosition, setCenterNodePosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // State for user profile modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const isMobile = useIsMobile();

  // Keep refs updated
  onCompanySelectRef.current = onCompanySelect;
  onCompanyHoverRef.current = onCompanyHover;
  onCMFToggleRef.current = onCMFToggle;
  selectedCompanyRef.current = selectedCompany;

  useEffect(() => {
    if (!cyRef.current) return;

    // Save current view state if graph exists
    if (cyInstance.current) {
      viewStateRef.current = {
        zoom: cyInstance.current.zoom(),
        pan: cyInstance.current.pan()
      };
      cyInstance.current.destroy();
    }

    const graphData = transformToGraphData(cmf, companies, watchlistCompanyIds, viewMode);
    
    try {
      cyInstance.current = cytoscape({
        container: cyRef.current,
        elements: [...graphData.nodes, ...graphData.edges],
      style: [
        ...getCytoscapeStyles(),
        {
          selector: 'core',
          style: {
            'background-color': '#f9fafb'
          }
        }
      ],
      layout: { 
        name: 'preset' // CRITICAL: Use preset positions from our data
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: true, // Disable dragging to maintain precise positions
      wheelSensitivity: 0.3,
      minZoom: 0.5,
      maxZoom: 5
    });

    } catch (error) {
      console.error('Error initializing Cytoscape graph:', error);
      // Create a minimal fallback instance to prevent further errors
      cyInstance.current = cytoscape({
        container: cyRef.current,
        elements: [],
        style: getCytoscapeStyles(),
      });
      return; // Skip event handlers if graph failed to initialize properly
    }


    const cy = cyInstance.current;

    // Restore previous view state if it exists, otherwise fit with padding for UI
    if (viewStateRef.current) {
      cy.zoom(viewStateRef.current.zoom);
      cy.pan(viewStateRef.current.pan);
    } else {
      // First time load - fit to show all companies if any exist, otherwise fit to zones
      const companyNodes = cy.nodes('[type="company"]');
      // Use tighter padding on mobile for better zoom
      const isMobile = window.innerWidth < 768;
      const companyPadding = isMobile ? 30 : 80;
      const zonePadding = isMobile ? 50 : 120;

      if (companyNodes.length > 0) {
        // Fit to all company nodes with padding optimized for mobile/desktop
        cy.fit(companyNodes, companyPadding);
      } else {
        // No companies - fit to background zones
        const zoneNodes = cy.nodes('[type="zone-excellent"], [type="zone-good"], [type="zone-fair"]');
        cy.fit(zoneNodes, zonePadding);
      }
    }

    // Basic initialization will be handled by separate useEffects

    // Restore selection state after graph recreation
    if (selectedCompanyRef.current) {
      // Trigger selection highlighting after a brief delay to ensure graph is ready
      setTimeout(() => {
        if (cyInstance.current && selectedCompanyRef.current) {
          applySelectionHighlighting(cyInstance.current, selectedCompanyRef.current, companies);
        }
      }, 50);
    }

    // Company hover events - with CSS transitions for smooth movement
    let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
    let currentHoveredCompany: Company | null = null;
    let currentHoveredNode: cytoscape.NodeSingular | null = null;
    
    cy.on('mouseover', 'node[type="company"]', (event) => {
      const target = event.target as cytoscape.NodeSingular;
      const company = target.data('company') as Company;

      // Clear any pending timeout
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }

      // Reset previous hovered node's class (if it's not selected)
      if (currentHoveredNode && currentHoveredNode !== target) {
        currentHoveredNode.removeClass('hovered');
      }

      // Add hovered class for CSS transition
      target.addClass('hovered');
      currentHoveredNode = target;
      
      // Only update if this is a different company
      if (currentHoveredCompany?.id !== company.id) {
        currentHoveredCompany = company;
        // Temporarily disable to test centering issue
        // onCompanyHover(company);
        
        if (!selectedCompanyRef.current) {
          // Clear any existing edge highlights and apply new ones
          cy.edges().removeClass('highlighted');

          // Highlight only outgoing edges from hovered node to its declared connections
          company.connections.forEach((connId: number) => {
            const edge = cy.getElementById(`edge-${company.id}-${connId}`);
            if (edge.length > 0 && !edge.hasClass('view-hidden')) {
              edge.addClass('highlighted');
            }
          });

          // Optimized: highlight edges between connected companies (same optimization as selection)
          const directlyConnectedSet = new Set(company.connections.map((id: number) => `company-${id}`));

          company.connections.forEach((connId: number) => {
            const connectedCompany = companies.find(c => c.id === connId);
            if (connectedCompany) {
              connectedCompany.connections.forEach((secondConnId: number) => {
                if (directlyConnectedSet.has(`company-${secondConnId}`) && connId !== secondConnId) {
                  const edge = cy.getElementById(`edge-${connId}-${secondConnId}`);
                  if (edge.length > 0 && !edge.hasClass('view-hidden')) {
                    edge.addClass('highlighted');
                  }
                }
              });
            }
          });
      }
      }
    });

    // Only clear highlights when explicitly moving away
    cy.on('mouseout', 'node[type="company"]', (event) => {
      // Don't clear immediately - wait to see if mouse enters another company node
      hoverTimeout = setTimeout(() => {
        currentHoveredCompany = null;
        currentHoveredNode = null;
        // Temporarily disable to test centering issue
        // onCompanyHover(null);

        // Remove hovered class to return to default style
        (event.target as cytoscape.NodeSingular).removeClass('hovered');

        if (!selectedCompanyRef.current) {
          cy.edges().removeClass('highlighted');
        }
        hoverTimeout = null;
      }, 100); // Longer delay to prevent rapid blinking during mouse movement
    });

    // Company click events
    cy.on('tap', 'node[type="company"]', (event) => {
      const company = (event.target as cytoscape.NodeSingular).data('company') as Company;
      onCompanySelectRef.current(company);
    });

    // Background click to deselect
    cy.on('tap', (event) => {
      if (event.target === cy) {
        onCompanySelectRef.current(null);
      }
    });

    // CMF center node hover events - visual feedback for clickability
    cy.on('mouseover', 'node[type="cmf"]', (event) => {
      (event.target as cytoscape.NodeSingular).addClass('hovered');
    });

    cy.on('mouseout', 'node[type="cmf"]', (event) => {
      (event.target as cytoscape.NodeSingular).removeClass('hovered');
    });

    // CMF center node click - toggle CMF panel
    cy.on('tap', 'node[type="cmf"]', () => {
      onCMFToggleRef.current?.();
    });

    // Function to update center node position and zoom level
    const updateCenterNodePosition = () => {
      const centerNode = cy.getElementById('cmf-center');
      if (centerNode.length > 0) {
        const renderedPosition = centerNode.renderedPosition();
        setCenterNodePosition({ x: renderedPosition.x, y: renderedPosition.y });
        setZoomLevel(cy.zoom());
      }
    };

    // Listen for viewport changes to update center node position
    cy.on('viewport', updateCenterNodePosition);
    cy.on('zoom', updateCenterNodePosition);
    cy.on('pan', updateCenterNodePosition);
    
    // Initial position update
    updateCenterNodePosition();

    return () => {
      // Clean up any pending timeouts
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      
      if (cyInstance.current) {
        cyInstance.current.destroy();
      }
    };
  }, [cmf, companies, watchlistCompanyIds, viewMode]);

  // Handle watchlist changes without recreating the graph
  useEffect(() => {
    if (!cyInstance.current) return;

    const cy = cyInstance.current;
    
    // Update watchlist indicators for all companies
    companies.forEach(company => {
      const node = cy.getElementById(`company-${company.id}`);
      if (node.length > 0) {
        if (watchlistCompanyIds.has(company.id)) {
          node.addClass('watchlisted');
        } else {
          node.removeClass('watchlisted');
        }
      }
    });
  }, [watchlistCompanyIds, companies]);

  // Handle view mode changes with smooth CSS transitions
  useEffect(() => {
    if (!cyInstance.current) return;

    const cy = cyInstance.current;
    
    // Use CSS classes for smooth opacity transitions instead of display manipulation
    companies.forEach(company => {
      const companyNode = cy.getElementById(`company-${company.id}`);
      const nameLabel = cy.getElementById(`name-label-${company.id}`);
      const percentLabel = cy.getElementById(`percent-label-${company.id}`);
      
      if (companyNode.length > 0) {
        const shouldHide = viewMode === 'watchlist' && !watchlistCompanyIds.has(company.id);
        
        if (shouldHide) {
          // Hide with smooth opacity transition
          companyNode.addClass('view-hidden');
          if (nameLabel.length > 0) nameLabel.addClass('view-hidden');
          if (percentLabel.length > 0) percentLabel.addClass('view-hidden');
        } else {
          // Show with smooth opacity transition
          companyNode.removeClass('view-hidden');
          if (nameLabel.length > 0) nameLabel.removeClass('view-hidden');
          if (percentLabel.length > 0) percentLabel.removeClass('view-hidden');
        }
      }
    });

    // Handle edges - hide edges connected to hidden nodes with smooth transitions
    try {
      const edges = cy.edges();
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        if (!edge) continue;
        
        const source = edge.source();
        const target = edge.target();
        
        // Ensure source and target exist (safety check for test environments)
        if (!source || !target || source.length === 0 || target.length === 0) continue;
        
        // Hide edge if either endpoint is hidden
        const shouldHideEdge = source.hasClass('view-hidden') || target.hasClass('view-hidden');
        
        if (shouldHideEdge) {
          edge.addClass('view-hidden');
        } else {
          edge.removeClass('view-hidden');
        }
      }
    } catch (error) {
      // Silently handle cytoscape API errors in test environments
      console.warn('View mode edge handling error:', error);
    }
    
    // Immediately reapply selection highlighting if a company is selected
    // This prevents the flash of all nodes being visible
    if (selectedCompanyRef.current) {
      // Temporarily disable transitions on labels to prevent flashing during reapplication
      cy.nodes('[type="company-name-label"]').addClass('no-transitions');
      cy.nodes('[type="company-percent-label"]').addClass('no-transitions');

      applySelectionHighlighting(cy, selectedCompanyRef.current, companies);

      // Re-enable transitions after a brief delay
      setTimeout(() => {
        if (cyInstance.current) {
          cyInstance.current.nodes('[type="company-name-label"]').removeClass('no-transitions');
          cyInstance.current.nodes('[type="company-percent-label"]').removeClass('no-transitions');
        }
      }, 50);
    }
  }, [viewMode, watchlistCompanyIds, companies]);

  // Handle selection changes from external components (excluding view mode changes)
  useEffect(() => {
    if (!cyInstance.current) return;

    const cy = cyInstance.current;
    
    if (selectedCompany) {
      applySelectionHighlighting(cy, selectedCompany, companies);
    } else {
      // Clear selections when no company is selected
      cy.nodes().removeClass('selected dimmed');
      cy.edges().removeClass('highlighted');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany]);

  // Apply fading animation to companies being added to watchlist
  useEffect(() => {
    const cy = cyInstance.current;
    if (!cy) return;

    // Get all company nodes to reset opacity for companies no longer fading
    const allCompanyNodes = cy.nodes('[type="company"]');
    const allNameLabels = cy.nodes('[type="company-name-label"]');
    const allPercentLabels = cy.nodes('[type="company-percent-label"]');

    // Reset opacity for companies that are no longer in fading set
    allCompanyNodes.forEach((node: cytoscape.NodeSingular) => {
      const companyId = (node.data('company') as { id?: number } | undefined)?.id;
      if (companyId && !fadingCompanyIds.has(companyId)) {
        // Stop any ongoing animation and reset opacity
        node.stop(true, false).style('opacity', 1);
      }
    });

    allNameLabels.forEach((label: cytoscape.NodeSingular) => {
      const companyId = parseInt(label.id().replace('name-label-', ''));
      if (companyId && !fadingCompanyIds.has(companyId)) {
        label.stop(true, false).style('opacity', 1);
      }
    });

    allPercentLabels.forEach((label: cytoscape.NodeSingular) => {
      const companyId = parseInt(label.id().replace('percent-label-', ''));
      if (companyId && !fadingCompanyIds.has(companyId)) {
        label.stop(true, false).style('opacity', 1);
      }
    });

    // Animate companies in the fading set to opacity 0
    fadingCompanyIds.forEach(companyId => {
      const node = cy.getElementById(`company-${companyId}`);
      const nameLabel = cy.getElementById(`name-label-${companyId}`);
      const percentLabel = cy.getElementById(`percent-label-${companyId}`);

      if (node.length > 0) {
        node.animate({
          style: { opacity: 0 },
          duration: 4000,
          easing: 'ease-out'
        });
      }
      if (nameLabel.length > 0) {
        nameLabel.animate({
          style: { opacity: 0 },
          duration: 4000,
          easing: 'ease-out'
        });
      }
      if (percentLabel.length > 0) {
        percentLabel.animate({
          style: { opacity: 0 },
          duration: 4000,
          easing: 'ease-out'
        });
      }
    });
  }, [fadingCompanyIds]);

  // Handle window resize and orientation changes
  useEffect(() => {
    if (!cyInstance.current) return;

    const handleResize = () => {
      const cy = cyInstance.current;
      if (!cy) return;

      // Call resize to update Cytoscape's internal dimensions
      cy.resize();

      // Use tighter padding on mobile for better zoom
      const isMobile = window.innerWidth < 768;
      const companyPadding = isMobile ? 30 : 80;
      const zonePadding = isMobile ? 50 : 120;

      // Refit the viewport to show all companies with padding
      const companyNodes = cy.nodes('[type="company"]');
      if (companyNodes.length > 0) {
        cy.fit(companyNodes, companyPadding);
      } else {
        const zoneNodes = cy.nodes('[type="zone-excellent"], [type="zone-good"], [type="zone-fair"]');
        cy.fit(zoneNodes, zonePadding);
      }
    };

    // Add listeners for both resize and orientation change
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <div className="w-full h-full relative" data-cy="cytoscape-container">
      {/* Cytoscape Graph Container */}
      <div
        ref={cyRef}
        className="w-full h-full"
        style={{ cursor: 'grab', backgroundColor: 'transparent' }}
      />
      
      {/* Custom Spark Center Node - positioned to match Cytoscape center */}
      {!hideCenter && (
        <div 
          className="absolute pointer-events-none"
          style={{ 
            left: `${centerNodePosition.x}px`, 
            top: `${centerNodePosition.y}px`, 
            transform: 'translate(-50%, -50%)',
            zIndex: 15
          }}
        >
          <div 
            className="relative bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full shadow-2xl cursor-pointer pointer-events-auto transition-all duration-300 ease-out hover:scale-110"
            style={{
              width: `${62.5 * zoomLevel}px`,
              height: `${62.5 * zoomLevel}px`
            }}
            onClick={() => {
              if (isMobile) {
                setIsProfileModalOpen(true);
              } else {
                onCMFToggle && onCMFToggle();
              }
            }}
            title={cmf.name}
          >
            <div 
              className="absolute bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-400 rounded-full"
              style={{
                top: `${3.75 * zoomLevel}px`,
                left: `${3.75 * zoomLevel}px`,
                right: `${3.75 * zoomLevel}px`,
                bottom: `${3.75 * zoomLevel}px`
              }}
            />
            <div 
              className="absolute bg-gradient-to-br from-yellow-100 via-orange-200 to-yellow-300 rounded-full"
              style={{
                top: `${7.5 * zoomLevel}px`,
                left: `${7.5 * zoomLevel}px`,
                right: `${7.5 * zoomLevel}px`,
                bottom: `${7.5 * zoomLevel}px`
              }}
            />
            
            {/* User name inside the spark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span 
                className="text-white font-bold text-center drop-shadow-lg"
                style={{
                  fontSize: `${5 * zoomLevel}px`
                }}
              >
                {cmf.name}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Graph Controls - Zoom and Fit to View */}
      <div
        className={`absolute ${isMobile ? 'bottom-safe-6 left-1/2 transform -translate-x-1/2' : 'top-4 right-4'}`}
        style={{ zIndex: 10 }}
      >
        <ZoomControlsFAB
          isMobile={isMobile}
          onZoomIn={() => {
            if (cyInstance.current) {
              // Calculate center point of zones to maintain stable zoom
              const zoneNodes = cyInstance.current.nodes('[type="zone-excellent"], [type="zone-good"], [type="zone-fair"]');
              const centerPosition = zoneNodes.boundingBox();
              const centerPoint = {
                x: centerPosition.x1 + (centerPosition.w / 2),
                y: centerPosition.y1 + (centerPosition.h / 2)
              };
              cyInstance.current.zoom({
                level: cyInstance.current.zoom() * 1.2,
                position: centerPoint
              });
            }
          }}
          onZoomOut={() => {
            if (cyInstance.current) {
              // Calculate center point of zones to maintain stable zoom
              const zoneNodes = cyInstance.current.nodes('[type="zone-excellent"], [type="zone-good"], [type="zone-fair"]');
              const centerPosition = zoneNodes.boundingBox();
              const centerPoint = {
                x: centerPosition.x1 + (centerPosition.w / 2),
                y: centerPosition.y1 + (centerPosition.h / 2)
              };
              cyInstance.current.zoom({
                level: cyInstance.current.zoom() / 1.2,
                position: centerPoint
              });
            }
          }}
          onFitToView={() => {
            if (cyInstance.current) {
              // Use tighter padding on mobile for better zoom
              const isMobile = window.innerWidth < 768;
              const companyPadding = isMobile ? 30 : 80;
              const zonePadding = isMobile ? 50 : 120;

              const companyNodes = cyInstance.current.nodes('[type="company"]');
              if (companyNodes.length > 0) {
                // Fit to all companies with padding optimized for mobile/desktop
                cyInstance.current.fit(companyNodes, companyPadding);
              } else {
                // No companies - fit to zones
                const zoneNodes = cyInstance.current.nodes('[type="zone-excellent"], [type="zone-good"], [type="zone-fair"]');
                cyInstance.current.fit(zoneNodes, zonePadding);
              }
            }
          }}
        />
      </div>

      {/* User Profile Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          userCMF={cmf}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CompanyGraph;