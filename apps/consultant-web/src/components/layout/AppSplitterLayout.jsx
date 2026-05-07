import { useEffect, useMemo, useState } from "react";
import { Splitter, SplitterPanel } from "primereact/splitter";

const readStoredSizes = (key, expectedLength) => {
  if (!key || typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === expectedLength) {
      return parsed;
    }
  } catch (error) {
    console.warn("Unable to read splitter sizes from storage:", error);
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

  const normalizedInitialSizes = useMemo(() => {
    if (Array.isArray(initialSizes) && initialSizes.length >= panelCount) {
      return initialSizes.slice(0, panelCount);
    }

    return hasSecondary ? [22, 18, 60] : [22, 78];
  }, [initialSizes, panelCount, hasSecondary]);

  const normalizedMinSizes = useMemo(() => {
    if (Array.isArray(minSizes) && minSizes.length >= panelCount) {
      return minSizes.slice(0, panelCount);
    }

    return hasSecondary ? [12, 12, 30] : [12, 30];
  }, [minSizes, panelCount, hasSecondary]);

  const panelMinWidths = useMemo(() => {
    return hasSecondary ? [200, 180, 320] : [200, 320];
  }, [hasSecondary]);

  const [sizes, setSizes] = useState(() => {
    const stored = readStoredSizes(storageKey, panelCount);
    if (stored) {
      return stored;
    }
    return normalizedInitialSizes;
  });

  useEffect(() => {
    if (!storageKey) {
      setSizes(normalizedInitialSizes);
    }
  }, [normalizedInitialSizes, storageKey]);

  useEffect(() => {
    setSizes((prev) => {
      if (prev.length === panelCount) {
        return prev;
      }

      const stored = readStoredSizes(storageKey, panelCount);
      if (stored) {
        return stored;
      }
      return normalizedInitialSizes;
    });
  }, [panelCount, storageKey, normalizedInitialSizes]);

  const effectiveSizes = useMemo(() => {
    if (sizes.length === panelCount) {
      return sizes;
    }
    return normalizedInitialSizes;
  }, [sizes, panelCount, normalizedInitialSizes]);

  const persistSizes = (nextSizes) => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextSizes));
    } catch (error) {
      console.warn("Unable to persist splitter sizes:", error);
    }
  };

  const handleResizeEnd = (event) => {
    if (!event?.sizes) {
      return;
    }
    setSizes(event.sizes);
    persistSizes(event.sizes);
  };

  const panels = [
    {
      content: left,
      index: 0,
    },
  ];

  if (hasSecondary) {
    panels.push({
      content: secondary,
      index: 1,
    });
  }

  panels.push({
    content: children,
    index: hasSecondary ? 2 : 1,
  });

  return (
    <div className={`flex h-full w-full ${className}`}>
      <Splitter
        layout="horizontal"
        className="flex-1"
        onResizeEnd={handleResizeEnd}
      >
        {panels.map(({ content, index }, arrayIndex) => (
          <SplitterPanel
            key={arrayIndex}
            size={effectiveSizes[index] ?? normalizedInitialSizes[index]}
            minSize={normalizedMinSizes[index]}
            style={{ minWidth: panelMinWidths[index] }}
            className="overflow-hidden"
          >
            <div className="flex h-full flex-col overflow-hidden">
              <div className="flex-1 overflow-auto">{content}</div>
            </div>
          </SplitterPanel>
        ))}
      </Splitter>
    </div>
  );
};

export default AppSplitterLayout;
