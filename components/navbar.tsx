"use client";

/** Top navigation with language controls and auth-aware user actions. */
import { useAuth } from "@/lib/auth-context";
import {
  AVAILABLE_LANGUAGES,
  type LanguagePreference,
} from "@/lib/local-preferences";
import { useLanguagePreference } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookOpen, User, LogOut, Settings, Library } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Language toggle group that persists selection in localStorage. */
function LanguageSelector({
  value,
  onChange,
}: {
  /** Currently selected language. */
  value: LanguagePreference;
  /** Callback fired when the language selection changes. */
  onChange: (next: LanguagePreference) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-md border border-border bg-background/60 p-1"
      role="group"
      aria-label="Language selection"
    >
      {AVAILABLE_LANGUAGES.map((language) => (
        <Button
          key={language}
          type="button"
          variant="ghost"
          size="xs"
          aria-pressed={language === value}
          className={cn(
            "px-2 py-1 text-[11px] font-semibold tracking-wide",
            language === value
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(language)}
        >
          {language}
        </Button>
      ))}
    </div>
  );
}

/** Primary site navigation with auth-aware actions. */
export function Navbar() {
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguagePreference();
  const isFullySignedIn = Boolean(user && !user.isAnonymous);

  const handleLanguageChange = (next: LanguagePreference) => {
    setLanguage(next);
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-semibold"
          >
            <BookOpen className="h-6 w-6 text-primary" />
            <span>Varjopinkka</span>
          </Link>

          <div className="flex items-center gap-4">
            <LanguageSelector value={language} onChange={handleLanguageChange} />
            {isFullySignedIn && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.email ?? "Guest user"}</p>
                      <p className="text-xs text-muted-foreground">
                        Role: {user.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {["editor", "admin"].includes(user.role) && (
                    <DropdownMenuItem asChild>
                      <Link href="/manage/content" className="cursor-pointer">
                        <Library className="mr-2 h-4 w-4" />
                        Manage Content
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="outline">
                <Link href="/auth/signin">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
