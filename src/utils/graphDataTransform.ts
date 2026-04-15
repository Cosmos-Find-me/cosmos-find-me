import { UserCMF, Company, GraphData } from '../types';

// Cytoscape style sheet entry — mirrors cytoscape.StylesheetStyle
interface CytoscapeStylesheet {
  selector: string;
  style: Record<string, string | number | ((ele: { data: (key: string) => unknown }) => string)>;
}

/**
 * Graph Data Transformation Utilities
 * 
 * Core logic for converting company data into visual graph representation.
 * Handles mathematical positioning, color coding, and Cytoscape styling.
 * 
 * @tested 19 comprehensive tests covering:
 * ✅ Position calculations (angles, distances, zoom factors)
 * ✅ Graph data transformations (nodes, edges, labels)
 * ✅ Match score color coding (90%+=green, 80-89%=yellow, <80%=gray)
 * ✅ Cytoscape style generation and configurations
 * ✅ Edge cases (missing data, invalid inputs, default values)
 * 
 * @testFile src/utils/__tests__/graphDataTransform.test.ts
 * @coverage 100% of mathematical calculations and data transformations
 * @regressionProtection Prevents broken graph positioning, styling, and visual layout
 */

// EXACT positioning algorithm from wireframe - DO NOT modify
export const calculatePosition = (company: Company, centerX: number, centerY: number, zoom: number = 1, viewMode?: 'explore' | 'watchlist') => {
  // Use view-specific position if available, fallback to global position
  let angle: number;
  let distance: number;

  if (viewMode === 'explore' && company.explorePosition) {
    angle = company.explorePosition.angle;
    distance = company.explorePosition.distance;
  } else if (viewMode === 'watchlist' && company.watchlistPosition) {
    angle = company.watchlistPosition.angle;
    distance = company.watchlistPosition.distance;
  } else {
    // Fallback to global position (backward compatibility)
    angle = company.angle || 0;
    distance = company.distance || 100;
  }

  // Convert angle to radians
  const angleRad = (angle * Math.PI) / 180;

  // Use the exact distance from our data (NOT calculated from match score)
  const scaledDistance = distance * zoom;

  return {
    x: centerX + Math.cos(angleRad) * scaledDistance,
    y: centerY + Math.sin(angleRad) * scaledDistance
  };
};

export const transformToGraphData = (cmf: UserCMF, companies: Company[], _watchlistCompanyIds?: Set<number>, viewMode?: 'explore' | 'watchlist'): GraphData => {
  const centerX = 400;
  const centerY = 300;
  
  const nodes = [
    // Background match score zone circles
    {
      data: {
        id: 'zone-excellent',
        label: '',
        type: 'zone-excellent' as const
      },
      position: { x: centerX, y: centerY }
    },
    {
      data: {
        id: 'zone-good',
        label: '',
        type: 'zone-good' as const
      },
      position: { x: centerX, y: centerY }
    },
    {
      data: {
        id: 'zone-fair',
        label: '',
        type: 'zone-fair' as const
      },
      position: { x: centerX, y: centerY }
    },
    // CMF center node
    {
      data: {
        id: 'cmf-center',
        label: cmf.name,
        type: 'cmf' as const,
        cmf: cmf
      },
      position: { x: centerX, y: centerY }
    },
    // Company nodes with exact positions
    ...companies.map(company => ({
      data: {
        id: `company-${company.id}`,
        label: company.name,
        type: 'company' as const,
        company: company
      },
      position: calculatePosition(company, centerX, centerY, 1, viewMode)
    })),
    // Company name labels - positioned below each company
    ...companies.map(company => {
      const pos = calculatePosition(company, centerX, centerY, 1, viewMode);

      return {
        data: {
          id: `name-label-${company.id}`,
          label: company.name,
          type: 'company-name-label' as const,
          company: company
        },
        position: { x: pos.x, y: pos.y + 20 } // Below the company node
      };
    }),
    // Company percentage labels - positioned below the name labels
    ...companies.map(company => {
      const pos = calculatePosition(company, centerX, centerY, 1, viewMode);
      return {
        data: {
          id: `percent-label-${company.id}`,
          label: `${company.matchScore}%`,
          type: 'company-percent-label' as const,
          company: company
        },
        position: { x: pos.x, y: pos.y + 26 } // Below the name label
      };
    })
  ];

  // Create a Set of available company IDs for efficient lookup
  const availableCompanyIds = new Set(companies.map(c => c.id));
  
  const edges = companies.flatMap(company =>
    company.connections
      // Only create edges to companies that exist in the current dataset
      .filter(connectionId => availableCompanyIds.has(connectionId))
      .map(connectionId => ({
        data: {
          id: `edge-${company.id}-${connectionId}`,
          source: `company-${company.id}`,
          target: `company-${connectionId}`,
          relationship: company.connectionTypes[connectionId]
        }
      }))
  );

  return { nodes, edges };
};

