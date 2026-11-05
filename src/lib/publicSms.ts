type LeadConnectorWindow = Window & {
  leadConnector?: { chatWidget?: { openWidget?: () => void } };
};

export const openPublicSupport = (): boolean => {
  const widget = (window as LeadConnectorWindow).leadConnector?.chatWidget;
  if (!widget?.openWidget) return false;
  widget.openWidget();
  return true;
};

// Public waitlist registration does not collect a phone number or SMS consent.
export const emailWaitlistRegistration = (name: string, email: string) => ({
  name: name.trim(),
  email: email.trim().toLowerCase(),
  phone: null,
  agreed_to_terms: true,
  agreed_to_sms: false,
  agreed_to_marketing: false,
});