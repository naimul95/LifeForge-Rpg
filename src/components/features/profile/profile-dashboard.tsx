"use client";

import Cropper, { type Area } from "react-easy-crop";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Camera, Check, Flame, Medal, RotateCcw, Save, Trophy, UserRound, X, Zap } from "lucide-react";

import { getProfileDashboardData, updateProfile } from "@/actions/profile.actions";
import type { ProfileDashboardData } from "@/types/profile-dashboard";

const MAX_IMAGE_SIZE = 5_000_000;

function getOutputType(fileType: string) {
  if (fileType === "image/png") return "image/png";
  if (fileType === "image/webp") return "image/webp";
  return "image/jpeg";
}

async function createImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected image could not be loaded."));
    image.src = src;
  });
}

async function getCroppedImageBlob(imageSrc: string, pixelCrop: Area, fileType: string, quality = 0.92) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1024 / Math.max(pixelCrop.width, pixelCrop.height));
  canvas.width = Math.max(1, Math.round(pixelCrop.width * scale));
  canvas.height = Math.max(1, Math.round(pixelCrop.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("The browser could not create a crop canvas.");
  }

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const outputType = getOutputType(fileType);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("The cropped image could not be generated."));
      },
      outputType,
      outputType === "image/jpeg" || outputType === "image/webp" ? quality : undefined,
    );
  });
}

