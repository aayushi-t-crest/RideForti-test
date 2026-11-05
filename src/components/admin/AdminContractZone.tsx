import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ContractZone from "@/components/admin/ContractZone";

interface Props {
  onBack?: () => void;
}

const AdminContractZone = ({ onBack }: Props) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {onBack && (
        <Button variant="fortiGhost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}
      <ContractZone />
    </div>
  );
};

export default AdminContractZone;
