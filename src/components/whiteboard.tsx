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

// Simple E2E encryption utilities using Web Crypto API
class E2EEncryption {
  private static async deriveKey(
    password: string,
    salt: Uint8Array,
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  static async encrypt(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(password, salt);

    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(data),
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encrypted.byteLength,
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  static async decrypt(
    encryptedData: string,
    password: string,
  ): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), (c) =>
      c.charCodeAt(0),
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);

    const key = await this.deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
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
  const [shareUrl, setShareUrl] = React.useState("");
  const [ExcalidrawComponents, setExcalidrawComponents] =
    React.useState<any>(null);
  const [encryptionKey, setEncryptionKey] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const LOCAL_STORAGE_KEY = `whiteboard-${uuid}`;
  const ENCRYPTION_KEY_STORAGE = `whiteboard-key-${uuid}`;

  // Load Excalidraw components dynamically
  React.useEffect(() => {
    import("@excalidraw/excalidraw").then((module) => {
      setExcalidrawComponents(module);
    });
  }, []);

  // Load encryption key from localStorage or generate new one
  React.useEffect(() => {
    const savedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
    if (savedKey) {
      setEncryptionKey(savedKey);
    } else {
      // Generate a new encryption key (random 32 character string)
      const newKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setEncryptionKey(newKey);
      localStorage.setItem(ENCRYPTION_KEY_STORAGE, newKey);
    }
  }, [uuid]);

  // Load saved whiteboard from server on mount
  React.useEffect(() => {
    if (!encryptionKey) return;

    const loadWhiteboard = async () => {
      try {
        const response = await fetch(`/api/whiteboard/${uuid}`);
        if (response.ok) {
          const { encryptedData } = await response.json();
          const decrypted = await E2EEncryption.decrypt(
            encryptedData,
            encryptionKey,
          );
          const elements = JSON.parse(decrypted);

          if (apiRef.current && elements.length > 0) {
            apiRef.current.updateScene({
              elements,
              commitToHistory: false,
            });
          }

          // Also populate Yjs
          if (yElementsRef.current) {
            elements.forEach((el: any) => {
              const map = new Y.Map();
              Object.entries(el).forEach(([k, v]) => map.set(k, v));
              yElementsRef.current!.push([map]);
            });
          }

          console.log("✅ Loaded encrypted whiteboard from server");
        }
      } catch (err) {
        console.warn("Failed to load whiteboard:", err);
      }
    };

    loadWhiteboard();
  }, [uuid, encryptionKey]);

  // Initialize Yjs + WebRTC
  React.useEffect(() => {
    if (ydocRef.current) return;

    const ydoc = new Y.Doc();
    const yElements = ydoc.getArray<Y.Map<any>>("elements");
    const yAssets = ydoc.getMap("assets");

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

    return () => {
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [apiRef.current, uuid]);

  const saveWhiteboard = async () => {
    if (!yElementsRef.current || !encryptionKey) return;

    setIsSaving(true);
    try {
      const elements = yjsToExcalidraw(yElementsRef.current);
      const data = JSON.stringify(elements);

      // Encrypt the data
      const encrypted = await E2EEncryption.encrypt(data, encryptionKey);

      // Save to server
      const response = await fetch(`/api/whiteboard/${uuid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encryptedData: encrypted }),
      });

      if (response.ok) {
        console.log("✅ Whiteboard saved (encrypted)");
        alert("✅ Whiteboard saved!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      console.error("Failed to save whiteboard:", err);
      alert("❌ Failed to save whiteboard");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    const baseUrl = `${window.location.origin}/whiteboard/${uuid}`;
    setShareUrl(baseUrl);
    document.getElementById("share_modal")?.showModal();
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    alert("📋 URL copied to clipboard!");
  };

  const copyEncryptionKey = () => {
    navigator.clipboard.writeText(encryptionKey);
    alert("🔑 Encryption key copied! Share this with collaborators.");
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
              <button
                onClick={saveWhiteboard}
                disabled={isSaving}
                style={{
                  padding: "4px 12px",
                  borderRadius: "4px",
                  background: isSaving ? "#ccc" : "#4CAF50",
                  color: "white",
                  border: "none",
                  cursor: isSaving ? "not-allowed" : "pointer",
                  fontSize: "14px",
                }}
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </button>
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
      <dialog id="share_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>

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
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">
                🔑 Encryption Key (share separately):
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={encryptionKey}
                readOnly
                className="input input-bordered flex-1 text-sm font-mono"
              />
              <button
                onClick={copyEncryptionKey}
                className="btn btn-secondary btn-outline"
              >
                Copy Key
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt text-warning">
                ⚠️ Keep this key secret! It's needed to decrypt the whiteboard.
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
