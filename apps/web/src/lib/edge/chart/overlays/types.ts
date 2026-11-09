// Chart Overlay Types for Risk/Reward Visualization

export interface PositionOverlay {
  id: string;
  type: 'LONG' | 'SHORT';
  // Price coordinates (in price units)
  topPrice: number; // Higher price
  bottomPrice: number; // Lower price
  // Time coordinates (UTCTimestamp)
  startTime: number;
  endTime: number;
  // Visual properties
  color: string;
  opacity: number;
  // Optional label
  label?: string;
  // Linked to trade (if auto-generated)
  tradeId?: string;
  linkedFillId?: string; // ID of the fill that triggered this overlay
}

export interface OverlayDragState {
  overlayId: string;
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  startX: number;
  startY: number;
  startTopPrice: number;
  startBottomPrice: number;
  startTime: number;
  endTime: number;
}