export const getMatchScoreColor = (matchScore: number): string => {
  if (matchScore >= 90) return '#10B981'; // Green - excellent match
  if (matchScore >= 80) return '#F59E0B'; // Yellow - good match
  return '#6B7280'; // Gray - moderate match
};

export const getCytoscapeStyles = (): CytoscapeStylesheet[] => [
  // Disable the default selection overlay (the dark square) on ALL elements
  {
    selector: 'node',
    style: {
      'overlay-padding': 0,
      'overlay-color': 'transparent',
      'overlay-opacity': 0
    }
  },
  {
    selector: 'edge',
    style: {
      'overlay-padding': 0,
      'overlay-color': 'transparent',
      'overlay-opacity': 0
    }
  },
  {
    selector: ':selected',
    style: {
      'overlay-padding': 0,
      'overlay-color': 'transparent',
      'overlay-opacity': 0
    }
  },
  // Background Zone Circles - Match Quality Zones
  {
    selector: 'node[type="zone-excellent"]',
    style: {
      'width': 160, // 80px radius = 160px diameter
      'height': 160,
      'background-color': 'transparent',
      'background-opacity': 0,
      'border-width': 0.5,
      'border-color': '#10B981', // Green for excellent matches
      'border-opacity': 0.3,
      'z-index': -8,
      'events': 'no'
    }
  },
  {
    selector: 'node[type="zone-good"]',
    style: {
      'width': 220, // 110px radius = 220px diameter  
      'height': 220,
      'background-color': 'transparent',
      'background-opacity': 0,
      'border-width': 0.3,
      'border-color': '#F59E0B', // Yellow for good matches
      'border-opacity': 0.5,
      'z-index': -9,
      'events': 'no'
    }
  },
  {
    selector: 'node[type="zone-fair"]',
    style: {
      'width': 280, // 140px radius = 280px diameter
      'height': 280,
      'background-color': 'transparent',
      'background-opacity': 0,
      'border-color': '#6B7280', // Gray for fair matches
      'border-opacity': 0.3,
      'border-width': 0.3,
      'z-index': -10,
      'events': 'no'
    }
  },
  // Central CMF Node - hidden (we'll use custom HTML element instead)
  {
    selector: 'node[type="cmf"]',
    style: {
      'width': 60,
      'height': 60,
      'background-color': 'transparent',
      'background-opacity': 0,
      'border-width': 0,
      'label': '',
      'events': 'yes',
      'z-index': 10
    }
  },
  // CMF Node Hover Style - similar to company nodes
  {
    selector: 'node[type="cmf"].hovered',
    style: {
      'width': 68,
      'height': 68,
      'border-width': 2,
      'border-color': '#000000',
      'z-index': 15,
      'transition-property': 'width, height, border-color, border-width',
      'transition-duration': '0.25s',
      'transition-timing-function': 'ease-out'
    }
  },
  // Company Name Label Nodes - company names below each company
  {
    selector: 'node[type="company-name-label"]',
    style: {
      'width': 60,
      'height': 15,
      'background-color': 'white',
      'background-opacity': 0,
      'border-opacity': 0,
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 5,
      'font-weight': 'bold',
      'color': '#dbeafe', // Light blue to match onboarding text (text-blue-100)
      'text-wrap': 'wrap',
      'text-max-width': '55px',
      'z-index': 2, // Below company nodes (z-index: 5)
      'events': 'no'
    }
  },
  // Company Percentage Label Nodes - match percentages below company names
  {
    selector: 'node[type="company-percent-label"]',
    style: {
      'width': 60,
      'height': 15,
      'background-color': 'white',
      'background-opacity': 0,
      'border-opacity': 0,
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'font-size': 4.5,
      'font-weight': 'normal', // Standard weight for percentage
      'color': '#6B7280', // Lighter gray color for percentage
      'text-wrap': 'wrap',
      'text-max-width': '55px',
      'z-index': 2, // Below company nodes (z-index: 5)
      'events': 'no'
    }
  },
  // Connection Lines - hidden by default, only visible when highlighted
  {
    selector: 'edge',
    style: {
      'width': 0.3,
      'line-color': '#E5E7EB',
      'target-arrow-shape': 'none',
      'curve-style': 'straight',
      'opacity': 0, // Hidden by default
      'z-index': 1
    }
  },
  // Highlighted Connection Lines
  {
    selector: 'edge.highlighted',
    style: {
      'width': 1.5,
      'line-color': '#3B82F6',
      'opacity': 1,
      'transition-property': 'width, opacity',
      'transition-duration': '0.1s',
      'transition-timing-function': 'ease-out',
      'z-index': 4
    }
  },
  // Dimmed company nodes when hovering others
  {
    selector: 'node[type="company"].dimmed',
    style: {
      'opacity': 0.3,
      'z-index': -4
    }
  },
  // Dimmed company name label nodes
  {
    selector: 'node[type="company-name-label"].dimmed',
    style: {
      'opacity': 0.2,
      'z-index': -4
    }
  },
  // Dimmed company percentage label nodes
  {
    selector: 'node[type="company-percent-label"].dimmed',
    style: {
      'opacity': 0.2,
      'z-index': -4
    }
  },
  // Ensure zone nodes maintain their background z-index regardless of other rules
  {
    selector: 'node[type="zone-excellent"], node[type="zone-good"], node[type="zone-fair"]',
    style: {
      'z-index': -8
    }
  },
  // Base Company Nodes - company logos with fallback to colored background
  {
    selector: 'node[type="company"]',
    style: {
      'width': 25,
      'height': 25,
      'background-image': (ele: { data: (key: string) => unknown }) => {
        const company = ele.data('company') as { logo?: string } | undefined;
        return company?.logo ? `url(${company.logo})` : 'none';
      },
      'background-fit': 'contain',
      'background-repeat': 'no-repeat',
      'background-color': 'white',
      'border-width': 0.5,
      'border-color': '#E5E7EB',
      //'border-color': 'black',
      'label': '', // Remove text label since we're using logos
      'z-index': 5,
      'transition-property': 'width, height, border-color',
      'transition-duration': '0.25s',
      'transition-timing-function': 'ease-out'
    }
  },
  // Selected Node Styles - black border and larger with transition
  {
    selector: 'node[type="company"].selected',
    style: {
      'width': 30,
      'height': 30,
      'border-width': 1.5,
      // 'border-color': 'black',
      'z-index': 20,
      'transition-property': 'width, height, border-color',
      'transition-duration': '0s',
      'transition-timing-function': 'ease-out'
    }
  },
  // Hover Node Styles - black border and larger with transition
  {
    selector: 'node[type="company"].hovered',
    style: {
      'width': 30,
      'height': 30,
      'border-width': 1.5,
      // 'border-color': 'black',
      'z-index': 15,
      'transition-property': 'width, height, border-color',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-out'
    }
  },
  // Hidden company nodes for smooth view mode transitions
  {
    selector: 'node[type="company"].view-hidden',
    style: {
      'opacity': 0,
      'z-index': -4,
      'transition-property': 'opacity',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-in-out',
      'events': 'no'
    }
  },
  // Hidden company name labels for smooth view mode transitions
  {
    selector: 'node[type="company-name-label"].view-hidden',
    style: {
      'opacity': 0,
      'z-index': -4,
      'transition-property': 'opacity',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-in-out',
      'events': 'no'
    }
  },
  // Hidden company percent labels for smooth view mode transitions  
  {
    selector: 'node[type="company-percent-label"].view-hidden',
    style: {
      'opacity': 0,
      'z-index': -4,
      'transition-property': 'opacity',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-in-out',
      'events': 'no'
    }
  },
  // Hidden edges for smooth view mode transitions
  {
    selector: 'edge.view-hidden',
    style: {
      'opacity': 0,
      'z-index': -1,
      'transition-property': 'opacity',
      'transition-duration': '0.3s',
      'transition-timing-function': 'ease-in-out'
    }
  },
  // Disable transitions during view mode changes to prevent blinking
  {
    selector: 'node.no-transitions',
    style: {
      'transition-duration': '0s'
    }
  },
  {
    selector: 'edge.no-transitions', 
    style: {
      'transition-duration': '0s'
    }
  },
  // Also disable transitions on labels to prevent name flashing
  {
    selector: 'node[type="company-name-label"].no-transitions',
    style: {
      'transition-duration': '0s'
    }
  },
  {
    selector: 'node[type="company-percent-label"].no-transitions',
    style: {
      'transition-duration': '0s'
    }
  },
];