export function ProfileDashboard({ initialData }: { initialData: ProfileDashboardData }) {
  const [data, setData] = useState(initialData);
  const [name, setName] = useState(initialData.profile.name);
  const [bio, setBio] = useState(initialData.profile.bio);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropBusy, setCropBusy] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  async function refresh() {
    setData(await getProfileDashboardData());
  }

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await updateProfile({ name, bio });
      await refresh();
      setMessage("Profile saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatarFile(file: File) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const form = new FormData();
      form.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Avatar upload failed.");
      }

      await refresh();
      setMessage("Profile picture updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Avatar upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const resetCropEditor = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropArea(null);
  }, []);

  const closeCropEditor = useCallback(() => {
    setCropOpen(false);
    setCropBusy(false);
    setCropArea(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setImageSrc((current) => {
      if (current && current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });

    setSelectedFile(null);
    setPreviewUrl((current) => {
      if (current && current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      if (previewUrlRef.current && previewUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!cropOpen || !imageSrc || !cropArea || !selectedFile) return;

    const safeImageSrc = imageSrc;
    const safeCropArea = cropArea;
    const safeSelectedFile = selectedFile;
    const fileType = safeSelectedFile.type || "image/jpeg";

    let active = true;

    async function updatePreview() {
      try {
        const blob = await getCroppedImageBlob(safeImageSrc, safeCropArea, fileType, 0.92);
        const nextPreviewUrl = URL.createObjectURL(blob);

        if (!active) {
          URL.revokeObjectURL(nextPreviewUrl);
          return;
        }

        setPreviewUrl((current) => {
          if (current && current.startsWith("blob:")) {
            URL.revokeObjectURL(current);
          }
          return nextPreviewUrl;
        });

        previewUrlRef.current = nextPreviewUrl;
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "The crop preview could not be updated.");
        }
      }
    }

    void updatePreview();

    return () => {
      active = false;
    };
  }, [cropArea, cropOpen, imageSrc, selectedFile]);

  async function handleAvatarSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const declaredType = file.type.toLowerCase().split(";")[0].trim();
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
    if (declaredType === "image/svg+xml" || (declaredType && !supportedTypes.includes(declaredType))) {
      setError("Unsupported image format. Please use JPG, PNG, WEBP, GIF, HEIC, or HEIF.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError("Profile images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setBusy(false);
    setError("");
    setMessage("");

    try {
      const objectUrl = URL.createObjectURL(file);
      if (objectUrlRef.current && objectUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = objectUrl;

      setSelectedFile(file);
      setImageSrc(objectUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropArea(null);
      setCropOpen(true);
      setPreviewUrl(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The selected image could not be opened.");
    } finally {
      event.target.value = "";
    }
  }

  async function applyCrop() {
    if (!imageSrc || !cropArea || !selectedFile) {
      setError("Please adjust the crop before applying it.");
      return;
    }

    setCropBusy(true);
    setError("");
    setMessage("");

    try {
      const blob = await getCroppedImageBlob(imageSrc, cropArea, selectedFile.type || "image/jpeg", 0.92);
      const baseName = (selectedFile.name || "profile-picture").replace(/\.[^/.]+$/, "") || "profile-picture";
      const outputFile = new File([blob], `${baseName}.jpg`, {
        type: getOutputType(selectedFile.type || "image/jpeg"),
      });

      closeCropEditor();
      await uploadAvatarFile(outputFile);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The crop could not be applied.");
    } finally {
      setCropBusy(false);
    }
  }

  const progress = Math.min(100, data.profile.xp / Math.max(1, data.profile.nextLevelXp) * 100);

  return (
    <>
      <main className="mx-auto max-w-300 px-5 pb-12 pt-7 sm:px-8 lg:px-10">
        <div className="mb-7">
          <p className="eyebrow text-cyan-300">Identity and progression</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Profile</h1>
          <p className="mt-2 text-sm text-slate-500">Your progress, records, and personal identity in one place.</p>
        </div>

        {error && <div className="state-row mb-4 text-rose-300">{error}</div>}
        {message && <div className="state-row mb-4 text-emerald-300"><Check size={16} />{message}</div>}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <section className="character-card">
            <div className="relative flex-shrink-0">
              <div className="profile-photo">
                {data.profile.avatarUrl ? (
                  <Image
                    src={data.profile.avatarUrl}
                    alt="Profile picture"
                    width={112}
                    height={112}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound size={42} />
                )}
              </div>

              <label className="icon-button absolute -bottom-2 -right-2 bg-slate-900 text-cyan-300" title="Upload profile picture (JPG, PNG, WEBP, GIF, HEIC, or HEIF; max 5 MB)">
                <Camera size={15} />
                <input className="sr-only" type="file" accept="image/*" onChange={handleAvatarSelection} disabled={busy} />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <p className="eyebrow text-cyan-300">Level {data.profile.level}</p>
              <h2 className="mt-2 truncate text-2xl font-medium text-white">{data.profile.name}</h2>
              <p className="mt-1 truncate text-sm text-slate-400">{data.profile.email}</p>
              <p className="mt-2 text-[10px] text-slate-600">JPG, PNG, WEBP, GIF, HEIC, or HEIF. Max 5 MB.</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="xp-chip"><Zap size={12} /> {data.profile.xp.toLocaleString("en-US")} XP</span>
              </div>

              <div className="mt-4 flex justify-between text-xs text-slate-500">
                <span>Next level</span>
                <span>{Math.max(0, data.profile.nextLevelXp - data.profile.xp)} XP remaining</span>
              </div>

              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </section>

          <section className="glass-panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserRound size={17} className="text-cyan-300" />
              <h2 className="text-base font-medium text-white">Identity</h2>
            </div>

            <div className="space-y-4">
              <label className="field-label">
                Name
                <input className="vault-input mt-2" value={name} onChange={(event) => setName(event.target.value)} />
              </label>

              <label className="field-label">
                Bio
                <textarea className="vault-input mt-2 min-h-24" value={bio} onChange={(event) => setBio(event.target.value)} />
              </label>

              <button className="primary-button" disabled={busy} onClick={() => void save()}>
                <Save size={15} /> Save profile
              </button>
            </div>
          </section>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Flame} label="Streak" value={`${data.profile.currentStreak} days`} />
          <Metric icon={Zap} label="XP" value={data.profile.xp.toLocaleString("en-US")} />
          <Metric icon={Trophy} label="Study hours" value={data.profile.studyHours.toFixed(1)} />
          <Metric icon={Check} label="Completed topics" value={`${data.profile.completedTopics}`} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <section className="glass-panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <Award size={17} className="text-amber-300" />
              <h2 className="text-base font-medium text-white">Achievements</h2>
            </div>

            <div className="space-y-2">
              {data.achievements.map((item) => (
                <div className={`state-row ${item.unlocked ? "text-amber-200" : "text-slate-600"}`} key={item.name}>
                  <Medal size={15} />
                  <div>
                    <p className="text-sm">{item.name}</p>
                    <p className="text-xs">{item.description}</p>
                  </div>
                  {item.unlocked && <Check size={15} className="ml-auto text-emerald-300" />}
                </div>
              ))}
            </div>
          </section>

          <section className="glass-panel p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy size={17} className="text-amber-300" />
              <h2 className="text-base font-medium text-white">Personal records</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {data.records.map((item) => (
                <div className="metric-tile" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {cropOpen && imageSrc && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="crop-editor-title">
          <div className="modal max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow text-cyan-300">Profile picture</p>
                <h3 id="crop-editor-title" className="mt-1 text-xl font-medium text-white">Crop profile picture</h3>
              </div>

              <button type="button" className="icon-button bg-slate-900 text-slate-300" onClick={closeCropEditor} aria-label="Close crop editor">
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative h-[360px] overflow-hidden rounded-xl border border-white/10 bg-slate-950">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixelCrop) => setCropArea(pixelCrop)}
                  objectFit="contain"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="mx-auto flex size-36 items-center justify-center overflow-hidden rounded-full border border-cyan-400/30 bg-slate-950">
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Avatar crop preview"
                      width={140}
                      height={140}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound size={32} className="text-cyan-200" />
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    <span>Zoom</span>
                    <span>{zoom.toFixed(2)}x</span>
                  </div>

                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                </div>

                <div className="grid gap-2">
                  <button type="button" className="primary-button justify-center" onClick={resetCropEditor} disabled={cropBusy}>
                    <RotateCcw size={14} /> Reset crop
                  </button>

                  <button type="button" className="border border-white/10 bg-slate-900/80 px-3 py-2 text-sm font-medium text-slate-200 rounded-lg" onClick={closeCropEditor} disabled={cropBusy}>
                    Cancel
                  </button>

                  <button type="button" className="primary-button justify-center" onClick={() => void applyCrop()} disabled={cropBusy || !cropArea}>
                    <Check size={14} /> Apply crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="stat-card border-cyan-400/20 bg-cyan-400/4">
      <div className="flex justify-between">
        <span className="eyebrow">{label}</span>
        <Icon size={17} className="text-cyan-300" />
      </div>
      <strong className="mt-4 block text-2xl font-medium text-white">{value}</strong>
    </div>
  );
}
