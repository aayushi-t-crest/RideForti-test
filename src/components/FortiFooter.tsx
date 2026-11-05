import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSupport } from "@/contexts/SupportContext";
import fortiLogo from "@/assets/forti-logo.png";
import { Button } from "@/components/ui/button";

const FortiFooter = () => {
  const { t } = useTranslation();
  const { openSupport } = useSupport();

  return (
    <footer className="border-t border-border">
      <div className="forti-container py-16">
        <div className="grid md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <img src={fortiLogo} alt="Forti" className="h-8" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-medium mb-4">{t("footer.product")}</h4>
            <ul className="space-y-3">
              <li>
                <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.howItWorks")}
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.pricing")}
                </a>
              </li>
              <li>
                <Link to="/drivers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav.drivers")}
                </Link>
              </li>
              <li>
                <Link to="/guards" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("nav.guards")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4">{t("footer.company")}</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Button
                  variant="link"
                  onClick={openSupport}
                  className="h-auto p-0 text-sm font-normal text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("footer.support")}
                </Button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="forti-divider mt-12 mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-4">
            <Link to="/admin/login" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              Admin
            </Link>
            <p className="text-xs text-muted-foreground">
              {t("footer.safetyNote")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FortiFooter;
