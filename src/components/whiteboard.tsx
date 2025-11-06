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
  const providerRef = React.useRef<WebrtcProvider | null>(null);
  const yElementsRef = React.useRef<Y.Array<Y.Map<any>> | null>(null);
  const yAssetsRef = React.useRef<Y.Map<any> | null>(null);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = React.useRef(false);

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

  const searchParams = useSearchParams();

  // Load Excalidraw components dynamically
  React.useEffect(() => {
    import("@excalidraw/excalidraw").then(setExcalidrawComponents);
  }, []);

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

  // Safe element filter
  const safeElements = (elements: any[]) =>
    Array.isArray(elements)
      ? elements.filter((el) => el && typeof el === "object" && "id" in el)
      : [];

  // Init Yjs + WebRTC first
  React.useEffect(() => {
    if (ydocRef.current) return;

    const ydoc = new Y.Doc();
    const yElements = ydoc.getArray<Y.Map<any>>("elements");
    const yAssets = ydoc.getMap("assets");

    const provider = new WebrtcProvider(uuid, ydoc, {
      signaling: ["ws://127.0.0.1:4444"],
      peerOpts: {
        config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
      },
    });

    provider.on("status", ({ connected }) => setIsCollaborating(connected));
    provider.awareness.on("update", () =>
      setPeerCount(provider.awareness.getStates().size),
    );

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

    ydocRef.current = ydoc;
    providerRef.current = provider;
    yElementsRef.current = yElements;
    yAssetsRef.current = yAssets;

    return () => provider.destroy();
  }, [uuid]);

  // Load saved whiteboard from server **before binding**
  // Load saved whiteboard from server
  React.useEffect(() => {
    if (!encryptionKey || !yElementsRef.current) return;

    const loadWhiteboard = async () => {
      try {
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
          if (yElementsRef.current != null) {
            yElementsRef.current.doc?.transact(() => {
              yElementsRef.current!.delete(0, yElementsRef.current!.length);
              filtered.forEach((el) => {
                const map = new Y.Map();
                Object.entries(el).forEach(([k, v]) => map.set(k, v));
                yElementsRef.current!.push([map]);
              });
            });
          }
          // Update Excalidraw only if API exists
          if (apiRef.current && filtered.length > 0) {
            apiRef.current.updateScene({
              elements: filtered,
              commitToHistory: false,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load whiteboard:", err);
      } finally {
        // ✅ Always set loading to false
        setIsLoading(false);
      }
    };

    loadWhiteboard();
  }, [uuid, encryptionKey]);

  // Initialize ExcalidrawBinding after API is ready AND server load is done
  // Initialize ExcalidrawBinding
  React.useEffect(() => {
    if (!apiRef.current || bindingRef.current) return;
    if (!ydocRef.current || !providerRef.current) return;
    if (!yElementsRef.current || !yAssetsRef.current) return;

    try {
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
      console.log("✅ ExcalidrawBinding initialized");
    } catch (err) {
      console.error("Failed to initialize ExcalidrawBinding:", err);
    }

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
    if (!hasChangesRef.current && isAutoSave) return; // Skip if no changes

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

      if (!isAutoSave) {
        toast("Whiteboard saved!", "success");
      } else {
        toast("Auto-saved", "info");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("unsaved");
      toast("Failed to save whiteboard", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save every 10 seconds if there are changes
  React.useEffect(() => {
    if (isLoading) return;

    const autoSave = () => {
      if (hasChangesRef.current && !isSaving) {
        saveWhiteboard(true);
      }
    };

    autoSaveTimerRef.current = setInterval(autoSave, 10000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [isLoading, isSaving]);

  const handleShare = () => document.getElementById("share_modal")?.showModal();

  const formatLastSaved = () => {
    if (!lastSaved) return "";
    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!ExcalidrawComponents) return <div>Loading Excalidraw...</div>;
  const Menu = ExcalidrawComponents.MainMenu;
  const Welcome = ExcalidrawComponents.WelcomeScreen;

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <span className="loading loading-spinner loading-lg text-white"></span>
        </div>
      )}

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
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end text-xs mr-2">
                <button
                  onClick={() => saveWhiteboard(false)}
                  disabled={isSaving}
                  className={`btn btn-sm rounded-md ${
                    saveStatus === "saved"
                      ? "btn-ghost"
                      : saveStatus === "saving"
                        ? "btn-ghost loading"
                        : "btn-warning"
                  }`}
                >
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                      ? "✓ Saved"
                      : "⚠ Unsaved"}
                </button>
                {lastSaved && (
                  <span className="text-gray-500 mt-1">
                    {formatLastSaved()}
                  </span>
                )}
              </div>
              <LiveCollaborationTrigger
                isCollaborating={isCollaborating}
                onSelect={handleShare}
              />
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
        </Excalidraw>
      </div>

      {/* Share Modal */}
      <dialog id="share_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg mb-4">Share Whiteboard</h3>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">
                Share URL (includes encryption key):
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="input input-bordered flex-1 text-sm"
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
