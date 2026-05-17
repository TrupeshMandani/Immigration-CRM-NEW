import { useMemo } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

const readStoredSizes = (key, expectedLength) => {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === expectedLength) return parsed;
  } catch {
    // ignore
  }
  return null;
};

const AppSplitterLayout = ({
  left,
  secondary,
  children,
  showSecondary = false,
  initialSizes,
  minSizes,
  storageKey,
  className = "",
}) => {
  const hasSecondary = Boolean(showSecondary && secondary);
  const panelCount = hasSecondary ? 3 : 2;

  const defaultSizes = useMemo(() => {
    const stored = readStoredSizes(storageKey, panelCount);
    if (stored) return stored;
    if (Array.isArray(initialSizes) && initialSizes.length >= panelCount)
      return initialSizes.slice(0, panelCount);
    return hasSecondary ? [22, 18, 60] : [22, 78];
  }, [storageKey, panelCount, initialSizes, hasSecondary]);

  const normalizedMinSizes = useMemo(() => {
    if (Array.isArray(minSizes) && minSizes.length >= panelCount)
      return minSizes.slice(0, panelCount);
    return hasSecondary ? [12, 12, 30] : [12, 30];
  }, [minSizes, panelCount, hasSecondary]);

  const onLayout = (sizes) => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sizes));
    } catch {
      // ignore
    }
  };

  const panels = [{ content: left, index: 0 }];
  if (hasSecondary) panels.push({ content: secondary, index: 1 });
  panels.push({ content: children, index: hasSecondary ? 2 : 1 });

  return (
    <div className={`flex h-full w-full ${className}`}>
      <Group direction="horizontal" onLayout={onLayout} className="flex-1">
        {panels.map(({ content, index }, arrayIndex) => (
          <>
            {arrayIndex > 0 && (
              <Separator
                key={`sep-${arrayIndex}`}
                className="w-1 cursor-col-resize bg-neutral-200 hover:bg-primary/40 transition-colors"
              />
            )}
            <Panel
              key={index}
              defaultSize={defaultSizes[index] ?? (hasSecondary ? [22, 18, 60] : [22, 78])[index]}
              minSize={normalizedMinSizes[index]}
              className="overflow-hidden"
            >
              <div className="flex h-full flex-col overflow-hidden">
                <div className="flex-1 overflow-auto">{content}</div>
              </div>
            </Panel>
          </>
        ))}
      </Group>
    </div>
  );
};

export default AppSplitterLayout;
