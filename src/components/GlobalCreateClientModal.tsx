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
    const storedClients = localStorage.getItem("clients");
    let clients = storedClients ? JSON.parse(storedClients) : [];
    
    // Check if we are editing or creating (Global is usually only for creating)
    // For now, this global modal only handles creation from dashboard/clients buttons
    const newClients = [clientData, ...clients];
    localStorage.setItem("clients", JSON.stringify(newClients));
    
    // Notify other components that clients have been updated
    window.dispatchEvent(new Event('clients-updated'));
    
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
