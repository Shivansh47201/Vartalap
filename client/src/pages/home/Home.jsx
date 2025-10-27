import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import MessageContainer from "./MessageContainer";
import UserSidebar from "./UserSidebar";
import StatusPanel from "./StatusPanel";
import CallHistoryPanel from "./CallHistoryPanel";
import { resolveAvatarUrl } from "../../utils/avatar";
import { clearTranslationCache } from "../../utils/translate";
import { logoutUserThunk, updateUserThunk } from "../../store/slice/user/user.thunk";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const MOBILE_BREAKPOINT = 1024; // px (matches Tailwind's lg)

export const SUPPORTED_LANGUAGES = [
  { value: "en", label: "English (U.S.)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-IN", label: "English (India)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "ta", label: "தமிழ் (Tamil)" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { value: "bn", label: "বাংলা (Bengali)" },
  { value: "gu", label: "ગુજરાતી (Gujarati)" },
  { value: "ml", label: "മലയാളം (Malayalam)" },
  { value: "mr", label: "मराठी (Marathi)" },
  { value: "zh-CN", label: "中文 (Chinese)" },
  { value: "ja", label: "日本語 (Japanese)" },
  { value: "ru", label: "Русский (Russian)" },
  { value: "de", label: "Deutsch (German)" },
];

const Home = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selectedConversationId } = useSelector((state) => state.conversation);
  const { userProfile } = useSelector((state) => state.user);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState("chats");
  const [isProfileEditorOpen, setProfileEditorOpen] = useState(false);
  const [isLanguageModalOpen, setLanguageModalOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("vartalap-language") || "en";
    }
    return "en";
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const evaluateViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < MOBILE_BREAKPOINT);
    };

    evaluateViewport();
    window.addEventListener("resize", evaluateViewport);
    return () => window.removeEventListener("resize", evaluateViewport);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowSidebar(true);
      return;
    }

    if (activeTab !== "chats") {
      setShowSidebar(true);
      return;
    }

    if (!selectedConversationId) {
      setShowSidebar(true);
    }
  }, [isMobile, activeTab, selectedConversationId]);

  const handleConversationSelected = () => {
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBackToList = () => {
    if (isMobile) {
      setShowSidebar(true);
    }
  };

  const tabs = [
    { key: "chats", label: "Chats" },
    { key: "status", label: "Status" },
    { key: "calls", label: "Calls" },
  ];

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileMenuOpen]);

  useEffect(() => {
    const profileLanguage = userProfile?.language;
    if (profileLanguage && profileLanguage !== selectedLanguage) {
      setSelectedLanguage(profileLanguage);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("vartalap-language", profileLanguage);
      }
      clearTranslationCache();
    }
  }, [userProfile?.language]);

  const handleLogout = async () => {
    const result = await dispatch(logoutUserThunk());
    if (logoutUserThunk.fulfilled.match(result)) {
      toast.success("Logout successful");
      navigate("/login");
    } else {
      toast.error(result.payload || "Unable to logout. Please try again.");
    }
  };

  const handleLanguageSave = () => {
    const languageValue = selectedLanguage || "en";
    if (typeof window !== "undefined") {
      window.localStorage.setItem("vartalap-language", languageValue);
    }

    if (userProfile?._id) {
      dispatch(updateUserThunk({ language: languageValue }))
        .unwrap()
        .then(() => {
          clearTranslationCache();
          toast.success("Language preference saved");
          setLanguageModalOpen(false);
        })
        .catch((error) => {
          toast.error(error || "Unable to update language");
        });
    } else {
      clearTranslationCache();
      toast.success("Language preference saved");
      setLanguageModalOpen(false);
    }
  };

  const avatarUrl = resolveAvatarUrl(
    userProfile,
    userProfile?.username || userProfile?.name,
    { preferDefaultFallback: true }
  );

  const renderContent = () => {
    if (activeTab === "status") {
      return (
        <div className="flex flex-1 overflow-hidden">
          <StatusPanel />
        </div>
      );
    }
    if (activeTab === "calls") {
      return (
        <div className="flex flex-1 overflow-hidden">
          <CallHistoryPanel />
        </div>
      );
    }

    return (
      <div className="relative flex h-full flex-1 flex-col overflow-hidden lg:flex-row">
        <UserSidebar
          isMobile={isMobile}
          isVisible={showSidebar}
          onConversationSelected={handleConversationSelected}
          isProfileEditorOpen={isProfileEditorOpen}
          onOpenProfileEditor={() => setProfileEditorOpen(true)}
          onCloseProfileEditor={() => setProfileEditorOpen(false)}
        />
        <MessageContainer
          isMobile={isMobile}
          isVisible={!showSidebar || !isMobile}
          onBack={handleBackToList}
        />
      </div>
    );
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-[#080b1a] via-[#0f172a] to-[#1c1f3a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(87,84,231,0.12),_transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(52,211,153,0.08),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 h-px bg-white/5 lg:top-0 lg:inset-y-0 lg:left-0 lg:w-px lg:h-full" />

      <header className="relative z-20 border-b border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur lg:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 text-left text-sm text-white shadow-lg shadow-black/20 transition hover:border-primary/40 hover:bg-white/[0.14]"
            >
              <img
                src={avatarUrl}
                alt={userProfile?.name || "My avatar"}
                className="h-10 w-10 rounded-full border border-white/10 object-cover"
              />
              <div>
                <p className="text-sm font-semibold leading-none">
                  {userProfile?.name || "Guest"}
                </p>
                <p className="text-xs text-white/60">
                  {userProfile?.email || "Logged in"}
                </p>
              </div>
            </button>
          </div>

          <nav className="flex items-center gap-3" aria-label="Primary">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== "chats") {
                  setShowSidebar(true);
                }
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-lg shadow-primary/40"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {profileMenuOpen && (
          <div
            ref={profileMenuRef}
            className="absolute left-4 top-full z-30 mt-3 w-56 rounded-2xl border border-white/10 bg-[#0f172a]/95 p-2 shadow-2xl backdrop-blur"
          >
            <button
              type="button"
              onClick={() => {
                setProfileEditorOpen(true);
                setProfileMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/[0.08]"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={() => {
                setLanguageModalOpen(true);
                setProfileMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/[0.08]"
            >
              Language settings
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="relative z-10 flex flex-1 overflow-hidden">{renderContent()}</main>

      {isLanguageModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f172a]/95 p-6 shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">Language settings</h2>
            <p className="mt-1 text-sm text-white/60">
              Choose your preferred language for the interface.
            </p>
            <div className="mt-6 space-y-4">
              <label className="space-y-2 text-sm">
                <span className="text-white/70">Select language</span>
                <select
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  className="select select-bordered w-full bg-[#111b37] text-white border-white/20 focus:outline-none focus:border-primary"
                >
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-ghost text-white"
                  onClick={() => setLanguageModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn bg-primary text-white hover:bg-primary/90"
                  onClick={handleLanguageSave}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
