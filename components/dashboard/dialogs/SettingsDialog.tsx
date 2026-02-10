"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  User,
  Sparkles,
  Shield,
  Bell,
  LogOut,
  Save,
  Loader2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAJORS = [
  { id: "cs", label: "Computer Science" },
  { id: "engineering", label: "Engineering" },
  { id: "medicine", label: "Medicine / Health" },
  { id: "biology", label: "Biology" },
  { id: "law", label: "Law" },
  { id: "history", label: "History" },
  { id: "business", label: "Business" },
  { id: "other", label: "Other" },
] as const;

const THEMES = [
  { id: "indigo", label: "Midnight Indigo", color: "bg-indigo-500" },
  { id: "rose", label: "Rose Red", color: "bg-rose-500" },
  { id: "blue", label: "Ocean Blue", color: "bg-blue-500" },
  { id: "purple", label: "Royal Purple", color: "bg-purple-500" },
  { id: "amber", label: "Sunset Amber", color: "bg-amber-500" },
  { id: "emerald", label: "Forest Emerald", color: "bg-emerald-500" },
] as const;

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const userData = useQuery(api.users.getUser);
  const updatePreferences = useMutation(api.users.updatePreferences);

  const [activeTab, setActiveTab] = useState("profile");
  const [major, setMajor] = useState(userData?.major ?? "other");
  const [noteStyle, setNoteStyle] = useState(userData?.noteStyle ?? "cornell");
  const [theme, setTheme] = useState(userData?.theme ?? "indigo");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open || !userData) return;
    setMajor(userData.major ?? "other");
    setNoteStyle(userData.noteStyle ?? "cornell");
    setTheme(userData.theme ?? "indigo");
    if (user?.fullName) setFullName(user.fullName);
    setDirty(false);
  }, [open, userData, user]);

  // Track changes
  useEffect(() => {
    if (!userData) return;
    const isMajorDirty = (userData.major ?? "other") !== major;
    const isNoteStyleDirty = (userData.noteStyle ?? "cornell") !== noteStyle;
    const isThemeDirty = (userData.theme ?? "indigo") !== theme;
    const isNameDirty = (user?.fullName ?? "") !== fullName;
    setDirty(isMajorDirty || isNameDirty || isNoteStyleDirty || isThemeDirty);
  }, [major, fullName, noteStyle, theme, userData, user]);

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      // 1. Update generic preferences in Convex
      await updatePreferences({
        major: major || undefined,
        noteStyle: noteStyle || undefined,
        theme: theme || undefined,
      });

      // 2. Update Clerk user data if name changed
      if (user && fullName !== user.fullName) {
        await user.update({
          firstName: fullName.split(" ")[0],
          lastName: fullName.split(" ").slice(1).join(" "),
        });
      }

      toast.success("Changes saved successfully");
      setDirty(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarLoading(true);
    try {
      await user.setProfileImage({ file });
      toast.success("Profile picture updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update profile picture");
    } finally {
      setAvatarLoading(false);
    }
  };

  const menuItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[1050px] w-[95vw] h-[85vh] p-0 flex gap-0 bg-[#060606] border-white/10 text-white overflow-hidden shadow-2xl rounded-2xl data-[state=open]:slide-in-from-bottom-2 sm:rounded-2xl"
        showCloseButton={false}
      >
        {/* Accessibility: Hidden title and description for screen readers */}
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage your profile, security, and notification settings.
        </DialogDescription>

        {/* Close Button Custom */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 z-50 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
          >
            <path
              d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        </button>
        {/* Sidebar */}
        <div className="w-64 flex flex-col border-r border-white/10 bg-[#060606] p-6 shrink-0">
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="font-bold text-white text-sm">L</span>
            </div>
            <span className="font-bold text-lg tracking-tight">Lumina</span>
          </div>

          <nav className="flex-1 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  activeTab === item.id
                    ? "bg-blue-600/10 text-blue-500"
                    : "text-gray-400 hover:text-white hover:bg-white/5",
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4",
                    activeTab === item.id ? "text-blue-500" : "text-gray-500",
                  )}
                />
                {item.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => {
              onOpenChange(false);
              signOut();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all mt-auto"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
          {/* Header */}
          <div className="flex items-center justify-between p-8 border-b border-white/5">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 capitalize">
                {activeTab} & Settings
              </h2>
              <p className="text-gray-400 text-sm">
                Manage your {activeTab} settings and preferences.
              </p>
            </div>
            {activeTab === "profile" && (
              <Button
                onClick={handleSave}
                disabled={!dirty || saving}
                className={cn(
                  "bg-blue-600 hover:bg-blue-500 text-white min-w-[140px] transition-all",
                  !dirty && "opacity-50 cursor-not-allowed",
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Content Scroll Area */}
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-8 max-w-4xl">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <>
                  <div className="p-6 rounded-2xl bg-[#0F0F11] border border-white/5 flex items-center gap-6">
                    <div className="relative group cursor-pointer">
                      <img
                        src={user?.imageUrl || "https://github.com/shadcn.png"}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover border-4 border-[#0F0F11] shadow-xl"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {avatarLoading ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={avatarLoading}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Profile Picture
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        JPG, GIF or PNG. Recommended size 400x400px.
                      </p>
                      <label htmlFor="avatar-upload">
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-white/10 bg-white/5 hover:bg-white/10 hover:text-white h-10 px-4 py-2 text-gray-300 cursor-pointer">
                          {avatarLoading ? "Uploading..." : "Change Avatar"}
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-[#0F0F11] border border-white/5 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold text-white">
                        Personal Information
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                          Full Name
                        </Label>
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="bg-black/20 border-white/10 text-white focus:border-blue-500/50 h-11"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                          University Email
                        </Label>
                        <Input
                          value={user?.primaryEmailAddress?.emailAddress || ""}
                          readOnly
                          className="bg-black/20 border-white/10 text-gray-400 h-11 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preferences Section */}
                  <div className="p-6 rounded-2xl bg-[#0F0F11] border border-white/5 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-semibold text-white">
                        Study Preferences
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                          Major / Course of Study
                        </Label>
                        <Select value={major} onValueChange={setMajor}>
                          <SelectTrigger className="w-full bg-black/20 border-white/10 text-white h-11">
                            <SelectValue placeholder="Select your major" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#18181b] border-white/10 text-white">
                            {MAJORS.map((m) => (
                              <SelectItem
                                key={m.id}
                                value={m.id}
                                className="text-gray-300 focus:bg-white/10 focus:text-white"
                              >
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                          Default Note Style
                        </Label>
                        <Select value={noteStyle} onValueChange={setNoteStyle}>
                          <SelectTrigger className="w-full bg-black/20 border-white/10 text-white h-11">
                            <SelectValue placeholder="Select preferred style" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#18181b] border-white/10 text-white">
                            <SelectItem
                              value="cornell"
                              className="text-gray-300 focus:bg-white/10 focus:text-white"
                            >
                              Cornell Method
                            </SelectItem>
                            <SelectItem
                              value="outline"
                              className="text-gray-300 focus:bg-white/10 focus:text-white"
                            >
                              Outline Method
                            </SelectItem>
                            <SelectItem
                              value="mindmap"
                              className="text-gray-300 focus:bg-white/10 focus:text-white"
                            >
                              Mind Map
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-gray-400 text-xs uppercase font-bold tracking-wider">
                        App Theme
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={cn(
                              "h-10 px-4 rounded-lg border flex items-center gap-2 transition-all duration-200",
                              theme === t.id
                                ? "bg-white/10 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                                : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white",
                            )}
                          >
                            <div
                              className={cn("w-3 h-3 rounded-full", t.color)}
                            />
                            <span className="text-sm font-medium capitalize">
                              {t.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="p-6 rounded-2xl bg-[#0F0F11] border border-white/5 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-white">
                      Security & Authentication
                    </h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    Manage your password and authentication methods securely via
                    your Clerk profile.
                  </p>
                  <Button
                    onClick={() => openUserProfile?.()}
                    variant="outline"
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    Manage Security Settings
                  </Button>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="p-6 rounded-2xl bg-[#0F0F11] border border-white/5 space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      "Email digest of new notes",
                      "Changes to shared documents",
                      "Product updates and beta features",
                      "Security alerts",
                    ].map((label, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                      >
                        <span className="text-sm text-gray-300">{label}</span>
                        <div className="h-5 w-9 rounded-full bg-blue-600 relative cursor-pointer opacity-80 hover:opacity-100">
                          <div className="absolute right-1 top-1 h-3 w-3 rounded-full bg-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
