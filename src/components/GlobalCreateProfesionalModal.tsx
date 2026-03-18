import { useSearchParams } from "react-router-dom";
import CreateProfesionalModal from "./CreateProfesionalModal";
import { Profesional } from "../types/database";

export default function GlobalCreateProfesionalModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = searchParams.get('newProfesional') === 'true';

  const handleClose = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('newProfesional');
    setSearchParams(newParams);
  };

  const handleSave = (profesionalData: Profesional) => {
    // The modal handles the API call and event emission internally.
    console.log('[DEBUG] Profesional saved globally:', profesionalData.id);
    handleClose();
    // Emit event to refresh lists if needed (though the modal might already do it)
    window.dispatchEvent(new CustomEvent('profesionales-updated'));
  };

  return (
    <CreateProfesionalModal
      isOpen={isOpen}
      onClose={handleClose}
      onSave={handleSave}
    />
  );
}
