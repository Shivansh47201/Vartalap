import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FiDownload, FiExternalLink, FiArrowLeft } from "react-icons/fi";
import { normalizeMediaUrl } from "../utils/avatar";
import { normalizeFilename } from "../utils/filename";

const guessExtension = (name = "", fallbackType = "") => {
  const nameMatch = /\.([a-z0-9]+)(?:$|[?#])/i.exec(name);
  if (nameMatch) return nameMatch[1].toLowerCase();
  const typeMatch = /([a-z0-9]+)$/i.exec(fallbackType || "");
  return typeMatch ? typeMatch[1].toLowerCase() : "";
};

const formatSize = (value) => {
  const size = Number(value);
  if (!size || Number.isNaN(size)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = size;
  let idx = 0;
  while (current >= 1024 && idx < units.length - 1) {
    current /= 1024;
    idx += 1;
  }
  const display = current >= 10 || idx === 0 ? current.toFixed(0) : current.toFixed(1);
  return `${display} ${units[idx]}`;
};

const FileViewer = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const viewerRef = useRef(null);
  const [docState, setDocState] = useState({ loading: false, error: null });

  const fileMeta = useMemo(() => {
    const rawUrl = params.get("url") || "";
    const normalizedUrl = normalizeMediaUrl(rawUrl);
    const rawName = params.get("name") || "";
    const size = params.get("size") || "";
    const mime = params.get("mime") || "";
    const extension = guessExtension(rawName, mime);
    const label = normalizeFilename(rawName) || "Attachment";
    const readableSize = formatSize(size);
    const isPdf = extension === "pdf" || mime.toLowerCase().includes("pdf");
    const isDocx = extension === "docx";
    const viewerUrl = isPdf
      ? `${normalizedUrl}#toolbar=0&navpanes=0`
      : "";

    return {
      normalizedUrl,
      viewerUrl,
      label,
      readableSize,
      mime,
      extension,
      isPdf,
      isDocx,
    };
  }, [params]);

  useEffect(() => {
    let isCancelled = false;
    const loadDocxPreview = async () => {
      if (!fileMeta.normalizedUrl || !fileMeta.isDocx || !viewerRef.current) return;
      try {
        setDocState({ loading: true, error: null });
        const response = await fetch(fileMeta.normalizedUrl, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Unable to load file (status ${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const { renderAsync } = await import("docx-preview");
        if (isCancelled) return;
        viewerRef.current.innerHTML = "";
        await renderAsync(arrayBuffer, viewerRef.current, undefined, {
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          className: "docx-preview-content",
        });
        if (!isCancelled) {
          setDocState({ loading: false, error: null });
        }
      } catch (error) {
        if (!isCancelled) {
          setDocState({
            loading: false,
            error:
              error?.message ||
              "Unable to generate a preview for this document. Please download the file instead.",
          });
        }
      }
    };

    setDocState({ loading: false, error: null });
    if (fileMeta.isDocx) {
      loadDocxPreview();
    }

    return () => {
      isCancelled = true;
    };
  }, [fileMeta.isDocx, fileMeta.normalizedUrl]);

  const handleDownload = () => {
    if (!fileMeta.normalizedUrl) return;
    const link = document.createElement("a");
    link.href = fileMeta.normalizedUrl;
    link.download = fileMeta.label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenOriginal = () => {
    if (!fileMeta.normalizedUrl) return;
    window.open(fileMeta.normalizedUrl, "_blank", "noopener,noreferrer");
  };

  if (!fileMeta.normalizedUrl) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0b1120] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-8 text-center">
          <h1 className="text-2xl font-semibold">Attachment unavailable</h1>
          <p className="mt-2 text-sm text-white/60">
            We couldn&apos;t find the file you&apos;re looking for. It might have been removed or moved.
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white transition hover:border-primary/40 hover:text-primary"
          >
            <FiArrowLeft /> Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#050b1b] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-2 inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-primary"
          >
            <FiArrowLeft /> Back
          </button>
          <h1 className="text-xl font-semibold leading-snug">{fileMeta.label}</h1>
          <p className="text-xs text-white/60">
            {fileMeta.mime || fileMeta.extension.toUpperCase()} {fileMeta.readableSize ? `• ${fileMeta.readableSize}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={handleOpenOriginal}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 transition hover:border-primary/40 hover:text-primary"
          >
            <FiExternalLink /> Open original
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 transition hover:border-primary/40 hover:text-primary"
          >
            <FiDownload /> Download
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col overflow-hidden">
        {fileMeta.isPdf ? (
          <iframe
            title={`Viewing ${fileMeta.label}`}
            src={fileMeta.viewerUrl}
            className="h-full w-full flex-1 bg-black/20"
            loading="lazy"
          />
        ) : fileMeta.isDocx ? (
          <div className="relative flex flex-1 flex-col overflow-auto bg-black/20">
            {docState.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm text-white/70">
                Loading document preview…
              </div>
            )}
            {docState.error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 px-6 text-center text-sm text-red-200">
                {docState.error}
              </div>
            )}
            <div ref={viewerRef} className="docx-preview flex-1 overflow-auto px-10 py-8" />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-black/20 px-6 text-center text-sm text-white/70">
            Preview not available for this file type. Use the actions above to open or download the original file.
          </div>
        )}
      </main>
    </div>
  );
};

export default FileViewer;
