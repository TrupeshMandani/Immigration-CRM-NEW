import { useMemo } from "react";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

// react-resizable-panels v4 persists layouts through the `useDefaultLayout`
// hook (wired to the Group via `defaultLayout` + `onLayoutChanged`). The older
// `onLayout` / per-panel `defaultSize`-from-localStorage pattern is a no-op in
// v4 — `Group` never emitted `onLayout`, so nothing was ever saved and every
// navigation fell back to the hard-coded default. This restores real
// persistence so a resized sidebar stays where the user left it.

const noopStorage = { getItem: () => null, setItem: () => {} };

const AppSplitterLayout = ({
  left,
  secondary,
  children,
  showSecondary = false,
  initialSizes,
  minSizes,
  storageKey = "app-splitter",
  className = "",
}) => {
  const hasSecondary = Boolean(showSecondary && secondary);

  const panelIds = useMemo(
    () => (hasSecondary ? ["sidebar", "secondary", "main"] : ["sidebar", "main"]),
    [hasSecondary],
  );

  const fallbackSizes = useMemo(() => {
    const count = panelIds.length;
    if (Array.isArray(initialSizes) && initialSizes.length >= count)
      return initialSizes.slice(0, count);
    return hasSecondary ? [22, 18, 60] : [22, 78];
  }, [initialSizes, panelIds, hasSecondary]);

  const fallbackMins = useMemo(() => {
    const count = panelIds.length;
    if (Array.isArray(minSizes) && minSizes.length >= count)
      return minSizes.slice(0, count);
    return hasSecondary ? [12, 12, 30] : [12, 30];
  }, [minSizes, panelIds, hasSecondary]);

  const storage =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : noopStorage;

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: storageKey,
    panelIds,
    storage,
  });

  const renderPanel = (content, index, id) => (
    <Panel
      key={id}
      id={id}
      defaultSize={`${fallbackSizes[index]}%`}
      minSize={`${fallbackMins[index]}%`}
      className="overflow-hidden"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">{content}</div>
      </div>
    </Panel>
  );

  const separator = (key) => (
    <Separator
      key={key}
      className="w-1 cursor-col-resize bg-neutral-200 transition-colors hover:bg-primary/40"
    />
  );

  return (
    <div className={`flex h-full w-full ${className}`}>
      <Group
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="flex-1"
      >
        {renderPanel(left, 0, "sidebar")}
        {separator("sep-1")}
        {hasSecondary
          ? [renderPanel(secondary, 1, "secondary"), separator("sep-2")]
          : null}
        {renderPanel(children, hasSecondary ? 2 : 1, "main")}
      </Group>
    </div>
  );
};

export default AppSplitterLayout;
