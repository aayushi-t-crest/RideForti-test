import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContentCategories from "@/components/admin/content/ContentCategories";
import ContentTools from "@/components/admin/content/ContentTools";
import ContentTraining from "@/components/admin/content/ContentTraining";
import ContentWorkflow from "@/components/admin/content/ContentWorkflow";
import ContentStrategy from "@/components/admin/content/ContentStrategy";
import ContentImages from "@/components/admin/content/ContentImages";

const AdminContent = () => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="categories">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="training">Training Videos</TabsTrigger>
          <TabsTrigger value="images">Site Images</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <ContentCategories />
        </TabsContent>
        <TabsContent value="strategy">
          <ContentStrategy />
        </TabsContent>
        <TabsContent value="workflow">
          <ContentWorkflow />
        </TabsContent>
        <TabsContent value="tools">
          <ContentTools />
        </TabsContent>
        <TabsContent value="training">
          <ContentTraining />
        </TabsContent>
        <TabsContent value="images">
          <ContentImages />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContent;
