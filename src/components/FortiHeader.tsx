import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Globe, Menu, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import fortiLogo from "@/assets/forti-logo.png";
import { useSupport } from "@/contexts/SupportContext";
import WaitlistModal from "@/components/WaitlistModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const languages = [
  { code: "EN", label: "English" },
  { code: "ES", label: "Español" },
  { code: "FR", label: "Français" },
  { code: "DE", label: "Deutsch" },
  { code: "PT", label: "Português" },
  { code: "AR", label: "العربية" },
];

const FortiHeader = () => {
  const { openSupport } = useSupport();
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    return localStorage.getItem("forti-language") || "EN";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    i18n.changeLanguage(selectedLanguage);
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    localStorage.setItem("forti-language", langCode);
    i18n.changeLanguage(langCode);
  };

  const navLinks = [
    { href: "/", label: t("nav.rider"), isAnchor: false },
    { href: "/drivers", label: t("nav.drivers"), isAnchor: false },
    { href: "/guards", label: t("nav.guards"), isAnchor: false },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="forti-container">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile: Menu button (left) */}
          <div className="flex md:hidden items-center">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button 
                  className="p-2 text-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-[280px] bg-background border-r border-border p-0"
              >
                <div className="flex flex-col h-full">
                  {/* Mobile Menu Header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <span className="text-lg font-semibold">Menu</span>
                  </div>

                  {/* Mobile Navigation Links */}
                  <nav className="flex flex-col p-4 gap-1">
                    {navLinks.map((link) => (
                      <SheetClose asChild key={link.href}>
                        {link.isAnchor ? (
                          <a 
                            href={link.href}
                            className="py-3 px-4 text-foreground hover:bg-accent rounded-lg transition-colors"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link 
                            to={link.href}
                            className="py-3 px-4 text-foreground hover:bg-accent rounded-lg transition-colors"
                          >
                            {link.label}
                          </Link>
                        )}
                      </SheetClose>
                    ))}
                  </nav>

                  {/* Divider */}
                  <div className="mx-4 border-t border-border" />

                  {/* Mobile Options */}
                  <div className="flex flex-col p-4 gap-1">
                    {/* Language Selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center justify-between py-3 px-4 text-foreground hover:bg-accent rounded-lg transition-colors w-full">
                          <span className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Language
                          </span>
                          <span className="text-muted-foreground">{selectedLanguage}</span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end"
                        className="z-[100] bg-card border border-border shadow-lg min-w-[140px]"
                      >
                        {languages.map((lang) => (
                          <DropdownMenuItem
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            className={`cursor-pointer ${selectedLanguage === lang.code ? "bg-accent" : ""}`}
                          >
                            {lang.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Help */}
                    <SheetClose asChild>
                      <button 
                        onClick={openSupport}
                        className="flex items-center py-3 px-4 text-foreground hover:bg-accent rounded-lg transition-colors text-left"
                      >
                        {t("nav.help")}
                      </button>
                    </SheetClose>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop: Logo and Navigation (left) */}
          <div className="hidden md:flex items-center gap-10">
            <Link 
              to="/" 
              className="flex items-center"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img src={fortiLogo} alt="Forti" className="h-6 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                link.isAnchor ? (
                  <a 
                    key={link.href}
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link 
                    key={link.href}
                    to={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              ))}
            </nav>
          </div>

          {/* Mobile: Centered Logo */}
          <div className="flex md:hidden items-center justify-center absolute left-1/2 -translate-x-1/2">
            <Link 
              to="/" 
              className="flex items-center"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img src={fortiLogo} alt="Forti" className="h-6 w-auto" />
            </Link>
          </div>

          {/* Desktop CTA (right) */}
          <div className="hidden md:flex items-center gap-6">
            {/* Language Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Globe className="h-4 w-4" />
                  {selectedLanguage}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="z-[100] bg-card border border-border shadow-lg min-w-[140px]"
              >
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`cursor-pointer ${selectedLanguage === lang.code ? "bg-accent" : ""}`}
                  >
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button 
              onClick={openSupport}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.help")}
            </button>
            <Button variant="forti" size="sm" onClick={() => setWaitlistOpen(true)}>
              {t("nav.joinWaitlist")}
            </Button>
          </div>

          {/* Mobile: Right side (Join Waitlist only) */}
          <div className="flex md:hidden items-center">
            <Button variant="forti" size="sm" className="text-xs px-3 h-8" onClick={() => setWaitlistOpen(true)}>
              {t("nav.joinWaitlist")}
            </Button>
          </div>
        </div>
      </div>

      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </header>
  );
};

export default FortiHeader;
