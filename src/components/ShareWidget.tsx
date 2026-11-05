import { useState } from "react";
import { Share2, X, Mail, MessageSquare, QrCode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const ShareWidget = () => {
  const [open, setOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const shareUrl = `https://rideforti.com${pathname}`;
  const shareTitle = "Ride Forti";
  const shareBody = `Check out Ride Forti: ${shareUrl}`;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(
    shareUrl
  )}`;

  const handleEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(
      shareTitle
    )}&body=${encodeURIComponent(shareBody)}`;
    setOpen(false);
  };

  const handleText = () => {
    window.location.href = `sms:?&body=${encodeURIComponent(shareBody)}`;
    setOpen(false);
  };

  const handleQr = () => {
    setOpen(false);
    setQrOpen(true);
  };

  return (
    <>
      {/* Floating share button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform duration-200"
        aria-label={open ? "Close share" : "Share"}
      >
        {open ? (
          <X className="h-6 w-6 text-black" />
        ) : (
          <Share2 className="h-6 w-6 text-black" />
        )}
      </button>

      {/* Action popover */}
      {open && (
        <div className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-2 rounded-xl border border-white/15 bg-popover/95 backdrop-blur p-2 shadow-2xl min-w-[180px]">
          <button
            onClick={handleEmail}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-foreground/10 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            onClick={handleText}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-foreground/10 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Text message
          </button>
          <button
            onClick={handleQr}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-foreground/10 transition-colors"
          >
            <QrCode className="h-4 w-4" />
            QR code
          </button>
        </div>
      )}

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="w-[calc(100%-3rem)] max-w-[320px] sm:max-w-xs bg-popover rounded-3xl px-8 py-8 mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to open</DialogTitle>
            <DialogDescription className="sr-only">{shareUrl}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-6 bg-white rounded-2xl">
            <img
              src={qrSrc}
              alt="QR code"
              width={240}
              height={240}
              className="block"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShareWidget;
