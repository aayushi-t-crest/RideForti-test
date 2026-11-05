import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import pt from "./locales/pt.json";
import ar from "./locales/ar.json";

const savedLanguage = localStorage.getItem("forti-language") || "EN";

i18n.use(initReactI18next).init({
  resources: {
    EN: { translation: en },
    ES: { translation: es },
    FR: { translation: fr },
    DE: { translation: de },
    PT: { translation: pt },
    AR: { translation: ar },
  },
  lng: savedLanguage,
  fallbackLng: "EN",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
