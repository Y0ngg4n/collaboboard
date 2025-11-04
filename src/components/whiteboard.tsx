"use client";

import * as React from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import "@excalidraw/excalidraw/index.css";
import { ExcalidrawBinding, yjsToExcalidraw } from "y-excalidraw";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

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

  const [isCollaborating, setIsCollaborating] = React.useState(false);
  const [peerCount, setPeerCount] = React.useState(1);
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState("");
  const [ExcalidrawComponents, setExcalidrawComponents] =
    React.useState<any>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const LOCAL_STORAGE_KEY = `whiteboard-${uuid}`;

  // Load Excalidraw components dynamically
  React.useEffect(() => {
    import("@excalidraw/excalidraw").then((module) => {
      setExcalidrawComponents(module);
    });
  }, []);

  // Load from URL data parameter if exists
  React.useEffect(() => {
    const dataParam = searchParams.get("data");
    if (dataParam && apiRef.current) {
      try {
        const decompressed = JSON.parse(decodeURIComponent(atob(dataParam)));
        apiRef.current.updateScene({
          elements: decompressed,
          commitToHistory: false,
        });
        console.log("✅ Loaded data from URL");
      } catch (err) {
        console.warn("Failed to decode URL data", err);
      }
    }
  }, [searchParams]);

  // Initialize Yjs + WebRTC
  React.useEffect(() => {
    if (ydocRef.current) return;

    const ydoc = new Y.Doc();
    const yElements = ydoc.getArray<Y.Map<any>>("elements");
    const yAssets = ydoc.getMap("assets");

    // Load saved elements from localStorage
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.forEach((el: any) => {
          const map = new Y.Map();
          Object.entries(el).forEach(([k, v]) => map.set(k, v));
          yElements.push([map]);
        });
      } catch (err) {
        console.warn("Failed to load saved whiteboard", err);
      }
    }

    const provider = new WebrtcProvider(uuid, ydoc, {
      signaling: ["ws://127.0.0.1:4444"],
      peerOpts: {
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:3478" },
            { urls: "stun:stunserver2024.stunprotocol.org:3478" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:staticauth.openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayprojectsecret",
            },
          ],
        },
      },
    });

    provider.on("status", ({ connected }: { connected: boolean }) => {
      setIsCollaborating(connected);
    });

    provider.awareness.on("update", () => {
      const states = provider.awareness.getStates();
      setPeerCount(states.size);
      console.log("📡 Awareness update:", Array.from(states.entries()));

      if (yElementsRef.current) {
        console.log(
          "🖊️ Excalidraw JSON:",
          yjsToExcalidraw(yElementsRef.current),
        );
      }
    });

    provider.awareness.setLocalStateField("user", {
      name: "Anonymous " + Math.floor(Math.random() * 100),
      color: "#30bced",
      colorLight: "#30bced33",
    });

    ydocRef.current = ydoc;
    providerRef.current = provider;
    yElementsRef.current = yElements;
    yAssetsRef.current = yAssets;

    provider.once("synced", () => {
      console.log("✅ Yjs initial sync done");
      if (apiRef.current && yElementsRef.current) {
        const elements = yjsToExcalidraw(yElementsRef.current);
        if (elements.length > 0) {
          apiRef.current.updateScene({ elements, commitToHistory: false });
        }
      }
    });

    return () => provider.destroy();
  }, [uuid]);

  // Initialize ExcalidrawBinding
  React.useEffect(() => {
    if (!apiRef.current || bindingRef.current) return;
    if (!ydocRef.current || !providerRef.current) return;

    const binding = new ExcalidrawBinding(
      yElementsRef.current!,
      yAssetsRef.current!,
      apiRef.current,
      providerRef.current.awareness,
      {
        excalidrawDom: excalidrawRef.current!,
        undoManager: new Y.UndoManager(yElementsRef.current!),
      },
    );

    bindingRef.current = binding;

    apiRef.current.onChange = () => {
      if (yElementsRef.current) {
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(yjsToExcalidraw(yElementsRef.current)),
        );
      }
    };

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [apiRef.current, uuid]);

  const handleShare = () => {
    if (!yElementsRef.current) return;

    const elements = yjsToExcalidraw(yElementsRef.current);
    const baseUrl = `${window.location.origin}/whiteboard/${uuid}`;

    try {
      const compressed = btoa(encodeURIComponent(JSON.stringify(elements)));
      const urlWithData = `${baseUrl}?data=${compressed}`;

      if (urlWithData.length <= 2000) {
        setShareUrl(urlWithData);
      } else {
        setShareUrl(baseUrl);
      }
    } catch (err) {
      console.error("Failed to generate share URL", err);
      setShareUrl(baseUrl);
    }

    setShowShareModal(true);
  };

  const handleLoadFromUrl = () => {
    const dataParam = searchParams.get("data");
    if (dataParam && apiRef.current) {
      try {
        const decompressed = JSON.parse(decodeURIComponent(atob(dataParam)));
        apiRef.current.updateScene({
          elements: decompressed,
          commitToHistory: true,
        });
        alert("✅ Loaded whiteboard data from URL!");
      } catch (err) {
        alert("❌ Failed to decode URL data");
      }
    } else {
      alert("ℹ️ No data parameter found in URL");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("📋 URL copied to clipboard!");
  };

  if (!ExcalidrawComponents) {
    return <div>Loading...</div>;
  }

  const Menu = ExcalidrawComponents.MainMenu;
  const Welcome = ExcalidrawComponents.WelcomeScreen;

  return (
    <>
      <div style={{ width: "100vw", height: "100vh" }} ref={excalidrawRef}>
        <Excalidraw
          isCollaborating={isCollaborating}
          excalidrawAPI={(api) => (apiRef.current = api)}
          UIOptions={{
            canvasActions: {
              export: false,
              loadScene: false,
              saveToActiveFile: false,
            },
          }}
          renderTopRightUI={() => (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {searchParams.get("data") && (
                <button
                  onClick={handleLoadFromUrl}
                  style={{
                    padding: "4px 12px",
                    borderRadius: "4px",
                    background: "#e3e3e3",
                    color: "#333",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Load URL Data
                </button>
              )}
              <LiveCollaborationTrigger
                isCollaborating={isCollaborating}
                onSelect={handleShare}
              />
              <span style={{ marginLeft: 6, fontWeight: "bold" }}>
                {peerCount}
              </span>
            </div>
          )}
          initialData={{
            elements: yElementsRef.current
              ? yjsToExcalidraw(yElementsRef.current)
              : [],
          }}
        >
          <Menu>
            <Menu.Group title="File & Canvas">
              <Menu.DefaultItems.SaveAsImage />
              <Menu.DefaultItems.SearchMenu />
              <Menu.DefaultItems.ClearCanvas />
            </Menu.Group>

            <Menu.Group title="Appearance">
              <Menu.DefaultItems.ToggleTheme />
              <Menu.DefaultItems.ChangeCanvasBackground />
            </Menu.Group>
          </Menu>

          {(!yElementsRef.current || yElementsRef.current.length === 0) && (
            <Welcome>
              <Welcome.Center>
                <Welcome.Center.Logo>
                  <img
                    src="/logo.png"
                    alt="Logo"
                    style={{ width: "100%", maxWidth: "200px" }}
                  />
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

      {/* DaisyUI Share Modal */}
      {showShareModal && (
        <>
          <input
            type="checkbox"
            id="share-modal"
            className="modal-toggle"
            checked={showShareModal}
            readOnly
          />
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg mb-4">Share Whiteboard</h3>

              <div className="flex justify-center mb-4">
                <QRCodeSVG value={shareUrl} size={192} />
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Share URL:</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="input input-bordered flex-1 text-sm"
                  />
                  <button onClick={copyToClipboard} className="btn btn-primary">
                    Copy
                  </button>
                </div>
                <label className="label">
                  <span className="label-text-alt">
                    {shareUrl.length > 2000
                      ? "⚠️ Data too large - sharing UUID only"
                      : "✅ URL includes whiteboard data"}
                  </span>
                </label>
              </div>

              <div className="modal-action">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
