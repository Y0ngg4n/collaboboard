import dynamic from "next/dynamic";

// Core Excalidraw components
export const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  { ssr: false },
);

export const WelcomeScreen = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.WelcomeScreen),
  { ssr: false },
);

// WelcomeScreen sub-components
export const WelcomeScreenComponentCenter = dynamic(
  () =>
    import("@excalidraw/excalidraw").then((mod) => mod.WelcomeScreen.Center),
  { ssr: false },
);
export const WelcomeScreenCenterLogo = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Center.Logo,
    ),
  { ssr: false },
);
export const WelcomeScreenCenterHeading = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Center.Heading,
    ),
  { ssr: false },
);
export const WelcomeScreenCenterMenu = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Center.Menu,
    ),
  { ssr: false },
);
export const WelcomeScreenCenterMenuItemLoadScene = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Center.MenuItemLoadScene,
    ),
  { ssr: false },
);
export const WelcomeScreenCenterMenuItemHelp = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Center.MenuItemHelp,
    ),
  { ssr: false },
);

// WelcomeScreen.Hints sub-components
export const WelcomeScreenHints = dynamic(
  import("@excalidraw/excalidraw").then(
    (mod) => mod.WelcomeScreen.Hints.MenuHint,
  ),
  { ssr: false },
);
// WelcomeScreen.Hints sub-components
export const WelcomeScreenHintsMenuHint = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Hints.MenuHint,
    ),
  { ssr: false },
);
export const WelcomeScreenHintsToolbarHint = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Hints.ToolbarHint,
    ),
  { ssr: false },
);
export const WelcomeScreenHintsHelpHint = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.WelcomeScreen.Hints.HelpHint,
    ),
  { ssr: false },
);

export const LiveCollaborationTrigger = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (mod) => mod.LiveCollaborationTrigger,
    ),
  { ssr: false },
);

// MainMenu with Group as a property
const MainMenuComponent: any = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.MainMenu),
  { ssr: false },
);

// Export MainMenu with Group attached
export const MainMenu = Object.assign(MainMenuComponent, {
  Group: dynamic(
    () => import("@excalidraw/excalidraw").then((mod) => mod.MainMenu.Group),
    { ssr: false },
  ),
});

// Default menu items grouped together
export const MainMenuItems = {
  Open: dynamic(
    () =>
      import("@excalidraw/excalidraw").then(
        (mod) => mod.MainMenu.DefaultItems.LoadScene,
      ),
    { ssr: false },
  ),
  SaveTo: dynamic(
    () =>
      import("@excalidraw/excalidraw").then(
        (mod) => mod.MainMenu.DefaultItems.SaveToActiveFile,
      ),
    { ssr: false },
  ),
  ExportImage: dynamic(
    () =>
      import("@excalidraw/excalidraw").then(
        (mod) => mod.MainMenu.DefaultItems.SaveAsImage,
      ),
    { ssr: false },
  ),
  FindOnCanvas: dynamic(
    () =>
      import("@excalidraw/excalidraw").then(
        (mod) => mod.MainMenu.DefaultItems.SearchMenu,
      ),
    { ssr: false },
  ),
  ResetCanvas: dynamic(
    () =>
      import("@excalidraw/excalidraw").then(
        (mod) => mod.MainMenu.DefaultItems.ClearCanvas,
      ),
    { ssr: false },
  ),
  DarkMode: dynamic(
    () =>
      import("@excalidraw/excalidraw").then(
        (mod) => mod.MainMenu.DefaultItems.ToggleTheme,
      ),
    { ssr: false },
  ),
  CanvasBackground: dynamic(
    () =>
      import("@excalidraw/excalidraw").then(
        (mod) => mod.MainMenu.DefaultItems.ChangeCanvasBackground,
      ),
    { ssr: false },
  ),
};
