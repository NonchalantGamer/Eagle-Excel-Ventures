export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  role: 'customer' | 'admin' | 'all';
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // Executive & Admin Avatars
  {
    id: 'admin-1',
    name: 'Executive Director (Formal)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    role: 'all'
  },
  {
    id: 'admin-2',
    name: 'Operations Officer',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    role: 'all'
  },
  {
    id: 'admin-3',
    name: 'Logistics Supervisor',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    role: 'all'
  },
  {
    id: 'admin-4',
    name: 'Global Trade Specialist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    role: 'all'
  },
  // Wholesale Customer & Buyer Avatars
  {
    id: 'buyer-1',
    name: 'Procurement Specialist',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    role: 'customer'
  },
  {
    id: 'buyer-2',
    name: 'Retail Category Buyer',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop&q=80',
    role: 'customer'
  },
  {
    id: 'buyer-3',
    name: 'Industrial Contractor',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
    role: 'customer'
  },
  {
    id: 'buyer-4',
    name: 'Commercial Purchasing Lead',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    role: 'customer'
  },
  {
    id: 'buyer-5',
    name: 'Supply Chain Partner',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    role: 'customer'
  },
  {
    id: 'buyer-6',
    name: 'Hardware Wholesaler',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    role: 'customer'
  }
];
