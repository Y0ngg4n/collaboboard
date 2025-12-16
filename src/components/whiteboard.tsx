"use client";
"use client";

import * as React from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawBinding, yjsToExcalidraw } from "y-excalidraw";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import E2EEncryption from "@/lib/E2EEncryption";
import { WebsocketProvider } from "y-websocket";
import { formatDistanceToNow } from "date-fns";

// Dynamic imports for Excalidraw components
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false },
);
const MainMenu = dynamic(
  async () => (await import("@excalidraw/excalidraw")).MainMenu,
  { ssr: false },
);
const WelcomeScreen = dynamic(
  async () => (await import("@excalidraw/excalidraw")).WelcomeScreen,
  { ssr: false },
);
const LiveCollaborationTrigger = dynamic(
  async () => (await import("@excalidraw/excalidraw")).LiveCollaborationTrigger,
  { ssr: false },
);

interface WhiteboardProps {
  uuid: string;
}

export default function Whiteboard({ uuid }: WhiteboardProps) {
  const excalidrawRef = React.useRef<HTMLDivElement>(null);
  const apiRef = React.useRef<any>(null);
  const bindingRef = React.useRef<ExcalidrawBinding | null>(null);
  const ydocRef = React.useRef<Y.Doc | null>(null);
  const providerRef = React.useRef<WebsocketProvider | null>(null);
  const yElementsRef = React.useRef<Y.Array<Y.Map<any>> | null>(null);
  const yAssetsRef = React.useRef<Y.Map<any> | null>(null);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = React.useRef(false);

  const [isSynced, setIsSynced] = React.useState(false);
  const [isCollaborating, setIsCollaborating] = React.useState(false);
  const [peerCount, setPeerCount] = React.useState(1);
  const [shareUrl, setShareUrl] = React.useState("");
  const [ExcalidrawComponents, setExcalidrawComponents] =
    React.useState<any>(null);
  const [encryptionKey, setEncryptionKey] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<
    "saved" | "saving" | "unsaved"
  >("saved");
  const [wsStatus, setWsStatus] = React.useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  // REMOTE CURSORS STATE
  const [remoteCursors, setRemoteCursors] = React.useState<
    { clientId: number; x: number; y: number; color: string; name: string }[]
  >([]);

  const searchParams = useSearchParams();

  // Load Excalidraw components dynamically
  React.useEffect(() => {
    import("@excalidraw/excalidraw").then(setExcalidrawComponents);
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (lastSaved) setLastSaved((prev) => new Date(prev!)); // triggers re-render
    }, 30000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  // Generate or load encryption key from URL
  React.useEffect(() => {
    const urlKey = searchParams.get("key");
    if (urlKey) {
      setEncryptionKey(urlKey);
    } else {
      const newKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setEncryptionKey(newKey);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("key", newKey);
      window.history.replaceState(null, "", newUrl.toString());
    }
  }, [uuid, searchParams]);

  // Auto-update share URL whenever key changes
  React.useEffect(() => {
    setShareUrl(
      `${window.location.origin}/whiteboard/${uuid}?key=${encryptionKey}`,
    );
  }, [encryptionKey, uuid]);

  // LOCAL CURSOR + VIEWPORT TRACKING
  React.useEffect(() => {
    if (!apiRef.current || !providerRef.current) return;

    const handleViewportAndCursor = () => {
      const appState = apiRef.current.getAppState();
      const { scrollX, scrollY, zoom } = appState;

      const currentUser =
        providerRef.current!.awareness.getLocalState()?.user || {};
      providerRef.current!.awareness.setLocalStateField("user", {
        ...currentUser,
        viewport: { scrollX, scrollY, zoom },
        cursor: currentUser.cursor || null,
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!apiRef.current || !apiRef.current.canvas) return; // ✅ safe check

      const rect = apiRef.current.canvas.getBoundingClientRect();
      const x =
        (event.clientX - rect.left) / apiRef.current.viewport.zoom +
        apiRef.current.viewport.scrollX;
      const y =
        (event.clientY - rect.top) / apiRef.current.viewport.zoom +
        apiRef.current.viewport.scrollY;

      if (providerRef.current && providerRef.current.awareness) {
        const state = providerRef.current.awareness.getLocalState() || {};
        providerRef.current.awareness.setLocalStateField("user", {
          ...(state.user || {}),
          cursor: { x, y },
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    apiRef.current.appStateChangeCallback = handleViewportAndCursor;

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (apiRef.current) apiRef.current.appStateChangeCallback = undefined;
    };
  }, [apiRef.current, providerRef.current]);

  // Safe element filter
  const safeElements = (elements: any[]) =>
    Array.isArray(elements)
      ? elements.filter((el) => el && typeof el === "object" && "id" in el)
      : [];

  // Init Yjs + WebSocket
  React.useEffect(() => {
    if (ydocRef.current) return;

    const ydoc = new Y.Doc();
    const yElements = ydoc.getArray<Y.Map<any>>("elements");
    const yAssets = ydoc.getMap("assets");

    const provider = new WebsocketProvider("ws://localhost:1234", uuid, ydoc, {
      connect: true,
      resyncInterval: 5000,
    });

    // Listen to connection status
    provider.on("status", ({ status }) => {
      if (status === "connected") {
        setWsStatus("connected");
        setIsCollaborating(true);
        setIsSynced(true);
      } else {
        setWsStatus("disconnected");
        setIsCollaborating(false);
        setIsSynced(false);
      }
    });

    // Attempt reconnect on disconnect
    provider.on("connection-close", () => {
      setWsStatus("disconnected");
      const retryInterval = setInterval(() => {
        if (provider.wsconnected) {
          clearInterval(retryInterval);
        } else {
          console.warn("🔁 Retrying WebSocket connection...");
          provider.connect();
        }
      }, 5000);
    });

    // Update peer count safely
    provider.awareness.on("update", () => {
      setPeerCount(provider.awareness.getStates().size);
    });

    // --- SAFE REMOTE CURSOR TRACKING ---
    const prevCursorsRef = { current: "" }; // Using plain object since inside same effect
    const handleAwarenessUpdate = () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const cursors = states
        .filter(([clientId, state]) => clientId !== ydoc.clientID)
        .map(([clientId, state]) => ({
          clientId,
          x: state.viewport?.scrollX ?? 0,
          y: state.viewport?.scrollY ?? 0,
          name: state.user?.name ?? "Anonymous",
          color: state.user?.color ?? "#30bced",
        }));

      const hash = JSON.stringify(cursors);
      if (hash !== prevCursorsRef.current) {
        prevCursorsRef.current = hash;
        setRemoteCursors(cursors);
      }
    };

    provider.awareness.on("update", handleAwarenessUpdate);

    // Set local user info
    provider.awareness.setLocalStateField("user", {
      name: "Anonymous " + Math.floor(Math.random() * 100),
      color: "#30bced",
      colorLight: "#30bced33",
    });

    // Track changes to Yjs document
    yElements.observe(() => {
      hasChangesRef.current = true;
      setSaveStatus("unsaved");
    });

    // Save refs
    ydocRef.current = ydoc;
    providerRef.current = provider;
    yElementsRef.current = yElements;
    yAssetsRef.current = yAssets;

    return () => {
      provider.awareness.off("update", handleAwarenessUpdate);
      provider.destroy();
    };
  }, [uuid]);

  // LOAD WHITEBOARD
  React.useEffect(() => {
    if (!encryptionKey || !yElementsRef.current || !ydocRef.current) return;
    if (!isSynced) return;

    const loadWhiteboard = async () => {
      try {
        if (yElementsRef.current!.length > 0) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const response = await fetch(`/api/whiteboard/${uuid}`);
        if (response.ok) {
          const { encryptedData } = await response.json();
          const decrypted = await E2EEncryption.decrypt(
            encryptedData,
            encryptionKey,
          );
          const elements = JSON.parse(decrypted);
          const filtered = safeElements(elements);

          if (yElementsRef.current!.length === 0 && filtered.length > 0) {
            ydocRef.current!.transact(() => {
              filtered.forEach((el) => {
                if (!el || !el.id || !el.type) return;
                const map = new Y.Map();
                Object.entries(el).forEach(([k, v]) => {
                  if (v !== undefined) map.set(k, v);
                });
                yElementsRef.current!.push([map]);
              });
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load whiteboard:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadWhiteboard();
  }, [uuid, encryptionKey, isSynced]);

  // INITIALIZE EXCALIDRAW BINDING
  React.useEffect(() => {
    if (!apiRef.current || bindingRef.current) return;
    if (!ydocRef.current || !providerRef.current) return;
    if (!yElementsRef.current || !yAssetsRef.current) return;

    const binding = new ExcalidrawBinding(
      yElementsRef.current,
      yAssetsRef.current,
      apiRef.current,
      providerRef.current.awareness,
      {
        excalidrawDom: excalidrawRef.current!,
        undoManager: new Y.UndoManager(yElementsRef.current),
      },
    );
    bindingRef.current = binding;

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [
    apiRef.current,
    ydocRef.current,
    providerRef.current,
    yElementsRef.current,
    yAssetsRef.current,
  ]);

  const toast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    const toastEl = document.createElement("div");
    const bgColor =
      type === "success"
        ? "bg-success"
        : type === "error"
          ? "bg-error"
          : "bg-info";
    toastEl.className = `alert ${bgColor} text-white fixed bottom-4 right-4 w-auto shadow-lg z-50`;
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 3000);
  };

  const saveWhiteboard = async (isAutoSave = false) => {
    if (!yElementsRef.current || !encryptionKey) return;
    if (!hasChangesRef.current && isAutoSave) return;

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const elements = safeElements(yjsToExcalidraw(yElementsRef.current));
      const encrypted = await E2EEncryption.encrypt(
        JSON.stringify(elements),
        encryptionKey,
      );
      const res = await fetch(`/api/whiteboard/${uuid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData: encrypted }),
      });
      if (!res.ok) throw new Error("Failed to save");

      const now = new Date();
      setLastSaved(now);
      setSaveStatus("saved");
      hasChangesRef.current = false;

      if (!isAutoSave) toast("Whiteboard saved!", "success");
      else toast("Auto-saved", "info");
    } catch (err) {
      console.error(err);
      setSaveStatus("unsaved");
      toast("Failed to save whiteboard", "error");
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    if (isLoading) return;
    const autoSave = () => {
      if (hasChangesRef.current && !isSaving) saveWhiteboard(true);
    };
    autoSaveTimerRef.current = setInterval(autoSave, 10000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [isLoading, isSaving]);

  const handleShare = () => document.getElementById("share_modal")?.showModal();

  const formatLastSaved = () =>
    lastSaved
      ? `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
      : "";

  // FOLLOW USER HELPER
  const followUser = (clientId: number) => {
    if (!apiRef.current || !providerRef.current) return;

    const state = providerRef.current.awareness.getStates().get(clientId);
    if (!state?.user?.viewport) return;

    const { scrollX, scrollY, zoom } = state.user.viewport;

    // Scroll and zoom correctly using Excalidraw API
    apiRef.current.scrollTo({ x: scrollX, y: scrollY }, true);
    apiRef.current.zoomTo(zoom, true);
  };

  if (!ExcalidrawComponents) return <div>Loading Excalidraw...</div>;
  const Menu = ExcalidrawComponents.MainMenu;
  const Welcome = ExcalidrawComponents.WelcomeScreen;

  return (
    <>
      <div style={{ width: "100vw", height: "100vh" }} ref={excalidrawRef}>
        <Excalidraw
          isCollaborating={isCollaborating}
          excalidrawAPI={(api) => (apiRef.current = api)}
          initialData={{
            elements: safeElements(
              yjsToExcalidraw(yElementsRef.current ?? new Y.Array()),
            ),
          }}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
              saveToActiveFile: false,
            },
          }}
          renderTopRightUI={() => (
            <div className="flex flex-row items-start gap-3 mr-2">
              {/* Connection status badge */}
              <div
                className={`inline-flex items-center justify-center rounded-md px-3 h-[32px] font-semibold text-sm border ${
                  wsStatus === "connected"
                    ? "bg-green-100 text-green-700 border-green-300"
                    : wsStatus === "connecting"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : "bg-red-100 text-red-700 border-red-300"
                }`}
              >
                {wsStatus === "connecting" && (
                  <>
                    <span className="loading loading-spinner loading-xs mr-1"></span>
                    Connecting...
                  </>
                )}
                {wsStatus === "connected" && <>🟢 Connected</>}
                {wsStatus === "disconnected" && <>🔴 Disconnected</>}
              </div>

              {/* Save button + last saved timestamp (stacked vertically) */}
              <div className="flex flex-col items-center gap-1">
                {wsStatus === "connected" && (
                  <button
                    onClick={() => saveWhiteboard(false)}
                    disabled={isSaving}
                    className={`btn btn-sm rounded-md ${
                      saveStatus === "saved"
                        ? "btn-primary"
                        : saveStatus === "saving"
                          ? "btn-primary loading"
                          : "btn-warning"
                    }`}
                  >
                    {saveStatus === "saving"
                      ? "Saving..."
                      : saveStatus === "saved"
                        ? "✓ Saved"
                        : "⚠ Unsaved"}
                  </button>
                )}
                {lastSaved && (
                  <span className="text-gray-500 text-[11px]">
                    {formatLastSaved()}
                  </span>
                )}
              </div>

              {/* Collaboration avatars aligned vertically center */}
              <div className="flex items-center h-[32px]">
                <LiveCollaborationTrigger
                  isCollaborating={isCollaborating}
                  onSelect={handleShare}
                />
              </div>
            </div>
          )}
        >
          <Menu>
            <Menu.Group title="File & Canvas">
              <Menu.DefaultItems.LoadScene />
              <Menu.DefaultItems.SaveAsImage />
              <Menu.DefaultItems.SaveToActiveFile />
              <Menu.DefaultItems.Export />
              <Menu.DefaultItems.SearchMenu />
              <Menu.DefaultItems.ClearCanvas />
            </Menu.Group>
            <Menu.Group title="Appearance">
              <Menu.DefaultItems.ToggleTheme />
              <Menu.DefaultItems.ChangeCanvasBackground />
            </Menu.Group>
            <Menu.DefaultItems.Help />
          </Menu>

          {(!yElementsRef.current || yElementsRef.current.length === 0) && (
            <Welcome>
              <Welcome.Center>
                <Welcome.Center.Logo>
                  <img src="/logo.png" alt="Logo" className="max-w-xs w-full" />
                </Welcome.Center.Logo>
                <Welcome.Center.Heading>
                  Welcome to Your Whiteboard
                </Welcome.Center.Heading>
                <Welcome.Center.Menu>
                  <Welcome.Center.MenuItemLoadScene />
                  <Welcome.Center.MenuItemHelp />
                </Welcome.Center.Menu>
              </Welcome.Center>
              <Welcome.Hints.MenuHint />
              <Welcome.Hints.ToolbarHint />
              <Welcome.Hints.HelpHint />
            </Welcome>
          )}

          {/* REMOTE CURSORS */}
          {remoteCursors.map((cursor) => (
            <div
              key={cursor.clientId}
              style={{
                position: "absolute",
                left: cursor.x,
                top: cursor.y,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: cursor.color,
                  border: "2px solid white",
                }}
              ></div>
              <div
                style={{
                  fontSize: 10,
                  color: cursor.color,
                  fontWeight: "bold",
                  textAlign: "center",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                }}
              >
                {cursor.name}
              </div>
            </div>
          ))}
        </Excalidraw>
      </div>

      {/* Share Modal */}
      <dialog id="share_modal" className="modal">
        <div className="modal-box bg-base-100">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-base-content">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg mb-4 text-base-content">
            Share Whiteboard
          </h3>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text text-base-content">
                Share URL (includes encryption key):
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="input input-bordered flex-1 text-sm bg-base-200 text-base-content"
              />
              <button
                onClick={() =>
                  navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => toast("Copied!", "success"))
                }
                className="btn btn-primary"
              >
                Copy
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt text-warning">
                ⚠️ Anyone with this URL can access the whiteboard
              </span>
            </label>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  );
}
