export interface UserProfile {
  name: string;
  email: string;
  role: string;
  location: string;
  description: string;
  avatarUrl: string;
}

export const MOCK_USERS: Record<'profesional' | 'cliente' | 'superadmin', UserProfile> = {
  profesional: {
    name: "Mateo Vargas",
    email: "mateo.vargas@tradeagro.com",
    role: "Ingeniero Agrónomo",
    location: "Córdoba, Argentina",
    description: "Especialista en cultivos de secano y gestión de suelos. 10 años de experiencia en asesoramiento técnico.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
  },
  cliente: {
    name: "Estancia La Victoria",
    email: "contacto@lavictoria.com",
    role: "Productor Agropecuario",
    location: "Sante Fe, Argentina",
    description: "Empresa familiar dedicada a la producción de cereales y oleaginosas con enfoque sustentable.",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
  },
  superadmin: {
    name: "Admin TradeAgro",
    email: "admin@tradeagro.com",
    role: "Administrador del Sistema",
    location: "Buenos Aires, Argentina",
    description: "Responsable de la supervisión global de la plataforma, gestión de usuarios y configuraciones críticas.",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
  }
};
