export const TOOL_TYPES = {
  SELECT: "select",
  PEN: "pen",
  ARROW: "arrow",
  SHAPE: "shape",
  TEXT: "text",
  STICKY: "sticky",
  IMAGE: "image",
  ERASER: "eraser",
  PAN: "pan",
  REGION_CAPTURE: "region_capture"
} as const;

export const STICKY_COLORS = [
  "#FEF3C7", // amber-100
  "#DBEAFE", // blue-100
  "#DCFCE7", // green-100
  "#FCE7F3", // pink-100
  "#EDE9FE"  // purple-100
];

export const PRESENCE_STATUS = {
  ONLINE: "online",
  IDLE: "idle",
  OFFLINE: "offline"
} as const;
