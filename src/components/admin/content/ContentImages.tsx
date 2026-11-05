const ContentImages = () => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage site images across all sections. Images are locked in position — use the admin API to update URLs.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-1">Gallery Images</h3>
          <p className="text-sm text-muted-foreground">Manage carousel and gallery images.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-1">Vehicle Images</h3>
          <p className="text-sm text-muted-foreground">Manage vehicle tier images.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-1">Trust Badges</h3>
          <p className="text-sm text-muted-foreground">Manage partner logos.</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-1">Section Images</h3>
          <p className="text-sm text-muted-foreground">How It Works, Security, Use Cases.</p>
        </div>
      </div>
    </div>
  );
};

export default ContentImages;
