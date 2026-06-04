export function DragHandle({ color }) {
  return (
    <span style={{ fontSize:12, color, cursor:"grab", userSelect:"none", flexShrink:0 }} title="Drag to reorder">⠿</span>
  );
}
