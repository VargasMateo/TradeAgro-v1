import { useSearchParams } from "react-router-dom";
import CreateClientModal from "./CreateClientModal";
import { Client } from "../types/client";

export default function GlobalCreateClientModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get('newClient') === 'true';

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('newClient');
    setSearchParams(newParams);
  };

  const handleSave = (clientData: Client) => {
    // The modal now handles the API call and event emission internally.
    // This prop can be used for additional side effects or logging if needed.
    console.log('[DEBUG] Client saved globally:', clientData.id);
    handleClose();
  };

  return (
    <CreateClientModal
      isOpen={isOpen}
      onClose={handleClose}
      onSave={handleSave}
    />
  );
}
