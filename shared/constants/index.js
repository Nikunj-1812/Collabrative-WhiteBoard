const TOOL_TYPES = {
  SELECT: "select",
  PEN: "pen",
  RECT: "rect",
  TEXT: "text",
  STICKY: "sticky",
  ERASER: "eraser",
  PAN: "pan",
  IMAGE: "image"
};

const STICKY_COLORS = [
  "#FEF3C7", // amber-100
  "#DBEAFE", // blue-100
  "#DCFCE7", // green-100
  "#FCE7F3", // pink-100
  "#EDE9FE"  // purple-100
];

const PRESENCE_STATUS = {
  ONLINE: "online",
  IDLE: "idle",
  OFFLINE: "offline"
};

module.exports = {
  TOOL_TYPES,
  STICKY_COLORS,
  PRESENCE_STATUS
};
