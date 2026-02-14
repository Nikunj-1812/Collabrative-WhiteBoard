import React, { useState } from "react";

interface ShareDialogProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDialog = ({ boardId, isOpen, onClose }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/board?board=${boardId}`
    : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `Join my collaborative board! ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Join my Collaborative Board");
    const bodyText = `Hi! I'd like to invite you to collaborate on my board.\n\nJoin here: ${shareUrl}`;
    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    
    // Create a temporary anchor element and click it
    const link = document.createElement('a');
    link.href = mailtoUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-96 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Share Board</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Board ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={boardId}
                readOnly
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-mono text-gray-700"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(boardId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all active:scale-95"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Share Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm font-mono text-gray-700"
              />
              <button
                onClick={handleCopyLink}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all shadow-md ${
                  copied
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-300 hover:shadow-lg"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-300 hover:shadow-lg hover:from-blue-600 hover:to-blue-700 active:scale-95"
                }`}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              🔗 Share Via
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-blue-50 hover:border-blue-300 transition-all active:scale-95 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl mb-2">🔗</span>
                <span className="text-xs font-semibold text-gray-700">Copy URL</span>
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-green-50 hover:border-green-300 transition-all active:scale-95 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl mb-2">💬</span>
                <span className="text-xs font-semibold text-gray-700">WhatsApp</span>
              </button>
              <button
                onClick={handleShareEmail}
                className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-purple-50 hover:border-purple-300 transition-all active:scale-95 shadow-sm hover:shadow-md"
              >
                <span className="text-2xl mb-2">✉️</span>
                <span className="text-xs font-semibold text-gray-700">Email</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-gray-700">
            <p className="font-bold text-gray-800 mb-2">📤 Share Instructions:</p>
            <ul className="list-inside list-disc space-y-1.5 text-gray-700">
              <li>Copy the link or board ID</li>
              <li>Share it with your team</li>
              <li>They can join the board instantly</li>
              <li>All changes sync in real-time</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-800 shadow-md hover:bg-gray-50 hover:shadow-lg transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};
